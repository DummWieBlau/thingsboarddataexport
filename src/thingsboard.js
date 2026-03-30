const axios = require("axios");
const { TB_CONFIG } = require("./config");
const { normalizeKeys, telemetryToCsv } = require("./csv");

async function getAuthToken() {
  const response = await axios.post(
    `${TB_CONFIG.host}/api/auth/login`,
    {
      username: TB_CONFIG.username,
      password: TB_CONFIG.password
    },
    {
      timeout: 10000
    }
  );

  if (!response.data || !response.data.token) {
    throw new Error("ThingsBoard login failed: no token in response");
  }

  return response.data.token;
}

function authHeaders(token) {
  return {
    "X-Authorization": `Bearer ${token}`
  };
}

async function listDevices() {
  const token = await getAuthToken();
  const pageSize = 100;
  let page = 0;
  let hasNext = true;
  const devices = [];

  while (hasNext) {
    const response = await axios.get(`${TB_CONFIG.host}/api/tenant/devices`, {
      headers: authHeaders(token),
      params: {
        pageSize,
        page,
        textSearch: ""
      },
      timeout: 15000
    });

    const data = response.data || {};
    const pageItems = Array.isArray(data.data) ? data.data : [];
    devices.push(...pageItems);
    hasNext = Boolean(data.hasNext);
    page += 1;
  }

  return devices.map((device) => ({
    id: device.id && device.id.id ? device.id.id : "",
    name: device.name || "(unnamed)",
    type: device.type || ""
  })).filter((device) => device.id);
}

async function listDeviceTelemetryKeys(deviceId) {
  if (!deviceId) {
    throw new Error("deviceId is required");
  }

  const token = await getAuthToken();
  const response = await axios.get(
    `${TB_CONFIG.host}/api/plugins/telemetry/DEVICE/${encodeURIComponent(deviceId)}/keys/timeseries`,
    {
      headers: authHeaders(token),
      timeout: 15000
    }
  );

  const keys = Array.isArray(response.data) ? response.data : [];
  return keys.map((key) => String(key).trim()).filter(Boolean);
}

async function fetchTelemetry({ token, deviceId, keys, startTs, endTs, limit, agg, interval }) {
  const params = {
    keys: keys.join(","),
    startTs,
    endTs,
    limit,
    agg
  };

  if (Number.isFinite(Number(interval)) && Number(interval) > 0) {
    params.interval = Number(interval);
  }

  const response = await axios.get(
    `${TB_CONFIG.host}/api/plugins/telemetry/DEVICE/${encodeURIComponent(deviceId)}/values/timeseries`,
    {
      headers: authHeaders(token),
      params,
      timeout: 15000
    }
  );

  return response.data || {};
}

async function exportTelemetryCsv({ deviceId, keys, startTs, endTs, limit, agg, interval }) {
  const normalizedKeys = normalizeKeys(keys);

  if (!deviceId) {
    throw new Error("deviceId is required");
  }

  if (normalizedKeys.length === 0) {
    throw new Error("At least one telemetry key is required");
  }

  const token = await getAuthToken();
  const telemetry = await fetchTelemetry({
    token,
    deviceId,
    keys: normalizedKeys,
    startTs,
    endTs,
    limit,
    agg,
    interval
  });

  return telemetryToCsv(telemetry, normalizedKeys);
}

module.exports = {
  exportTelemetryCsv,
  listDevices,
  listDeviceTelemetryKeys
};

