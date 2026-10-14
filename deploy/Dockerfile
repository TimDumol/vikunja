# Build the frontend with pnpm build, then the API with:
# CGO_LDFLAGS=-static TAGS=netgo mage build:build
# Keeps the established certificate bundle and container layout.
FROM vikunja/vikunja:2.7.0
COPY --chown=1000:1000 --chmod=755 vikunja /app/vikunja/vikunja
