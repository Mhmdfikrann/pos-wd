"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ic } from "./icons";
import { PageHead, MONO } from "./shared";

type FieldKind = "text" | "mono" | "select" | "area" | "toggle";

type FieldValue = string | boolean;
type FieldDef = {
  key: string;
  label: string;
  value: FieldValue;
  kind: FieldKind;
  span?: "full";
  help?: string;
  options?: string[];
};

const SELECT_OPTIONS: Record<string, string[]> = {
  category: ["Operasional", "Penjualan", "Inventori", "Keuangan"],
  status: ["Aktif", "Draft", "Nonaktif"],
  timezone: ["WIB (GMT+7)", "WITA (GMT+8)", "WIT (GMT+9)"],
  currency: ["Rupiah (IDR)"],
};

function fieldStyle(kind?: FieldKind): React.CSSProperties {
  return {
    width: "100%",
    minHeight: kind === "area" ? 84 : 44,
    border: "1px solid rgba(35,32,31,0.15)",
    borderRadius: 9,
    padding: kind === "area" ? "11px 14px" : "0 14px",
    background: "#fff",
    fontFamily: kind === "mono" ? MONO : "inherit",
    fontSize: 14,
    color: "#23201F",
    outline: "none",
  };
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  let ctrl: ReactNode;

  if (field.kind === "toggle") {
    ctrl = (
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(value)}
        onClick={() => onChange(!value)}
        style={{
          width: 46,
          height: 26,
          border: "none",
          borderRadius: 999,
          background: value ? "#2E9D64" : "rgba(35,32,31,0.2)",
          position: "relative",
          flexShrink: 0,
          cursor: "pointer",
          transition: "background .15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            transition: "left .15s",
          }}
        />
      </button>
    );
  } else if (field.kind === "select") {
    ctrl = (
      <div style={{ position: "relative" }}>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...fieldStyle(field.kind), appearance: "none", cursor: "pointer" }}
        >
          {(field.options ?? [String(value)]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            pointerEvents: "none",
          }}
        >
          {ic("chevronDown", 15, "rgba(35,32,31,0.4)", 2)}
        </span>
      </div>
    );
  } else if (field.kind === "area") {
    ctrl = (
      <textarea
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...fieldStyle(field.kind), resize: "vertical", lineHeight: 1.45 }}
      />
    );
  } else {
    ctrl = (
      <input
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle(field.kind)}
        spellCheck={field.kind !== "mono"}
      />
    );
  }

  if (field.kind === "toggle") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "4px 0" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{field.label}</div>
          {field.help ? <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>{field.help}</div> : null}
        </div>
        {ctrl}
      </div>
    );
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{field.label}</label>
      {ctrl}
    </div>
  );
}

function FormSection({
  title,
  fields,
  values,
  onChange,
}: {
  title: string;
  fields: FieldDef[];
  values: Record<string, FieldValue>;
  onChange: (key: string, value: FieldValue) => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(35,32,31,0.06)",
        borderRadius: 14,
        padding: "22px 24px",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 18 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>
        {fields.map((field) => (
          <div key={field.key} style={{ gridColumn: field.span === "full" ? "1 / -1" : "auto" }}>
            <Field field={field} value={values[field.key] ?? field.value} onChange={(value) => onChange(field.key, value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function fieldsFor(label: string): FieldDef[] {
  const l = label.toLowerCase();
  return [
    { key: "name", label: "Nama", value: label.includes("Akun") ? "Owner Wanna Dimsum" : "Wanna Dimsum", kind: "text" },
    { key: "code", label: "Kode", value: label.includes("Akun") ? "OWNER-01" : "WD-KMG", kind: "mono" },
    { key: "category", label: "Kategori", value: "Operasional", kind: "select", options: SELECT_OPTIONS.category },
    { key: "status", label: "Status", value: "Aktif", kind: "select", options: SELECT_OPTIONS.status },
    { key: "description", label: "Deskripsi", value: `Konfigurasi ${l} untuk outlet ini.`, kind: "area", span: "full" },
    { key: "timezone", label: "Zona Waktu", value: "WIB (GMT+7)", kind: "select", options: SELECT_OPTIONS.timezone },
    { key: "currency", label: "Mata Uang", value: "Rupiah (IDR)", kind: "select", options: SELECT_OPTIONS.currency },
    { key: "enabled", label: "Aktifkan modul ini", value: true, kind: "toggle", help: "Tampilkan pada menu dan alur operasional" },
    { key: "approval", label: "Wajib persetujuan manager", value: false, kind: "toggle", help: "Perubahan butuh approval" },
  ];
}

function initialValues(fields: FieldDef[]): Record<string, FieldValue> {
  return Object.fromEntries(fields.map((field) => [field.key, field.value]));
}

export function FormPage({ label, crumbPath }: { label: string; crumbPath?: string[] }) {
  const l = label.toLowerCase();
  const fields = useMemo(() => fieldsFor(label), [label]);
  const initial = useMemo(() => initialValues(fields), [fields]);
  const storageKey = `wd-owner-form:${label}`;
  const [values, setValues] = useState<Record<string, FieldValue>>(initial);
  const [savedValues, setSavedValues] = useState<Record<string, FieldValue>>(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setValues(initial);
        setSavedValues(initial);
        return;
      }

      try {
        const parsed = { ...initial, ...JSON.parse(raw) } as Record<string, FieldValue>;
        setValues(parsed);
        setSavedValues(parsed);
      } catch {
        setValues(initial);
        setSavedValues(initial);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [initial, storageKey]);

  const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);
  const generalFields = fields.slice(0, 5);
  const preferenceFields = fields.slice(5);

  const update = (key: string, value: FieldValue) => {
    setSaved(false);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const cancel = () => {
    setValues(savedValues);
    setSaved(false);
  };

  const save = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(values));
    setSavedValues(values);
    setSaved(true);
  };

  return (
    <div>
      <PageHead label={label} crumbPath={crumbPath} actionLabel={null} subtitle={`Kelola konfigurasi untuk ${l}.`} />
      {saved ? (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: "10px 13px",
            borderRadius: 10,
            background: "#E4F4EC",
            color: "#238152",
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          Perubahan tersimpan.
        </div>
      ) : null}
      <FormSection title="Informasi Umum" fields={generalFields} values={values} onChange={update} />
      <FormSection title="Preferensi" fields={preferenceFields} values={values} onChange={update} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
        <button
          type="button"
          onClick={cancel}
          disabled={!dirty}
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: 10,
            border: "1px solid rgba(35,32,31,0.15)",
            background: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: dirty ? "pointer" : "not-allowed",
            color: dirty ? "#2D2022" : "rgba(35,32,31,0.35)",
          }}
        >
          Batal
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          style={{
            height: 44,
            padding: "0 24px",
            borderRadius: 10,
            border: "none",
            background: dirty ? "#A91F34" : "rgba(35,32,31,0.12)",
            color: dirty ? "#fff" : "rgba(35,32,31,0.4)",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: dirty ? "pointer" : "not-allowed",
          }}
        >
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
