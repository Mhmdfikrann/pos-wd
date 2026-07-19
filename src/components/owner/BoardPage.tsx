import { PageHead, MONO } from "./shared";

/** [title, fg, bg, tickets[[id, slot, time]]] */
type BoardCol = [string, string, string, Array<[string, string, string]>];

/** Port of `renderBoard(label)` — mini kitchen board with 3 columns. */
export function BoardPage({ label }: { label: string }) {
  const cols: BoardCol[] = [
    ["Baru", "#3A5BB0", "#EEF2FB", [["#0431", "Meja A-12", "2:40"], ["#0430", "GoFood", "1:30"]]],
    ["Sedang Dimasak", "#C67A15", "#FCEEDB", [["#0429", "Antrean T-07", "5:12"], ["#0428", "Meja B-03", "7:20"]]],
    ["Siap Antar", "#238152", "#E4F4EC", [["#0426", "Meja A-05", "3:00"]]],
  ];
  return (
    <div>
      <PageHead label={label} actionLabel={null} subtitle="Pantau antrean pesanan dapur secara real-time." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
        {cols.map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid rgba(35,32,31,0.06)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: c[2] }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: c[1] }}>{c[0]}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#fff",
                  background: c[1],
                  padding: "2px 9px",
                  borderRadius: "999px",
                }}
              >
                {c[3].length}
              </span>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {c[3].map((t, j) => (
                <div key={j} style={{ border: "1px solid rgba(35,32,31,0.1)", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: MONO, fontWeight: 700 }}>{t[0]}</span>
                    <span style={{ fontFamily: MONO, fontSize: "12.5px", color: "#C67A15", fontWeight: 700 }}>{t[2]}</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#A91F34", marginTop: "4px" }}>{t[1]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
