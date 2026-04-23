# SmartSeason

SmartSeason is a Dockerized web application that uses PostgreSQL for its data store and is exposed to the public internet via Tailscale Funnel at: https://neshbook.com

## Key highlights

- Containerized: the whole project runs inside Docker containers.
- Database: PostgreSQL is used as the primary datastore.
- Public exposure: hosting is done via Tailscale Funnel.
- Simple operational model: build, run, migrate, backup.

## Tech stack

- Application: Frontend-React Js & Backend-Node Js
- Database: `PostgreSQL`
- Containerization: `docker compose`
- Networking / public access: `Tailscale Funnel`

## Prerequisites

- Docker and Docker Compose installed on the host.
- A Tailscale account and tailnet with Funnel enabled for the host device.
- Access to the domain `neshbook.com` (DNS configured as required by Tailscale).

## Quick start (development)

1. Add required environment variables in a `.env.local`.

2. Build and start the services:

   - Local development:
     ```
     docker compose up -d --build
     ```

3. (Optional) Run migrations with your project's migration tool or the provided migration container:
   ```
   docker compose run --rm migrate
  ```
   
4. Access the app:
   - In production via Tailscale Funnel: `https://neshbook.com`
   - Locally (if port is published): `http://localhost:<APP_PORT>`

## Important environment variables

Common variables used by the stack (store these securely; `.env` is fine for local dev):

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL` — e.g. `postgresql://user:pass@db:5432/dbname`
- `APP_PORT` — application listen port

## Docker notes

- The DB data should persist in a Docker volume.
- For production the Postgres port should not be published publicly; expose only the app port and let Tailscale Funnel handle public access.

## Database migrations & backups

- Run migrations as a one-shot container or during app startup (idempotent migrations recommended).
- Restore with `psql` or via a restore container as needed.

## Tailscale Funnel

- Tailscale Funnel exposes the app securely to the public internet and can be used to map a custom domain.
- Keep the Funnel host online.
- Only expose the web port through Funnel; never expose the database port publicly.

## Monitoring & healthchecks

- Tail logs with `docker compose logs -f app` and monitor container health.

## Troubleshooting (common checks)

- If the app can't connect to Postgres:
  - Verify `DATABASE_URL` and that the `db` service is healthy.
  - Check DB logs: `docker compose logs db`
- If Funnel is not serving:
  - Confirm the Funnel host is logged into the correct tailnet and online.
  - Verify domain verification and DNS per Tailscale admin console.

## Contributing

- Open issues and PRs with clear descriptions and steps to reproduce.
- Keep migrations small and atomic.
- Update documentation for any infra changes.
