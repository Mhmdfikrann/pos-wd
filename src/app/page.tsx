import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Boxes,
  ArrowRight,
} from "lucide-react";

const roles = [
  {
    href: "/owner",
    label: "Owner",
    role: "Business Suite",
    desc: "Dashboard, laporan, produk, keuangan, dan pengaturan seluruh outlet.",
    Icon: LayoutDashboard,
    bg: "#FFF1F2",
    fg: "#A91F34",
  },
  {
    href: "/kasir",
    label: "Kasir",
    role: "Point of Sale",
    desc: "Katalog menu, keranjang, dan alur pembayaran untuk transaksi harian.",
    Icon: ShoppingCart,
    bg: "#FFF4D6",
    fg: "#A9791F",
  },
  {
    href: "/kitchen",
    label: "Tim Dapur",
    role: "Kitchen Display",
    desc: "Papan pesanan real-time dengan timer dan checklist per station.",
    Icon: ChefHat,
    bg: "#E4F4EC",
    fg: "#238152",
  },
  {
    href: "/inventory",
    label: "Staf Inventori",
    role: "Inventory",
    desc: "Pantau stok, nilai persediaan, restock, dan penyesuaian stok.",
    Icon: Boxes,
    bg: "#EEF2FB",
    fg: "#3A5BB0",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-white border border-black/[0.08] flex items-center justify-center overflow-hidden">
            <Image
              src="/logo-icon.jpg"
              alt="Wanna Dimsum"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight">
              <span style={{ color: "#A91F34" }}>WANNA</span> DIMSUM
            </div>
            <div className="text-xs font-semibold text-ink/50">
              Point of Sale · Pilih peran untuk masuk
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map(({ href, label, role, desc, Icon, bg, fg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white border border-black/[0.06] rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(127,22,40,0.5)]"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: bg, color: fg }}
                >
                  <Icon size={24} strokeWidth={1.9} />
                </div>
                <ArrowRight
                  size={20}
                  className="text-ink/25 transition-transform group-hover:translate-x-1 group-hover:text-ink/50"
                />
              </div>
              <div className="mt-4 text-lg font-extrabold">{label}</div>
              <div
                className="text-xs font-bold uppercase tracking-wide mt-0.5"
                style={{ color: fg }}
              >
                {role}
              </div>
              <p className="text-sm text-ink/55 mt-2 leading-snug">{desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-ink/40 mt-10">
          Prototipe frontend · data contoh · Wanna Dimsum POS
        </p>
      </div>
    </div>
  );
}
