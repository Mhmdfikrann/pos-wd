"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatRupiah } from "@/lib/format";

const menuItems = [
  { name: "Hakau Udang", desc: "Kulit kenyal, isi udang utuh", price: 24000, tag: ["Best Seller", "#A91F34"] as const },
  { name: "Dimsum Ayam", desc: "Klasik favorit sejuta umat", price: 18000, tag: ["Favorit", "#238152"] as const },
  { name: "Xiao Long Bao", desc: "Berisi kuah kaldu hangat", price: 28000, tag: ["Signature", "#A9791F"] as const },
  { name: "Lumpia Udang", desc: "Digoreng garing setiap order", price: 20000, tag: ["Crispy", "#3A5BB0"] as const },
];

const promos = [
  { name: "Paket Berdua", desc: "10 pcs + 2 minuman", price: 78000, old: 98000, off: "HEMAT 20%" },
  { name: "Paket Hemat A", desc: "4 varian pilihan", price: 45000, old: 58000, off: "HEMAT 22%" },
];

const values = [
  { icon: "🥟", title: "Fresh Dadakan", desc: "Dikukus saat dipesan, bukan stok kemarin." },
  { icon: "🌿", title: "Bahan Pilihan", desc: "Udang & ayam segar berkualitas." },
  { icon: "✓", title: "Halal & Higienis", desc: "Tersertifikasi MUI dan bersih." },
  { icon: "💛", title: "Harga Ramah", desc: "Enak nggak harus mahal." },
];

const testimonials = [
  { name: "Rina W.", role: "Kemang", text: "Hakau-nya juara! Udangnya berasa banget dan masih anget pas nyampe. Langganan tiap minggu.", stars: 5 },
  { name: "Dimas P.", role: "Senayan", text: "Paket keluarga worth it banget buat kumpul. Anak-anak doyan, harga bersahabat.", stars: 5 },
  { name: "Sarah A.", role: "BSD", text: "Pesan lewat GoFood cepet sampai, packaging rapi, dimsum nggak hancur. Recommended!", stars: 5 },
];

const outlets = [
  { name: "Wanna Dimsum Kemang", addr: "Jl. Kemang Raya No. 12", hours: "10.00 – 22.00" },
  { name: "Wanna Dimsum Senayan", addr: "Senayan City, Lantai 3", hours: "10.00 – 22.00" },
  { name: "Wanna Dimsum BSD", addr: "BSD Green Office Park", hours: "10.00 – 21.00" },
];

const faqs = [
  { q: "Apakah semua dimsum halal?", a: "Ya, seluruh produk Wanna Dimsum tersertifikasi halal MUI dan diproses secara higienis." },
  { q: "Bagaimana cara pesan online?", a: "Kamu bisa memesan melalui GoFood, GrabFood, atau langsung via WhatsApp outlet terdekat. Klik tombol Pesan Online di halaman ini." },
  { q: "Apakah dimsum tetap hangat saat diantar?", a: "Kami mengemas dimsum dengan kemasan khusus penahan panas, dan bekerja sama dengan kurir agar sampai selagi hangat." },
  { q: "Apa itu Wanna Rewards?", a: "Program member gratis: kumpulkan 1 poin tiap belanja Rp 1.000, tukar dengan dimsum gratis dan nikmati promo khusus member." },
  { q: "Apakah menerima pesanan untuk acara/katering?", a: "Tentu! Untuk pesanan dalam jumlah besar atau katering acara, hubungi kami di 0800-1234-5678." },
];

const marqueeItems = ["Hakau Udang", "Xiao Long Bao", "Siomay Ayam", "Lumpia Udang", "Ceker Dimsum", "Mantao Coklat", "Es Teh Melati", "Pangsit Goreng"];

