# ZUStore

A responsive, installable app catalogue inspired by the video reference. It includes discovery, category browsing, search, app detail pages, APK downloads, personal library, accounts, reviews, community messages, a developer submission flow, and an admin console at `/admin`.

## Run locally

```sh
npm start
```

Open `http://localhost:3000`. The first run creates `data/store.json` and seeds sample listings plus an admin account (`admin@zustore.app`). Set `ADMIN_PASSWORD` before the first run to choose the admin password. User accounts, catalogue records, and APK uploads are stored beneath `DATA_DIR` (defaults to `./data`).

## Railway

Deploy as a Node service with `npm start`. Set `ADMIN_PASSWORD` to a strong unique secret and set `DATA_DIR=/data`. Attach a Railway volume mounted at `/data` so catalogue data and uploaded APKs persist across deployments. Health check: `/api/health`.

The APK upload limit is 350 MB; image uploads are limited to 12 MB. Uploads are stored on the service volume. User sessions are in memory and expire when the service restarts. Configure a persistent session/database and email verification before opening registration to a public audience.

## Routes

- `/` — ZUStore catalogue
- `/admin` — admin console
- `/api/health` — Railway health check

The initial app records are demo catalogue entries. Replace their APKs/screenshots through the admin and developer submission flows before presenting the store as a live download source.
