# Vulcan deployment

Originally deployed stable Vikunja 2.7.0 to https://vulcan.timdumol.com using Docker
Compose, SQLite and the existing Caddy container (`app-caddy-1`) and external
`caddy-edge` network. Requires Docker, Compose, Python 3, passwordless sudo,
and the existing Caddy `sites-enabled/*` import; it does not bootstrap a new host.

Run from this repository:

```sh
ANSIBLE_LOCAL_TEMP=/tmp/vikunja-ansible \
ANSIBLE_SSH_CONTROL_PATH_DIR=/tmp/vikunja-ansible-cp \
ansible-playbook -i deploy/ansible/inventory/hosts.yml deploy/ansible/site.yml \
  -e vikunja_image=vikunja-local:<verified-commit>
```

Override the Pocket ID API key path with
`-e pocket_id_api_key_file=/path/to/key`. The default references the existing
Presto provisioning key. Secrets never belong in the repository. The playbook
stores generated service and OIDC secrets in `/opt/vikunja/secrets.json` with
mode 0600 and installs the application configuration readable only by UID 1000.
It registers the confidential `vikunja-vulcan` Pocket ID client with callback
`https://vulcan.timdumol.com/auth/openid/pocketid`. Existing Pocket ID users can
log in; this client does not restrict them to a specific group. Local password
login and local self-registration are disabled. Pocket ID availability is thus
required for login. A first interactive login must be completed with a passkey
by the user; automated health and provider checks do not prove that login works.

Data persists in `/opt/vikunja/db` and `/opt/vikunja/files`. Back up both plus
`config.yml` and `secrets.json`; no scheduled or off-host backup is installed by
this playbook. For a consistent simple backup, briefly stop the service, copy
these paths to a protected backup location, and start it again. Do not copy a
live SQLite database without SQLite's backup API.

The playbook adds only `/opt/caddy/sites-enabled/vulcan.caddy`, validates the
shared Caddy configuration, and reloads it when that file changes. Other apps
use the same proxy: validation failures need to be resolved before reload.
To remove the deployment, stop the Compose project, remove only the Vulcan
Caddy site, validate and reload Caddy. Preserve the data and secrets directories
and the Pocket ID client unless deletion is intentional.

## Resource assessment, 2026-10-11

The shared host has 1 vCPU, 1,909 MiB RAM, about 1,120 MiB available RAM,
9.1 GiB free root disk (75% used), and no swap. CPU load was 0.07/0.11/0.09.
This has sufficient headroom for a small personal SQLite instance, subject to
actual workload. Vikunja is capped at 384 MiB RAM and 0.75 CPU; Docker logs rotate
at 10 MiB with three files. Large imports may hit the memory limit. Reassess
before serving many users or handling large attachments. The playbook rejects
hosts with less than 1 GiB total RAM, 512 MiB available RAM or 2 GiB free disk.

Deployed with user approval on 2026-10-11. Public HTTPS, API v2 health, and
Pocket ID discovery passed. Local login and registration are disabled. Initial
idle usage was about 40 MiB, with 1,034 MiB host RAM available and 8.9 GiB disk
free. Interactive passkey login still requires user verification.

## Custom frontend deployment

The quick task creation build uses a static API binary with the production
frontend embedded. Build locally with `pnpm build` in `frontend/`, then
`CGO_LDFLAGS=-static TAGS=netgo mage build:build` at the repository root.
Package that binary with `deploy/Dockerfile` on the deployment host and give
the image a unique commit-based tag. Pass the tag as `vikunja_image` when
using the playbook again; the image must be selected explicitly.
Before upgrading, stop the service and back up the database, files,
configuration, secrets, and Compose definition under `/opt/vikunja/backups`.
Restart the service immediately after the backup and before building images.

Deployed custom image `vikunja-local:a801d9e3a` on 2026-10-14 after browser,
lint, typecheck, production-build, and isolated image smoke checks passed.
The live quick-add JavaScript checksum matches the verified local build.
The pre-upgrade backup is
`/opt/vikunja/backups/20261014T111850Z-before-a801d9e3a/deployment.tar.gz`.

Deployed quick-add date heuristics, recurring weekdays, and default-mode
`#project` support on 2026-10-14 as
`vikunja-local:a801d9e3a-quick-add-14e07620` (includes uncommitted frontend
changes, identified by diff hash `14e07620`). Production build, 646 unit tests,
lint, typecheck, isolated container health, public HTTPS health, and live
frontend checksum verification passed. The pre-upgrade backup is
`/opt/vikunja/backups/20261014T133803Z-before-quick-add-14e07620/deployment.tar.gz`.

Security review and remaining development-only advisories: [SECURITY.md](SECURITY.md).
The Compose template now uses a read-only root and bounded `/tmp` tmpfs.