function BrandLogo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: "#fff", border: inverted ? "none" : "1px solid rgba(45,32,34,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
        <Image src="/logo-icon.jpg" alt="Wanna Dimsum" width={38} height={38} style={{ objectFit: "contain" }} priority />
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: inverted ? "#fff" : "#2D2022" }}>
          <span style={{ color: inverted ? "#FFD84D" : "#A91F34" }}>WANNA</span> DIMSUM
        </div>
        <div className="font-mono" style={{ fontSize: 9, letterSpacing: "0.16em", color: inverted ? "rgba(255,255,255,0.45)" : "rgba(45,32,34,0.45)", textTransform: "uppercase", marginTop: 2 }}>
          Snap Into The New Taste
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className="font-mono" style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: light ? "#FFD84D" : "#A91F34", fontWeight: 600 }}>{children}</div>;
}

function ImageSlot({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div className="wd-lca-image-slot" style={{ width: "100%", height: "100%", background: dark ? "linear-gradient(135deg,#4b3235,#2D2022)" : "linear-gradient(135deg,#FFF4D6,#FFD84D 45%,#fff)", color: dark ? "rgba(255,255,255,0.72)" : "rgba(45,32,34,0.58)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20, fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
      <span>{label}</span>
    </div>
  );
}

function MenuCard({ item, index }: { item: (typeof menuItems)[number]; index: number }) {
  return (
    <article className="wd-lca-menucard" style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 20, padding: 16, boxShadow: "0 18px 46px -34px rgba(127,22,40,0.45)", minHeight: 340, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 178, borderRadius: 16, overflow: "hidden", position: "relative" }}>
        <ImageSlot label={item.name} />
        <span style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", height: 28, padding: "0 11px", borderRadius: 999, background: item.tag[1], color: "#fff", fontSize: 11, fontWeight: 800 }}>{item.tag[0]}</span>
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, marginTop: 16, letterSpacing: "-0.02em" }}>{item.name}</h3>
      <p style={{ fontSize: 14, color: "rgba(45,32,34,0.6)", marginTop: 6 }}>{item.desc}</p>
      <div style={{ marginTop: "auto", paddingTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="font-mono" style={{ fontSize: 19, fontWeight: 700, color: "#A91F34" }}>{formatRupiah(item.price)}</span>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: index === 0 ? "#A91F34" : "#FFF1F2", color: index === 0 ? "#fff" : "#A91F34", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>+</span>
      </div>
    </article>
  );
}

function PromoCard({ promo }: { promo: (typeof promos)[number] }) {
  return (
    <article style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 20, padding: 18, minHeight: 280, display: "flex", flexDirection: "column", boxShadow: "0 18px 46px -34px rgba(127,22,40,0.45)" }}>
      <span style={{ alignSelf: "flex-start", background: "#FFF4D6", color: "#A9791F", fontWeight: 800, fontSize: 12, padding: "6px 12px", borderRadius: 999 }}>{promo.off}</span>
      <div style={{ height: 110, borderRadius: 15, overflow: "hidden", marginTop: 18 }}><ImageSlot label={promo.name} /></div>
      <h3 style={{ fontSize: 22, fontWeight: 800, marginTop: 16, letterSpacing: "-0.02em" }}>{promo.name}</h3>
      <p style={{ fontSize: 14.5, color: "rgba(45,32,34,0.6)", marginTop: 7 }}>{promo.desc}</p>
      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: "#A91F34" }}>{formatRupiah(promo.price)}</span>
          <span className="font-mono" style={{ fontSize: 14, color: "rgba(45,32,34,0.4)", textDecoration: "line-through" }}>{formatRupiah(promo.old)}</span>
        </div>
        <a href="#outlet" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 46, marginTop: 16, borderRadius: 11, background: "#2D2022", color: "#fff", fontWeight: 700, fontSize: 14 }}>Pesan Paket</a>
      </div>
    </article>
  );
}

