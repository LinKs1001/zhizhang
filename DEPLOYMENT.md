# Docker deployment notes

## `.env`

```dotenv
DOMAIN=ledger.example.com
SETUP_TOKEN=generate-a-long-random-value
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
BACKUP_RETENTION_DAYS=14
```

`SETUP_TOKEN` is used once at `/setup` and must not be exposed in the browser after initialization.

## Start

```bash
docker compose up -d --build
docker compose ps
curl -fsS https://ledger.example.com/api/health
```

Caddy obtains and renews HTTPS certificates. Point DNS A/AAAA records to the server before starting the `caddy` service.

## Backup and restore

Backups are created by the `backup` service in the `zhizhang-backups` volume. To create one immediately:

```bash
docker compose run --rm backup node scripts/backup.mjs
```

To inspect a backup:

```bash
docker run --rm -v zhizhang-backups:/backups alpine ls -lh /backups
```

For a restore, stop the app, copy the selected backup into the data volume as `zhizhang.db`, then start the app again. Always retain the current database before replacing it.

## Password reset

Run inside the app container:

```bash
docker compose run --rm app node scripts/reset-password.mjs username 'new-password'
```
