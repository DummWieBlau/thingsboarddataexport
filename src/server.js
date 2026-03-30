const express = require("express");
const path = require("path");
const {
  exportTelemetryCsv,
  exportTelemetryXlsx,
  listDevices,
  listDeviceTelemetryKeys
} = require("./thingsboard");

function createApp(deps = {}) {
  const app = express();
  const exportCsv = deps.exportCsv || exportTelemetryCsv;
  const exportXlsx = deps.exportXlsx || exportTelemetryXlsx;
  const getDevices = deps.getDevices || listDevices;
  const getTelemetryKeys = deps.getTelemetryKeys || listDeviceTelemetryKeys;

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await getDevices();
      res.json({ devices });
    } catch (error) {
      res.status(400).json({
        error: error.message || "Failed to load devices"
      });
    }
  });

  app.get("/api/devices/:deviceId/keys", async (req, res) => {
    try {
      const keys = await getTelemetryKeys(req.params.deviceId);
      res.json({ keys });
    } catch (error) {
      res.status(400).json({
        error: error.message || "Failed to load telemetry keys"
      });
    }
  });

  app.post("/api/export/csv", async (req, res) => {
    try {
      const now = Date.now();
      const {
        deviceId,
        keys,
        startTs = now - 24 * 60 * 60 * 1000,
        endTs = now,
        limit = 100000,
        agg = "NONE",
        interval
      } = req.body || {};

      const csv = await exportCsv({
        deviceId,
        keys,
        startTs,
        endTs,
        limit,
        agg,
        interval
      });

      const filename = `telemetry-${deviceId}-${Date.now()}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      res.status(400).json({
        error: error.message || "Failed to export telemetry"
      });
    }
  });

  app.post("/api/export/xlsx", async (req, res) => {
    try {
      const now = Date.now();
      const {
        deviceId,
        keys,
        startTs = now - 24 * 60 * 60 * 1000,
        endTs = now,
        limit = 100000,
        agg = "NONE",
        interval
      } = req.body || {};

      const xlsx = await exportXlsx({
        deviceId,
        keys,
        startTs,
        endTs,
        limit,
        agg,
        interval
      });

      const filename = `telemetry-${deviceId}-${Date.now()}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(xlsx);
    } catch (error) {
      res.status(400).json({
        error: error.message || "Failed to export telemetry"
      });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`ThingsBoard exporter running at http://localhost:${port}`);
  });
}

module.exports = {
  createApp
};

