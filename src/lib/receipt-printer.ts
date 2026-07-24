import type { Receipt } from "@/lib/order";
import { formatRupiah } from "@/lib/format";

export type PaperSize = "58mm" | "80mm";

// Common Bluetooth GATT Service UUIDs used by POS Thermal Printers
export const COMMON_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000af00-0000-1000-8000-00805f9b34fb",
  "00001101-0000-1000-8000-00805f9b34fb",
];

export function isWebBluetoothSupported(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Encodes a Receipt into ESC/POS binary commands for thermal receipt printers.
 */
export function buildEscPosCommands(receipt: Receipt, outletName = "Wanna Dimsum", paperSize: PaperSize = "58mm"): Uint8Array {
  const lineChars = paperSize === "80mm" ? 48 : 32;
  const buffer: number[] = [];

  const addBytes = (...bytes: number[]) => buffer.push(...bytes);
  const addString = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      buffer.push(code < 128 ? code : 0x3f); // ASCII or fallback '?'
    }
  };
  const addLine = (text = "") => {
    addString(text);
    addBytes(0x0a); // LF
  };

  const centerText = (text: string): string => {
    if (text.length >= lineChars) return text.slice(0, lineChars);
    const leftPad = Math.floor((lineChars - text.length) / 2);
    return " ".repeat(leftPad) + text;
  };

  const justifyLine = (left: string, right: string): string => {
    const maxLeftLen = lineChars - right.length - 1;
    const trimmedLeft = left.length > maxLeftLen ? left.slice(0, maxLeftLen) : left;
    const spaceCount = Math.max(1, lineChars - trimmedLeft.length - right.length);
    return trimmedLeft + " ".repeat(spaceCount) + right;
  };

  const divider = "-".repeat(lineChars);

  // Initialize printer (ESC @)
  addBytes(0x1b, 0x40);

  // Header: Centered & Bold Double Height
  addBytes(0x1b, 0x61, 0x01); // Center
  addBytes(0x1b, 0x45, 0x01); // Bold ON
  addBytes(0x1d, 0x21, 0x11); // Double size text
  addLine("WANNA DIMSUM");
  addBytes(0x1d, 0x21, 0x00); // Normal size
  addLine(outletName);
  addBytes(0x1b, 0x45, 0x00); // Bold OFF

  addBytes(0x1b, 0x61, 0x00); // Left align
  addLine(divider);

  // Transaction details
  addLine(`No. Order : ${receipt.orderNo}`);
  const dateStr = new Date(receipt.createdAt).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });
  addLine(`Waktu     : ${dateStr}`);

  const orderTypeLabel =
    receipt.orderType === "dinein"
      ? `Dine-In${receipt.tableNo ? ` (Meja ${receipt.tableNo})` : ""}`
      : receipt.orderType === "takeaway"
        ? "Takeaway"
        : `Delivery (${receipt.deliveryProvider ?? "Kurir"})`;
  addLine(`Tipe      : ${orderTypeLabel}`);

  if (receipt.customerName) {
    addLine(`Pelanggan : ${receipt.customerName}`);
  }

  addLine(divider);

  // Items List
  for (const item of receipt.lines) {
    const qtyPrice = `${item.quantity}x ${formatRupiah(item.unitPrice)}`;
    const lineTot = formatRupiah(item.lineTotal);

    addLine(item.name);
    if (item.variant) {
      addLine(`  (${item.variant})`);
    }
    addLine(justifyLine(`  ${qtyPrice}`, lineTot));
  }

  addLine(divider);

  // Summary
  addLine(justifyLine("Subtotal", formatRupiah(receipt.subtotal)));

  if (receipt.discountAmount > 0) {
    const promoLabel = receipt.promoName ? `Diskon (${receipt.promoName})` : "Diskon";
    addLine(justifyLine(promoLabel, `-${formatRupiah(receipt.discountAmount)}`));
  }

  if (receipt.taxAmount > 0) {
    addLine(justifyLine("Pajak (PB1)", formatRupiah(receipt.taxAmount)));
  }

  addLine(divider);

  // Grand Total (Bold)
  addBytes(0x1b, 0x45, 0x01); // Bold ON
  addLine(justifyLine("TOTAL", formatRupiah(receipt.total)));
  addBytes(0x1b, 0x45, 0x00); // Bold OFF

  // Payment Breakdown
  for (const pay of receipt.payments) {
    const methodLabel = pay.channelLabel ?? pay.provider ?? pay.method.toUpperCase();
    const paidAmt = pay.cashReceived ?? pay.amount;
    addLine(justifyLine(`Bayar (${methodLabel})`, formatRupiah(paidAmt)));
    if (pay.changeAmount && pay.changeAmount > 0) {
      addLine(justifyLine("Kembalian", formatRupiah(pay.changeAmount)));
    }
  }

  if (receipt.pointsEarned > 0) {
    addLine(justifyLine("Poin Diterima", `+${receipt.pointsEarned} pts`));
  }

  addLine(divider);

  // Footer: Centered
  addBytes(0x1b, 0x61, 0x01); // Center
  addLine("Terima Kasih atas Kunjungan Anda!");
  addLine("Wanna Dimsum - Enaknya Bikin Nagih");
  addBytes(0x0a);

  // Feed lines & Paper Cut (GS V A 0)
  addBytes(0x1b, 0x64, 0x03); // Feed 3 lines
  addBytes(0x1d, 0x56, 0x41, 0x00); // Partial cut

  return new Uint8Array(buffer);
}

