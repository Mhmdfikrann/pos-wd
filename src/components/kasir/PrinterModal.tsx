"use client";

import { X, Printer, Bluetooth, Check, RefreshCw, AlertCircle, FileText } from "lucide-react";
import type { PaperSize } from "@/lib/receipt-printer";
import { isWebBluetoothSupported } from "@/lib/receipt-printer";

type PrinterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  btStatus: "disconnected" | "connecting" | "connected";
  btDeviceName: string | null;
  paperSize: PaperSize;
  setPaperSize: (size: PaperSize) => void;
  onConnectBluetooth: () => void;
  onDisconnectBluetooth: () => void;
  onTestPrint: () => void;
  isPrinting?: boolean;
};

export function PrinterModal({
  isOpen,
  onClose,
  btStatus,
  btDeviceName,
  paperSize,
  setPaperSize,
  onConnectBluetooth,
  onDisconnectBluetooth,
  onTestPrint,
  isPrinting = false,
}: PrinterModalProps) {
  if (!isOpen) return null;

  const btSupported = isWebBluetoothSupported();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(45,32,34,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FFF9F2",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#A91F34",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#2D2022" }}>Pengaturan Printer POS</div>
              <div style={{ fontSize: 12, color: "rgba(45,32,34,0.55)" }}>Bluetooth & Ukuran Kertas Struk</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "rgba(45,32,34,0.4)",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Bluetooth Connection Section */}
          <div
            style={{
              border: "1.5px solid rgba(45,32,34,0.1)",
              borderRadius: 12,
              padding: 16,
              background: btStatus === "connected" ? "#F2F9F4" : "#FAF8F6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
                <Bluetooth size={18} color={btStatus === "connected" ? "#2E9D64" : "#A91F34"} />
                Printer Bluetooth
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: btStatus === "connected" ? "#E2F4E9" : btStatus === "connecting" ? "#FEF3D6" : "#F0EBE6",
                  color: btStatus === "connected" ? "#2E9D64" : btStatus === "connecting" ? "#D97706" : "#6B7280",
                }}
              >
                {btStatus === "connected" ? "Terhubung" : btStatus === "connecting" ? "Menghubungkan..." : "Belum Terhubung"}
              </span>
            </div>

            {btStatus === "connected" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: "#2D2022" }}>
                  Perangkat: <strong>{btDeviceName || "Printer Bluetooth"}</strong>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={onTestPrint}
                    disabled={isPrinting}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      border: "1px solid #2E9D64",
                      background: "#fff",
                      color: "#2E9D64",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <FileText size={15} />
                    {isPrinting ? "Mencetak..." : "Tes Cetak Struk"}
                  </button>
                  <button
                    onClick={onDisconnectBluetooth}
                    style={{
                      height: 38,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(45,32,34,0.2)",
                      background: "#fff",
                      color: "#A91F34",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Putuskan
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12.5, color: "rgba(45,32,34,0.6)", lineHeight: 1.4 }}>
                  Hubungkan printer Bluetooth thermal (58mm/80mm) langsung dari browser kasir.
                </div>
                {!btSupported ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "#D97706",
                      background: "#FFFBEB",
                      padding: "8px 12px",
                      borderRadius: 8,
                    }}
                  >
                    <AlertCircle size={16} />
                    Browser ini belum mendukung Web Bluetooth (disarankan Google Chrome). Fitur Cetak Sistem tetap dapat digunakan.
                  </div>
                ) : (
                  <button
                    onClick={onConnectBluetooth}
                    disabled={btStatus === "connecting"}
                    style={{
                      height: 42,
                      borderRadius: 8,
                      border: "none",
                      background: "#A91F34",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 2px 8px rgba(169,31,52,0.25)",
                    }}
                  >
                    {btStatus === "connecting" ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Mencari Printer...
                      </>
                    ) : (
                      <>
                        <Bluetooth size={16} />
                        Cari & Hubungkan Printer
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Paper Size Selection */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#2D2022", marginBottom: 8, display: "block" }}>
              Ukuran Kertas Thermal Struk
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["58mm", "80mm"] as PaperSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setPaperSize(size)}
                  style={{
                    height: 46,
                    borderRadius: 10,
                    border: paperSize === size ? "2px solid #A91F34" : "1.5px solid rgba(45,32,34,0.12)",
                    background: paperSize === size ? "#FFF1F2" : "#fff",
                    color: paperSize === size ? "#A91F34" : "#2D2022",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {paperSize === size && <Check size={16} />}
                  Kertas {size}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(45,32,34,0.5)", marginTop: 6 }}>
              {paperSize === "58mm" ? "Lebar standar printer Bluetooth portable (32 karakter/baris)" : "Lebar printer thermal desktop kasir (48 karakter/baris)"}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid rgba(45,32,34,0.08)",
            display: "flex",
            justifyContent: "flex-end",
            background: "#FFF9F2",
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 20px",
              borderRadius: 8,
              border: "1px solid rgba(45,32,34,0.15)",
              background: "#fff",
              color: "#2D2022",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
