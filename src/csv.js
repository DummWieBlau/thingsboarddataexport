function normalizeKeys(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.map((k) => String(k).trim()).filter(Boolean);
  }

  return String(input)
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function telemetryToCsv(telemetry, selectedKeys) {
  const keys = normalizeKeys(selectedKeys);
  const tsMap = new Map();

  for (const key of keys) {
    const entries = Array.isArray(telemetry[key]) ? telemetry[key] : [];
    for (const entry of entries) {
      const ts = Number(entry.ts);
      if (!Number.isFinite(ts)) {
        continue;
      }

      if (!tsMap.has(ts)) {
        tsMap.set(ts, { ts });
      }

      tsMap.get(ts)[key] = entry.value;
    }
  }

  const rows = Array.from(tsMap.values()).sort((a, b) => a.ts - b.ts);
  const header = ["timestamp", ...keys];
  const csvRows = [header.join(",")];

  for (const row of rows) {
    const line = [new Date(row.ts).toISOString()];
    for (const key of keys) {
      const value = row[key] == null ? "" : String(row[key]);
      const escaped = value.includes(",") || value.includes("\"")
        ? `"${value.replace(/\"/g, "\"\"")}"`
        : value;
      line.push(escaped);
    }
    csvRows.push(line.join(","));
  }

  return `${csvRows.join("\n")}\n`;
}

module.exports = {
  normalizeKeys,
  telemetryToCsv
};

