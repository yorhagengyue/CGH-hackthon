/** RFC 4180 CSV with an Excel UTF-8 BOM and spreadsheet formula protection. */
export function csv(columns: readonly string[], rows: Record<string, unknown>[]): string {
  const cell = (value: unknown) => {
    let s = value == null ? "" : String(value);
    if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [columns.map(cell).join(","), ...rows.map((row) => columns.map((c) => cell(row[c])).join(","))].join("\r\n") + "\r\n";
}
