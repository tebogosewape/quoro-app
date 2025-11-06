# Monitoring Overview

This project now ships with an open-source monitoring stack that covers both
application queues and aggregated logs. The tooling is fully containerised so it can
be started alongside the existing services in development or production.

## Queue monitoring (Bull Board)

- **Location:** `http://<api-host>:<api-port>/queues` (defaults to
  `http://localhost:2200/queues` in development).
- **Security:** Simple HTTP basic authentication controlled via the following
  environment variables in `apps/api/.env.*`:
    - `QUEUE_DASHBOARD_ENABLED` – set to `true` to expose the dashboard.
    - `QUEUE_DASHBOARD_USERNAME` / `QUEUE_DASHBOARD_PASSWORD` – required when the
      dashboard is enabled.
    - `QUEUE_DASHBOARD_PATH` – optional path override (defaults to `/queues`).

The dashboard is backed by [Bull Board](https://github.com/felixmosh/bull-board)
which provides per-queue insights, job payload previews, retries, and manual job
controls.

## Centralised logging (Grafana, Loki, Promtail)

A lightweight observability stack is available through the Docker Compose files:

- **Grafana** – visualises logs and provides dashboards (`http://localhost:3000`).
- **Loki** – log aggregation datastore listening on port `3100`.
- **Promtail** – tailing agent that ships Docker container logs into Loki by using the
  Docker socket for service discovery.

The configuration lives under `monitoring/`:

- `monitoring/promtail-config.yml` – Promtail scrape settings (Docker SD, per-service
  labels, etc.).
- `monitoring/grafana/provisioning/datasources/datasource.yml` – provisions Loki as the
  default Grafana data source.
- `monitoring/grafana/provisioning/dashboards/dashboard.yml` – registers custom dashboards.
- `monitoring/grafana/dashboards/` – JSON definitions that are auto-loaded into Grafana.

### Accessing logs

1. Start the stack via Docker Compose (development example):
    ```powershell
    docker compose up -d grafana loki promtail
    ```
2. Open Grafana at `http://localhost:3000` (default credentials `admin` / `admin`).
3. Use the built-in _Explore_ view and select the `Loki` datasource to search across
   application, worker, and supporting service logs. All Compose services are tagged
   with labels such as `service`, `project`, and `container`.
4. Open the **Quora App Logs** dashboard (pre-provisioned under the _Quora Monitoring_
   folder) for ready-made log volume, error rate, and top talker insights.

### Windows hosts

Promtail requires access to the Docker socket (`/var/run/docker.sock`) and the container
log directory (`/var/lib/docker/containers`). When running Docker Desktop on Windows,
ensure WSL2 based engines are enabled so these mounts resolve correctly. If the mounts
are unavailable, start Promtail inside the same Docker Desktop context that hosts the
containers or update `monitoring/promtail-config.yml` to scrape from mounted log files.

## Production hardening tips

- Override Grafana credentials via `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` in
  the production Compose file or host secrets manager.
- Place Grafana behind the existing reverse proxy (e.g. Nginx) with TLS before exposing
  it externally.
- Consider enabling Loki retention policies and persistence depending on regulatory needs.
- For higher scale, swap Promtail with the Grafana Agent in Flow mode to collect metrics
  as well as logs.

## Next steps

- Build dedicated Grafana dashboards or alerts tailored to queue latency and error
  rates.
- Add Loki alerting rules or integrate with external alerting systems for proactive
  notifications.
