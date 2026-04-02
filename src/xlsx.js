const XLSX = require("xlsx");

function telemetryToXlsx(telemetry, selectedKeys) {
  const keys = Array.isArray(selectedKeys)
    ? selectedKeys.map((k) => String(k).trim()).filter(Boolean)
    : String(selectedKeys)
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

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
  const data = [["timestamp", ...keys]];
  let lastDay = new Date(rows[0].ts);
  lastDay.setHours(0,0,0,0);
  lastDay.setDate(lastDay.getDate() - 1);
  for (const row of rows) {
    while (new Date(row.ts).setHours(0,0,0,0) > lastDay.getTime() + 24*60*60*1000 ) {
      lastDay.setDate(lastDay.getDate() + 1);
      data.push([lastDay.toISOString().substring(0, 10), 0]);
    }
    const line = [new Date(row.ts).toISOString().substring(0, 10)];
    for (const key of keys) {
      let value = row[key] == null ? "" : parseFloat(row[key]);
      line.push(value);
    }
    data.push(line);
    lastDay = new Date(new Date(new Date(row.ts).setHours(0,0,0,0)));
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Telemetry");

  // Auto-size columns
  const colWidths = [];
  for (let i = 0; i < data[0].length; i++) {
    let maxLen = 10;
    for (const row of data) {
      const cellLen = String(row[i] || "").length;
      if (cellLen > maxLen) {
        maxLen = cellLen;
      }
    }
    colWidths.push({ wch: maxLen + 2 });
  }
  worksheet["!cols"] = colWidths;

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  telemetryToXlsx
};

