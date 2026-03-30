const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { normalizeKeys, telemetryToCsv } = require("../src/csv");
const { createApp } = require("../src/server");

test("normalizeKeys parses comma-separated values", () => {
  const keys = normalizeKeys(" temperature, humidity ,, battery ");
  assert.deepEqual(keys, ["temperature", "humidity", "battery"]);
});

test("telemetryToCsv merges data by timestamp", () => {
  const telemetry = {
    temperature: [
      { ts: 1000, value: "21.5" },
      { ts: 2000, value: "22.1" }
    ],
    humidity: [
      { ts: 1000, value: "41" },
      { ts: 3000, value: "40" }
    ]
  };

  const csv = telemetryToCsv(telemetry, ["temperature", "humidity"]);

  assert.ok(csv.startsWith("timestamp,temperature,humidity\n"));
  assert.ok(csv.includes("1970-01-01T00:00:01.000Z,21.5,41"));
  assert.ok(csv.includes("1970-01-01T00:00:02.000Z,22.1,"));
  assert.ok(csv.includes("1970-01-01T00:00:03.000Z,,40"));
});

test("POST /api/export/csv returns csv payload", async () => {
  const app = createApp({
    exportCsv: async () => "timestamp,temperature\n2026-01-01T00:00:00.000Z,20\n"
  });

  const response = await request(app)
    .post("/api/export/csv")
    .send({ deviceId: "device-1", keys: "temperature" })
    .expect(200);

  assert.match(response.headers["content-type"], /text\/csv/);
  assert.equal(response.text, "timestamp,temperature\n2026-01-01T00:00:00.000Z,20\n");
});

test("POST /api/export/csv forwards agg and interval", async () => {
  let capturedArgs;
  const app = createApp({
    exportCsv: async (args) => {
      capturedArgs = args;
      return "timestamp,temperature\n";
    }
  });

  await request(app)
    .post("/api/export/csv")
    .send({
      deviceId: "device-1",
      keys: "temperature",
      agg: "SUM",
      interval: 86400000
    })
    .expect(200);

  assert.equal(capturedArgs.agg, "SUM");
  assert.equal(capturedArgs.interval, 86400000);
});

test("GET /api/devices returns dynamic devices", async () => {
  const app = createApp({
    getDevices: async () => [
      { id: "device-1", name: "Pump 1", type: "default" },
      { id: "device-2", name: "Pump 2", type: "default" }
    ]
  });

  const response = await request(app)
    .get("/api/devices")
    .expect(200);

  assert.equal(response.body.devices.length, 2);
  assert.deepEqual(response.body.devices[0], { id: "device-1", name: "Pump 1", type: "default" });
});

test("GET /api/devices/:deviceId/keys returns telemetry keys", async () => {
  const app = createApp({
    getTelemetryKeys: async (deviceId) => {
      assert.equal(deviceId, "device-1");
      return ["temperature", "humidity"];
    }
  });

  const response = await request(app)
    .get("/api/devices/device-1/keys")
    .expect(200);

  assert.deepEqual(response.body, { keys: ["temperature", "humidity"] });
});

test("POST /api/export/csv returns 400 when export fails", async () => {
  const app = createApp({
    exportCsv: async () => {
      throw new Error("deviceId is required");
    }
  });

  const response = await request(app)
    .post("/api/export/csv")
    .send({ keys: "temperature" })
    .expect(400);

  assert.deepEqual(response.body, { error: "deviceId is required" });
});

test("GET /api/devices returns 400 when loading fails", async () => {
  const app = createApp({
    getDevices: async () => {
      throw new Error("load failed");
    }
  });

  const response = await request(app)
    .get("/api/devices")
    .expect(400);

  assert.deepEqual(response.body, { error: "load failed" });
});

