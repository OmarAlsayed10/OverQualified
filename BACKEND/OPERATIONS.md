# Backend operations

## Production deployment

Build one immutable image:

```bash
docker build -t overqualified-backend:release ./BACKEND
```

Run the read-only database checks before changing the schema:

```bash
docker run --rm --env-file BACKEND/.env overqualified-backend:release npm run db:preflight
```

Create a backup with a PostgreSQL client whose major version is at least the database server version:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/overqualified' \
BACKUP_DIR=/srv/overqualified/backups \
bash BACKEND/ops/backup-database.sh
```

Apply committed migrations once per release:

```bash
docker run --rm --env-file BACKEND/.env overqualified-backend:release npm run db:deploy
```

Start the application only after the migration succeeds:

```bash
docker run -d \
  --name overqualified-backend \
  --restart unless-stopped \
  --env-file BACKEND/.env \
  -p 3001:3001 \
  overqualified-backend:release
```

The database hostname in `DATABASE_URL` must be reachable from each one-off and application container. Add the same Docker network options to all commands when PostgreSQL runs on a private Docker network.

`TRUST_PROXY_HOPS=0` is correct for direct access. Set it to the exact number of trusted reverse proxies, normally `1` for one Nginx proxy. Invalid values stop startup. The configured value is printed during startup.

Only one application instance should run scheduled jobs. Keep `CRON_ENABLED=true` or unset on that instance and set `CRON_ENABLED=false` on every other instance.

## Automated backups

Enable daily backups through the PostgreSQL provider when available. Otherwise schedule `ops/backup-database.sh` on the VPS with `DATABASE_URL` supplied through a root-readable environment file. Store backups outside the application checkout and copy them to a second machine or object store.

A backup is not verified until it restores successfully. Test the newest backup against a disposable PostgreSQL database at least monthly.

## Restore drill

Stop application processes that can write to the target database. Restore into a disposable database first:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/overqualified_restore_test' \
RESTORE_FILE=/srv/overqualified/backups/overqualified-YYYYMMDDTHHMMSSZ.dump \
CONFIRM_DATABASE_RESTORE=restore \
bash BACKEND/ops/restore-database.sh
```

Run `npm run db:deploy` against the restored database, start the backend with that database, and verify `/health`, authentication, CV access, and payment history. A production restore requires a separate maintenance decision because the restore command cleans objects in the target database.

## Rollback

Application rollback and database rollback are separate operations. Deploy the previous application image only when its code is compatible with the migrated schema. Database migrations are forward-only; restore a verified backup when a schema or data rollback is required.