function SectionTitle({ eyebrow, title, center = false }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? "center" : "left" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 10, lineHeight: 1.08 }}>{title}</h2>
    </div>
  );
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main style={{ minHeight: "100vh", background: "#FFF9F2", color: "#2D2022", overflowX: "hidden" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,249,242,0.86)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(45,32,34,0.07)" }}>
        <div className="wd-lca-nav-inner" style={{ maxWidth: 1200, margin: "0 auto", height: 72, display: "flex", alignItems: "center", gap: 28, padding: "0 28px" }}>
          <a href="#top" style={{ flexShrink: 0 }}><BrandLogo /></a>
          <nav className="wd-lca-nav" style={{ display: "flex", alignItems: "center", gap: 26, marginLeft: "auto" }}>
            <a href="#menu">Menu</a><a href="#promo">Promo</a><a href="#tentang">Tentang</a><a href="#outlet">Outlet</a><a href="#member">Member</a>
          </nav>
          <Link className="wd-lca-staff-link" href="/login" style={{ fontWeight: 700, fontSize: 14, color: "rgba(45,32,34,0.66)", whiteSpace: "nowrap" }}>Masuk Staff</Link>
          <button className="wd-lca-menu-button" type="button" aria-label="Menu landing" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: "#fff", boxShadow: "0 4px 12px -6px rgba(45,32,34,0.3)", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#2D2022", fontSize: 22, fontWeight: 800 }}>{menuOpen ? "×" : "☰"}</button>
          <a href="#outlet" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 20px", borderRadius: 11, background: "#A91F34", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0, boxShadow: "0 12px 22px -14px rgba(127,22,40,0.8)" }}>Pesan Sekarang</a>
        </div>
        <MobileDrawer open={menuOpen} onClose={closeMenu} />
      </header>

      <section id="top" className="wd-lca-hero" style={{ position: "relative", maxWidth: 1200, margin: "0 auto", padding: "64px 28px 40px", display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 44, alignItems: "center" }}>
        <div>
          <div className="font-mono" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 11.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A9791F", background: "#FFF4D6", padding: "8px 14px", borderRadius: 999, fontWeight: 600 }}>🥟 Dimsum Fresh Setiap Hari</div>
          <h1 style={{ fontSize: 66, lineHeight: 0.98, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 22 }}>Dimsum hangat,<br /><span style={{ color: "#A91F34" }}>rasa juara</span><br />tiap gigitan.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "rgba(45,32,34,0.62)", marginTop: 22, maxWidth: "46ch" }}>Dikukus dadakan dari bahan pilihan. Nikmati di outlet terdekat atau pesan online, sampai ke rumah masih anget dan lembut.</p>
          <div style={{ display: "flex", gap: 13, marginTop: 32, flexWrap: "wrap" }}>
            <a href="#menu" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, height: 56, padding: "0 28px", borderRadius: 13, background: "#FFD84D", color: "#2D2022", fontWeight: 800, fontSize: 16, boxShadow: "0 16px 30px -14px rgba(233,154,34,0.85)" }}>Pesan Online →</a>
            <a href="#outlet" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, height: 56, padding: "0 26px", borderRadius: 13, background: "#fff", border: "1.5px solid rgba(45,32,34,0.14)", color: "#2D2022", fontWeight: 700, fontSize: 16 }}>Kunjungi Outlet</a>
          </div>
          <div style={{ display: "flex", gap: 30, marginTop: 38 }}>
            {[['28+', 'Varian dimsum'], ['12', 'Outlet & terus bertambah'], ['4.9★', 'Rating pelanggan']].map(([n, l], i) => <div key={n} style={{ display: "contents" }}><div><div className="font-mono" style={{ fontSize: 28, fontWeight: 700, color: "#A91F34" }}>{n}</div><div style={{ fontSize: 13, color: "rgba(45,32,34,0.55)", fontWeight: 600, marginTop: 2 }}>{l}</div></div>{i < 2 ? <div style={{ width: 1, background: "rgba(45,32,34,0.12)" }} /> : null}</div>)}
          </div>
        </div>
        <div style={{ position: "relative", height: 520 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "radial-gradient(circle at 60% 35%, #FFE7A6, #FFD84D 45%, #F5B841)", boxShadow: "0 40px 80px -40px rgba(233,154,34,0.7)" }} />
          <div style={{ position: "absolute", top: 34, left: 34, right: 34, bottom: 34, borderRadius: 22, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(127,22,40,0.5)" }}><ImageSlot label="Foto hero dimsum (mangkuk bambu)" /></div>
          <div className="wd-lca-float" style={{ position: "absolute", bottom: 8, left: -14, width: 150, height: 150, borderRadius: 20, overflow: "hidden", border: "5px solid #FFF9F2", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.35)" }}><ImageSlot label="Hakau" /></div>
          <div className="wd-lca-float2" style={{ position: "absolute", top: -12, right: 6, width: 120, height: 120, borderRadius: 18, overflow: "hidden", border: "5px solid #FFF9F2", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.35)" }}><ImageSlot label="Saus" /></div>
          <div style={{ position: "absolute", bottom: 44, right: -16, background: "#fff", borderRadius: 14, padding: "13px 16px", boxShadow: "0 18px 36px -18px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: "#E4F4EC", color: "#238152", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>✓</div><div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 13, fontWeight: 800 }}>Halal & Higienis</div><div style={{ fontSize: 11.5, color: "rgba(45,32,34,0.5)" }}>Tersertifikasi MUI</div></div></div>
        </div>
      </section>

      <div style={{ background: "#A91F34", color: "#fff", overflow: "hidden", padding: "15px 0", marginTop: 24 }}><div className="wd-lca-marquee font-mono" style={{ display: "flex", width: "max-content", fontSize: 15, fontWeight: 600, letterSpacing: "0.05em" }}>{[0, 1].map((loop) => <span key={loop} style={{ display: "flex", gap: 34, paddingRight: 34 }}>{marqueeItems.map((m) => <span key={`${loop}-${m}`} style={{ display: "inline-flex", alignItems: "center", gap: 34 }}>{m}<span style={{ color: "#FFD84D" }}>✦</span></span>)}</span>)}</div></div>

      <section id="menu" className="wd-lca-section" style={{ maxWidth: 1200, margin: "0 auto", padding: "78px 28px 20px", scrollMarginTop: 80 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 34 }}><SectionTitle eyebrow="Menu Unggulan" title="Favorit yang selalu ludes" /><a href="#outlet" style={{ fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 7 }}>Lihat menu lengkap →</a></div>
        <div className="wd-lca-menu-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>{menuItems.map((item, index) => <MenuCard key={item.name} item={item} index={index} />)}</div>
      </section>

      <section id="promo" className="wd-lca-section" style={{ maxWidth: 1200, margin: "0 auto", padding: "70px 28px 20px", scrollMarginTop: 80 }}>
        <div style={{ marginBottom: 36 }}><SectionTitle eyebrow="Promo & Paket Hemat" title="Makin banyak, makin hemat" center /></div>
        <div className="wd-lca-promo-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 20 }}>
          <article style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "#2D2022", color: "#fff", padding: 40, minHeight: 280, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}><div style={{ position: "absolute", inset: 0, opacity: 0.5 }}><ImageSlot label="Foto paket keluarga" dark /></div><div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(45,32,34,0.1), rgba(45,32,34,0.85))" }} /><div style={{ position: "relative" }}><span style={{ display: "inline-block", background: "#FFD84D", color: "#2D2022", fontWeight: 800, fontSize: 12, padding: "6px 13px", borderRadius: 999 }}>HEMAT 25%</span><h3 style={{ fontSize: 32, fontWeight: 800, marginTop: 16, letterSpacing: "-0.02em" }}>Paket Keluarga</h3><p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", marginTop: 8, maxWidth: "34ch" }}>20 pcs dimsum campur + 4 minuman. Cukup buat kumpul seru sekeluarga.</p><div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}><span className="font-mono" style={{ fontSize: 30, fontWeight: 700, color: "#FFD84D" }}>Rp 145.000</span><span className="font-mono" style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", textDecoration: "line-through" }}>Rp 195.000</span></div></div></article>
          {promos.map((promo) => <PromoCard key={promo.name} promo={promo} />)}
        </div>
      </section>

      <section id="tentang" className="wd-lca-about" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 28px 20px", scrollMarginTop: 80, display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 48, alignItems: "center" }}>
        <div style={{ position: "relative", height: 460 }}><div style={{ position: "absolute", top: 0, left: 0, width: "70%", height: "78%", borderRadius: 22, overflow: "hidden", boxShadow: "0 30px 60px -34px rgba(127,22,40,0.5)" }}><ImageSlot label="Proses membuat dimsum" /></div><div style={{ position: "absolute", bottom: 0, right: 0, width: "56%", height: "56%", borderRadius: 20, overflow: "hidden", border: "6px solid #FFF9F2", boxShadow: "0 24px 48px -24px rgba(0,0,0,0.35)" }}><ImageSlot label="Suasana outlet" /></div><div style={{ position: "absolute", top: 14, right: 8, background: "#A91F34", color: "#fff", borderRadius: 16, padding: "16px 20px", textAlign: "center", boxShadow: "0 18px 36px -18px rgba(127,22,40,0.7)" }}><div className="font-mono" style={{ fontSize: 30, fontWeight: 700 }}>2018</div><div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>Sejak berdiri</div></div></div>
        <div><Eyebrow>Cerita Kami</Eyebrow><h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 12, lineHeight: 1.05 }}>Berawal dari resep keluarga, kini jadi favorit sejuta orang</h2><p style={{ fontSize: 16.5, lineHeight: 1.65, color: "rgba(45,32,34,0.65)", marginTop: 18 }}>Wanna Dimsum lahir dari dapur kecil dengan satu misi: menghadirkan dimsum autentik yang selalu fresh, terjangkau, dan bisa dinikmati siapa saja. Setiap dimsum dikukus dadakan — bukan stok kemarin.</p><div className="wd-lca-values-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 28 }}>{values.map((v) => <div key={v.title} style={{ background: "#fff", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 14, padding: 18 }}><div style={{ width: 42, height: 42, borderRadius: 11, background: "#FFF4D6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{v.icon}</div><div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 12 }}>{v.title}</div><div style={{ fontSize: 13, color: "rgba(45,32,34,0.58)", marginTop: 4, lineHeight: 1.45 }}>{v.desc}</div></div>)}</div></div>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "70px 28px 20px" }}><div style={{ marginBottom: 34 }}><SectionTitle eyebrow="Galeri" title="Hangatnya keliatan dari sini" center /></div><div className="wd-lca-gallery-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 1fr", gridTemplateRows: "220px 220px", gap: 18 }}><div className="wd-lca-gal" style={{ gridRow: "span 2", borderRadius: 22, overflow: "hidden" }}><ImageSlot label="Dimsum kukus" /></div><div className="wd-lca-gal" style={{ borderRadius: 18, overflow: "hidden" }}><ImageSlot label="Detail hakau" /></div><div className="wd-lca-gal" style={{ borderRadius: 18, overflow: "hidden" }}><ImageSlot label="Minuman segar" /></div><div className="wd-lca-gal" style={{ borderRadius: 18, overflow: "hidden" }}><ImageSlot label="Pangsit goreng" /></div><div className="wd-lca-gal" style={{ borderRadius: 18, overflow: "hidden" }}><ImageSlot label="Outlet nyaman" /></div></div></section>

      <section style={{ background: "#fff", borderTop: "1px solid rgba(45,32,34,0.06)", borderBottom: "1px solid rgba(45,32,34,0.06)", marginTop: 70 }}><div style={{ maxWidth: 1200, margin: "0 auto", padding: "70px 28px" }}><div style={{ marginBottom: 34 }}><SectionTitle eyebrow="Testimoni" title="Kata mereka yang udah coba" center /></div><div className="wd-lca-testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>{testimonials.map((t) => <article key={t.name} style={{ background: "#FFF9F2", border: "1px solid rgba(45,32,34,0.07)", borderRadius: 18, padding: 26 }}><div style={{ color: "#FFB020", fontSize: 17, letterSpacing: 2 }}>{"★★★★★".slice(0, t.stars)}</div><p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(45,32,34,0.78)", marginTop: 14 }}>“{t.text}”</p><div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "#A91F34", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>{t.name.charAt(0)}</div><div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.name}</div><div style={{ fontSize: 12.5, color: "rgba(45,32,34,0.5)" }}>Pelanggan · {t.role}</div></div></div></article>)}</div></div></section>

      <section id="outlet" className="wd-lca-outlet" style={{ maxWidth: 1200, margin: "0 auto", padding: "78px 28px 20px", scrollMarginTop: 80 }}><div className="wd-lca-outlet-grid" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 40, alignItems: "center" }}><div><Eyebrow>Outlet & Lokasi</Eyebrow><h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 10, lineHeight: 1.08 }}>Mampir atau pesan dari outlet terdekat</h2><p style={{ fontSize: 16, lineHeight: 1.65, color: "rgba(45,32,34,0.65)", marginTop: 16 }}>Pilih channel favoritmu. Tim kami siap mengukus dan mengemas dimsum begitu order masuk.</p><div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}><a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 54, padding: "0 22px", borderRadius: 13, background: "#00A5E2", color: "#fff", fontWeight: 700, fontSize: 15 }}>🛵 GoFood</a><a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 54, padding: "0 22px", borderRadius: 13, background: "#00AA13", color: "#fff", fontWeight: 700, fontSize: 15 }}>🟢 GrabFood</a><a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 54, padding: "0 22px", borderRadius: 13, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 15 }}>💬 WhatsApp</a></div><div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>{outlets.map((o) => <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid rgba(45,32,34,0.08)", borderRadius: 13, padding: "14px 16px" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF1F2", color: "#A91F34", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📍</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>{o.name}</div><div style={{ fontSize: 13, color: "rgba(45,32,34,0.55)", marginTop: 1 }}>{o.addr}</div></div><div className="font-mono" style={{ fontSize: 12, color: "#238152", fontWeight: 600, flexShrink: 0 }}>{o.hours}</div></div>)}</div></div><div style={{ position: "relative", height: 520, borderRadius: 24, overflow: "hidden", boxShadow: "0 30px 60px -34px rgba(127,22,40,0.5)" }}><ImageSlot label="Peta / foto outlet" /><div style={{ position: "absolute", top: 16, left: 16, background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 12px 24px -12px rgba(0,0,0,0.3)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2E9D64" }} />12 outlet buka sekarang</div></div></div></section>

      <section id="member" style={{ maxWidth: 1200, margin: "0 auto", padding: "78px 28px 20px", scrollMarginTop: 80 }}><div className="wd-lca-member-card" style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "linear-gradient(120deg,#A91F34,#7F1628)", color: "#fff", padding: "56px 56px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40, alignItems: "center" }}><div style={{ position: "absolute", top: -60, right: -40, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,216,77,0.16)" }} /><div style={{ position: "relative" }}><Eyebrow light>Wanna Rewards</Eyebrow><h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 12, lineHeight: 1.05 }}>Tiap gigitan bikin untung</h2><p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.8)", marginTop: 14, maxWidth: "42ch" }}>Kumpulkan poin tiap belanja, tukar jadi dimsum gratis, dan nikmati promo khusus member. Daftar gratis!</p><div style={{ display: "flex", gap: 24, marginTop: 28 }}><div><div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: "#FFD84D" }}>1 poin</div><div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>tiap Rp 1.000</div></div><div><div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: "#FFD84D" }}>Gratis</div><div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>dimsum di ultahmu</div></div></div><div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}><Link href="/member/register" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 26px", borderRadius: 12, background: "#FFD84D", color: "#2D2022", fontWeight: 800, fontSize: 15 }}>Daftar Member Gratis</Link><Link href="/member/login" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, padding: "0 24px", borderRadius: 12, background: "rgba(255,255,255,0.14)", color: "#fff", fontWeight: 700, fontSize: 15, border: "1px solid rgba(255,255,255,0.25)" }}>Cek Poin</Link></div></div><div style={{ position: "relative", display: "flex", justifyContent: "center" }}><div style={{ width: 320, background: "#fff", color: "#2D2022", borderRadius: 20, padding: 24, boxShadow: "0 30px 60px -24px rgba(0,0,0,0.5)", transform: "rotate(-3deg)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ fontWeight: 800, fontSize: 15 }}><span style={{ color: "#A91F34" }}>WANNA</span> REWARDS</div><div style={{ width: 30, height: 30, borderRadius: 8, background: "#FFD84D" }} /></div><div className="font-mono" style={{ marginTop: 34, fontSize: 13, letterSpacing: "0.14em", color: "rgba(45,32,34,0.55)" }}>•••• •••• •••• 2481</div><div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}><div><div style={{ fontSize: 11, color: "rgba(45,32,34,0.5)", fontWeight: 600 }}>Nama Member</div><div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>Budi Santoso</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "rgba(45,32,34,0.5)", fontWeight: 600 }}>Poin</div><div className="font-mono" style={{ fontWeight: 700, fontSize: 20, color: "#A91F34", marginTop: 2 }}>3.820</div></div></div></div></div></div></section>

      <section style={{ maxWidth: 820, margin: "0 auto", padding: "78px 28px 20px" }}><div style={{ marginBottom: 36 }}><SectionTitle eyebrow="FAQ" title="Sering ditanya" center /></div><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{faqs.map((f, index) => { const open = openFaq === index; return <div key={f.q} style={{ background: "#fff", border: `1px solid ${open ? "rgba(169,31,52,0.3)" : "rgba(45,32,34,0.08)"}`, borderRadius: 14, overflow: "hidden" }}><button type="button" onClick={() => setOpenFaq(open ? -1 : index)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}><span style={{ fontSize: 16, fontWeight: 700, color: "#2D2022" }}>{f.q}</span><span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: open ? "#A91F34" : "#FFF4D6", color: open ? "#fff" : "#A9791F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, transition: "all .15s" }}>{open ? "−" : "+"}</span></button>{open ? <div style={{ padding: "0 22px 20px", fontSize: 14.5, lineHeight: 1.6, color: "rgba(45,32,34,0.65)" }}>{f.a}</div> : null}</div>; })}</div></section>

      <section style={{ maxWidth: 1200, margin: "70px auto 0", padding: "0 28px" }}><div style={{ background: "#FFD84D", borderRadius: 24, padding: "44px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}><div><h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.025em" }}>Laper? Yuk pesan sekarang.</h2><p style={{ fontSize: 16, color: "rgba(45,32,34,0.7)", marginTop: 8 }}>Dimsum hangat siap diantar dalam hitungan menit.</p></div><a href="#outlet" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 58, padding: "0 32px", borderRadius: 14, background: "#A91F34", color: "#fff", fontWeight: 800, fontSize: 17, boxShadow: "0 16px 30px -14px rgba(127,22,40,0.8)", whiteSpace: "nowrap" }}>Pesan Online →</a></div></section>

      <MobileStickyOrderBar />
      <Footer />
    </main>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navItems = [
    ["Menu", "#menu"],
    ["Promo", "#promo"],
    ["Tentang", "#tentang"],
    ["Outlet", "#outlet"],
    ["Member", "#member"],
  ] as const;

  if (!open) return null;

  return (
    <div className="wd-lca-mobile-drawer" style={{ position: "fixed", top: 72, left: 0, right: 0, zIndex: 49, padding: "10px 14px 18px", background: "rgba(255,249,242,0.72)", backdropFilter: "blur(2px)" }}>
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 430, background: "#fff", borderRadius: 18, padding: 10, boxShadow: "0 24px 48px -20px rgba(45,32,34,0.4)", border: "1px solid rgba(45,32,34,0.07)" }}>
        {navItems.map(([label, hash], index) => (
          <a key={hash} href={hash} onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 16, fontWeight: 700, color: "#2D2022", padding: "14px 14px", borderBottom: index < navItems.length - 1 ? "1px solid rgba(45,32,34,0.06)" : "none", textAlign: "left" }}>
            {label}<span style={{ color: "#A91F34" }}>→</span>
          </a>
        ))}
        <a href="#outlet" onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 50, margin: 8, borderRadius: 12, background: "#A91F34", color: "#fff", fontWeight: 800, fontSize: 15 }}>Pesan Sekarang</a>
        <Link href="/login" onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, margin: "0 8px 8px", borderRadius: 12, background: "#FFF4D6", color: "#A91F34", fontWeight: 800, fontSize: 14 }}>Masuk Staff</Link>
      </div>
    </div>
  );
}

