import type { ReactNode } from "react";
import { ic } from "./icons";
import { PageHead, MONO } from "./shared";

type FieldKind = "text" | "mono" | "select" | "area" | "toggle";

/** [label, value, kind, span?, opts?] */
type FieldDef = [string, string | boolean, FieldKind, ("full" | null)?, (string | null)?];

/** Port of `field(label, value, kind, opts)`. */
function Field({ label, value, kind, opts }: { label: string; value: string | boolean; kind: FieldKind; opts?: string | null }) {
  let ctrl: ReactNode;
  if (kind === "toggle")
    ctrl = (
      <div
        style={{
          width: "46px",
          height: "26px",
          borderRadius: "999px",
          background: value ? "#2E9D64" : "rgba(35,32,31,0.2)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: value ? "23px" : "3px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    );
  else if (kind === "select")
    ctrl = (
      <div
        style={{
          width: "100%",
          height: "44px",
          border: "1px solid rgba(35,32,31,0.15)",
          borderRadius: "9px",
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          fontSize: "14px",
        }}
      >
        <span>{value as string}</span>
        {ic("chevronDown", 15, "rgba(35,32,31,0.4)", 2)}
      </div>
    );
  else if (kind === "area")
    ctrl = (
      <div
        style={{
          width: "100%",
          minHeight: "76px",
          border: "1px solid rgba(35,32,31,0.15)",
          borderRadius: "9px",
          padding: "11px 14px",
          background: "#fff",
          fontSize: "14px",
          color: "rgba(35,32,31,0.75)",
        }}
      >
        {value as string}
      </div>
    );
  else
    ctrl = (
      <div
        style={{
          width: "100%",
          height: "44px",
          border: "1px solid rgba(35,32,31,0.15)",
          borderRadius: "9px",
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          background: "#fff",
          fontSize: "14px",
          fontFamily: kind === "mono" ? MONO : "inherit",
        }}
      >
        {value as string}
      </div>
    );

  if (kind === "toggle")
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "4px 0" }}>
        <div>
          <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{label}</div>
          {opts ? <div style={{ fontSize: "12px", color: "rgba(35,32,31,0.5)", marginTop: "2px" }}>{opts}</div> : null}
        </div>
        {ctrl}
      </div>
    );
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "7px" }}>{label}</label>
      {ctrl}
    </div>
  );
}

/** Port of `formSection(title, fields)`. */
function FormSection({ title, fields }: { title: string; fields: FieldDef[] }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(35,32,31,0.06)",
        borderRadius: "14px",
        padding: "22px 24px",
        marginBottom: "16px",
      }}
    >
      <div style={{ fontSize: "14.5px", fontWeight: 800, marginBottom: "18px" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>
        {fields.map((f, i) => (
          <div key={i} style={{ gridColumn: f[3] === "full" ? "1 / -1" : "auto" }}>
            <Field label={f[0]} value={f[1]} kind={f[2]} opts={f[4]} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Port of `renderForm(label)`. */
export function FormPage({ label }: { label: string }) {
  const l = label.toLowerCase();
  return (
    <div>
      <PageHead label={label} actionLabel={null} subtitle={`Kelola konfigurasi untuk ${l}.`} />
      <FormSection
        title="Informasi Umum"
        fields={[
          ["Nama", "Wanna Dimsum", "text"],
          ["Kode", "WD-KMG", "mono"],
          ["Kategori", "Operasional", "select"],
          ["Status", "Aktif", "select"],
          ["Deskripsi", `Konfigurasi ${l} untuk outlet ini.`, "area", "full"],
        ]}
      />
      <FormSection
        title="Preferensi"
        fields={[
          ["Zona Waktu", "WIB (GMT+7)", "select"],
          ["Mata Uang", "Rupiah (IDR)", "select"],
          ["Aktifkan modul ini", true, "toggle", null, "Tampilkan pada menu dan alur operasional"],
          ["Wajib persetujuan manager", false, "toggle", null, "Perubahan butuh approval"],
        ]}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
        <button
          style={{
            height: "44px",
            padding: "0 20px",
            borderRadius: "10px",
            border: "1px solid rgba(35,32,31,0.15)",
            background: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
            color: "#2D2022",
          }}
        >
          Batal
        </button>
        <button
          style={{
            height: "44px",
            padding: "0 24px",
            borderRadius: "10px",
            border: "none",
            background: "#A91F34",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "13.5px",
            cursor: "pointer",
          }}
        >
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