/**
 * Sends ESC/POS binary data to a Web Bluetooth device in chunks.
 */
export async function sendEscPosToBluetoothDevice(
  device: any, // BluetoothDevice
  escPosData: Uint8Array
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!device.gatt) {
      throw new Error("Perangkat Bluetooth tidak mendukung GATT server.");
    }

    const server = device.gatt.connected ? device.gatt : await device.gatt.connect();

    // Find printer service
    let targetService: any = null;
    const services = await server.getPrimaryServices();

    if (services.length > 0) {
      targetService = services[0];
    }

    if (!targetService) {
      throw new Error("Layanan Bluetooth Printer tidak ditemukan pada perangkat ini.");
    }

    const characteristics = await targetService.getCharacteristics();
    const writeChar = characteristics.find(
      (c: any) => c.properties.write || c.properties.writeWithoutResponse
    );

    if (!writeChar) {
      throw new Error("Karakteristik cetak (Write Characteristic) tidak ditemukan.");
    }

    // Chunk size: 128 bytes max to fit Bluetooth LE GATT MTU safely
    const CHUNK_SIZE = 128;
    for (let i = 0; i < escPosData.length; i += CHUNK_SIZE) {
      const chunk = escPosData.subarray(i, i + CHUNK_SIZE);
      if (writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
      // Small delay between chunks
      await new Promise((res) => setTimeout(res, 40));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Gagal mencetak ke Bluetooth printer." };
  }
}

/**
 * Triggers browser thermal print dialog formatted for 58mm / 80mm receipt paper.
 */
export function printReceiptViaBrowser(receipt: Receipt, outletName = "Wanna Dimsum", paperSize: PaperSize = "58mm") {
  const widthMm = paperSize === "80mm" ? "76mm" : "54mm";
  const dateStr = new Date(receipt.createdAt).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const orderTypeLabel =
    receipt.orderType === "dinein"
      ? `Dine-In${receipt.tableNo ? ` (Meja ${receipt.tableNo})` : ""}`
      : receipt.orderType === "takeaway"
        ? "Takeaway"
        : `Delivery (${receipt.deliveryProvider ?? "Kurir"})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Struk ${receipt.orderNo}</title>
        <style>
          @page {
            size: ${paperSize} auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${widthMm};
            margin: 0 auto;
            padding: 8px 6px;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header { font-size: 16px; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .item-title { font-weight: bold; }
          .item-sub { padding-left: 8px; font-size: 11px; color: #333; }
          .total-row { font-size: 14px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="text-center header bold">WANNA DIMSUM</div>
        <div class="text-center bold">${outletName}</div>
        <div class="divider"></div>
        <div class="row"><span>No. Order:</span><span class="bold">${receipt.orderNo}</span></div>
        <div class="row"><span>Waktu:</span><span>${dateStr}</span></div>
        <div class="row"><span>Tipe:</span><span>${orderTypeLabel}</span></div>
        ${receipt.customerName ? `<div class="row"><span>Pelanggan:</span><span>${receipt.customerName}</span></div>` : ""}
        <div class="divider"></div>

        ${receipt.lines
          .map(
            (item) => `
            <div>
              <div class="item-title">${item.name}</div>
              ${item.variant ? `<div class="item-sub">Variant: ${item.variant}</div>` : ""}
              <div class="row">
                <span class="item-sub">${item.quantity}x ${formatRupiah(item.unitPrice)}</span>
                <span class="bold">${formatRupiah(item.lineTotal)}</span>
              </div>
            </div>
          `
          )
          .join("")}

        <div class="divider"></div>
        <div class="row"><span>Subtotal:</span><span>${formatRupiah(receipt.subtotal)}</span></div>
        ${
          receipt.discountAmount > 0
            ? `<div class="row"><span>Diskon (${receipt.promoName ?? "Promo"}):</span><span>-${formatRupiah(
                receipt.discountAmount
              )}</span></div>`
            : ""
        }
        ${receipt.taxAmount > 0 ? `<div class="row"><span>Pajak (PB1):</span><span>${formatRupiah(receipt.taxAmount)}</span></div>` : ""}
        
        <div class="divider"></div>
        <div class="row total-row bold"><span>TOTAL:</span><span>${formatRupiah(receipt.total)}</span></div>

        ${receipt.payments
          .map(
            (pay) => `
            <div class="row">
              <span>Bayar (${pay.channelLabel ?? pay.provider ?? pay.method}):</span>
              <span>${formatRupiah(pay.cashReceived ?? pay.amount)}</span>
            </div>
            ${pay.changeAmount && pay.changeAmount > 0 ? `<div class="row"><span>Kembalian:</span><span>${formatRupiah(pay.changeAmount)}</span></div>` : ""}
          `
          )
          .join("")}

        ${receipt.pointsEarned > 0 ? `<div class="row"><span>Poin Diterima:</span><span>+${receipt.pointsEarned} pts</span></div>` : ""}

        <div class="divider"></div>
        <div class="text-center" style="margin-top: 10px; font-size: 11px;">
          Terima Kasih atas Kunjungan Anda!<br />
          <strong>Wanna Dimsum - Enaknya Bikin Nagih</strong>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  const printWin = window.open("", "_blank", "width=400,height=600");
  if (printWin) {
    printWin.document.write(html);
    printWin.document.close();
  }
}