function MobileStickyOrderBar() {
  return (
    <div className="wd-lca-sticky-order" style={{ position: "sticky", bottom: 0, zIndex: 56, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: "rgba(255,249,242,0.92)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(45,32,34,0.08)", alignItems: "center", gap: 12 }}>
      <a href="#outlet" style={{ flex: 1, height: 52, borderRadius: 14, background: "#A91F34", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, boxShadow: "0 16px 30px -16px rgba(127,22,40,0.9)" }}>Pesan Online</a>
      <Link href="/member/register" style={{ width: 52, height: 52, borderRadius: 14, background: "#FFD84D", color: "#2D2022", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900 }} aria-label="Daftar member">★</Link>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ marginTop: 70, background: "#2D2022", color: "rgba(255,255,255,0.7)" }}>
      <div className="wd-lca-footer-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 28px 30px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr", gap: 36 }}>
        <div><BrandLogo inverted /><p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 18, maxWidth: "32ch" }}>Dimsum autentik, fresh setiap hari. Dinikmati di outlet atau diantar ke rumah.</p><div style={{ display: "flex", gap: 10, marginTop: 20 }}>{["📷", "🎵", "📘"].map((icon) => <a key={icon} href="#" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 17 }}>{icon}</a>)}</div></div>
        <FooterColumn title="Menu" links={[['#menu', 'Dimsum Kukus'], ['#menu', 'Dimsum Goreng'], ['#promo', 'Paket Hemat'], ['#menu', 'Minuman']]} />
        <FooterColumn title="Perusahaan" links={[['#tentang', 'Tentang Kami'], ['#outlet', 'Lokasi Outlet'], ['#member', 'Wanna Rewards'], ['#', 'Franchise']]} />
        <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Hubungi Kami</div><div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}><span>📞 0800-1234-5678</span><span>✉️ halo@wannadimsum.id</span><span>📍 Jl. Kemang Raya No. 12, Jakarta</span></div></div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}><div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 28px", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,0.5)" }}><span>© 2026 Wanna Dimsum. Seluruh hak cipta dilindungi.</span><div style={{ display: "flex", gap: 20 }}><a href="#" style={{ color: "rgba(255,255,255,0.5)" }}>Kebijakan Privasi</a><a href="#" style={{ color: "rgba(255,255,255,0.5)" }}>Syarat & Ketentuan</a></div></div></div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{title}</div><div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>{links.map(([href, label]) => <a key={label} href={href} style={{ color: "rgba(255,255,255,0.7)" }}>{label}</a>)}</div></div>;
}
