# Security review — 2026-10-24

Scope: rebase onto upstream/main (4699814e7), root and veans Go modules,
frontend and desktop lockfiles, build runtime pins, and the Vulcan deployment.
This is a dependency and deployment review, not a comprehensive penetration test.

## Remediation

- Node 24.22.1 replaces 24.21.0 in Docker, mise and .nvmrc. The Docker
  multi-platform digest was resolved from the registry. This includes the
  CVE-2026-111497 Brotli decoder fix and the other October Node security fixes.
  Advisory: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- Updated DOMPurify to 3.4.17, Vite to 8.3.3, Vitest to 4.1.12 and
  Happy DOM to 21.0.4; patched markdown-it, serialize-javascript, fast-uri
  and Zod 4 through pnpm overrides.
- Updated desktop Electron to 43.8.1, body-parser to 2.4.0, undici to
  8.12.2 and fast-uri to 4.2.3. The desktop audit reports zero advisories.
- Font generation requires Python Brotli >=1.2.1 before processing fonts;
  an already installed older version no longer bypasses the install check.
  Python Brotli is not installed in the current mise environment. Nix tooling
  versions were not rebuilt or independently validated in this session.
- Excluded local credentials and git metadata from Docker build contexts;
  ignored the local root .env in git.
- Enabled a read-only application container root with a bounded, non-executable
  temporary filesystem. Persistent database/files mounts remain writable.
- Added frame, referrer and permissions headers to the existing HTTPS site.
  Existing unprivileged UID, dropped capabilities, no-new-privileges, resource
  limits, TLS, HSTS and disabled local registration/login remain configured.

## Brotli exposure

The deployed application is a static Go binary with embedded browser assets;
Node is used for building, not serving requests. Caddy's site enables gzip and
zstd response encoding, with no Brotli decompression configured. Neither Go
module reports a reachable known vulnerability with govulncheck. The root scan
reports one advisory in a required module outside the imported package set.
The host's shared Caddy reports version 2.11.7. Other applications on this shared
host are outside this repository's review and were not upgraded.

## Remaining development tooling advisories

The frontend audit retains three high advisories, all under
@histoire/plugin-screenshot -> capture-website -> Puppeteer 23:

- GHSA-jmr9-qjv8-65gv and GHSA-7pqw-9j4j-h8q3 affect extract-zip 2.0.1;
  the registry lists no patched release. Do not extract untrusted archives
  with this tooling.
- Zod 3.23.8 is covered by the oversized-collection memory exhaustion advisory.
  Its stated fix is Zod >=4.6.6; forcing that major version into Puppeteer's
  older protocol parser is not a validated compatible fix.

These tools are absent from the production image. Replacing/upgrading the
screenshot dependency chain requires a separate compatibility change. Do not
use screenshot tooling against untrusted inputs meanwhile.

## Validation

Logs are retained under /tmp/vikunja-*. Production deployment additionally
requires a stopped-service backup, isolated image health check, Compose and
Caddy validation, public health/authentication checks, and frontend asset
checksum verification. Interactive Pocket ID passkey login requires a user.

Validation completed: 2,724 unit tests, seven quick-add/editor Playwright checks,
backend web tests, frontend typecheck, JS/style lint, production frontend/static
API builds, and Ansible syntax checks passed. JS lint reports existing warnings.
Root and veans Go scans report no reachable known vulnerabilities.
