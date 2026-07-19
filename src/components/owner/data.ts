/** Dashboard datasets ported verbatim from the mockup. */

export const CHART: Array<[string, number]> = [
  ["Sen", 3.6],
  ["Sel", 4.1],
  ["Rab", 3.9],
  ["Kam", 4.6],
  ["Jum", 5.2],
  ["Sab", 6.1],
  ["Min", 3.7],
];

export const PAY: Array<[string, number, string]> = [
  ["Tunai", 42, "#A91F34"],
  ["QRIS", 35, "#E99A22"],
  ["Kartu Debit", 15, "#3A5BB0"],
  ["GoFood / Grab", 8, "#2E9D64"],
];

export interface TopProduct {
  name: string;
  sold: number;
  rev: string;
  stock: number;
  tone: "ok" | "low" | "out";
}

export const TOP: TopProduct[] = [
  { name: "Dimsum Ayam", sold: 128, rev: "Rp 2.304.000", stock: 86, tone: "ok" },
  { name: "Hakau Udang", sold: 64, rev: "Rp 1.536.000", stock: 6, tone: "low" },
  { name: "Es Teh Melati", sold: 142, rev: "Rp 994.000", stock: 999, tone: "ok" },
  { name: "Paket Hemat A", sold: 38, rev: "Rp 1.710.000", stock: 20, tone: "ok" },
  { name: "Lumpia Kulit Tahu", sold: 22, rev: "Rp 440.000", stock: 0, tone: "out" },
];

export interface RecentTrx {
  id: string;
  meta: string;
  amt: string;
  time: string;
  ic: "receiptSm" | "bag" | "truck" | "card";
}

export const RECENT: RecentTrx[] = [
  { id: "#TRX-0429", meta: "Dine-in · 3 item · Sinta", amt: "Rp 94.600", time: "2 mnt lalu", ic: "receiptSm" },
  { id: "#TRX-0428", meta: "Takeaway · 5 item · Sinta", amt: "Rp 128.000", time: "11 mnt lalu", ic: "bag" },
  { id: "#TRX-0427", meta: "GoFood · 2 item · Sistem", amt: "Rp 46.000", time: "18 mnt lalu", ic: "truck" },
  { id: "#TRX-0426", meta: "Dine-in · 8 item · Rian", amt: "Rp 212.400", time: "25 mnt lalu", ic: "receiptSm" },
  { id: "#TRX-0425", meta: "QRIS · 4 item · Rian", amt: "Rp 71.000", time: "32 mnt lalu", ic: "card" },
];
