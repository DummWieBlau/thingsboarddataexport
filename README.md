# ThingsBoard Telemetry CSV Exporter

Very simple web app with:
- **Vue (frontend)** in `public/index.html`
- **Express (backend)** in `src/server.js`

The UI now loads devices dynamically and then loads telemetry key names for the selected device.

The frontend never sees ThingsBoard host/username/password. These are hard coded in `src/config.js` and only used by backend API calls.

Start and end time are selected in the UI via human-readable `datetime-local` inputs (calendar/time picker in supported browsers) and converted to `startTs`/`endTs` epoch milliseconds for the backend API.

## 1) Configure ThingsBoard credentials

Edit `src/config.js` and set:
- `host`
- `username`
- `password`

## 2) Install and run

```powershell
npm install
npm start
```

Open:
- `http://localhost:3000`

## 3) Run tests

```powershell
npm test
```

## 4) Run with Docker

Build image:

```powershell
docker build -t thingsboarddataexport .
```

Run container:

```powershell
docker run --rm -p 3000:3000 thingsboarddataexport
```

Then open:
- `http://localhost:3000`

Note: the container uses the hard coded ThingsBoard credentials from `src/config.js`.

## API

- `GET /api/devices`
- `GET /api/devices/:deviceId/keys`
- `POST /api/export/csv`

Example body:

```json
{
  "deviceId": "f3b1f8e0-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "keys": "temperature,humidity",
  "startTs": 1711300000000,
  "endTs": 1711386400000,
  "limit": 100000,
  "agg": "NONE"
}
```

Returns a CSV file download.

## Security note

Hard coding credentials is okay for a quick internal demo, but for production move secrets to a secure secret store or environment variables.

