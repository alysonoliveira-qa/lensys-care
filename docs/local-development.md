# Local Development

This project uses a port split to avoid conflicts between manual browser testing and automated runs.

## Ports

- `3000`: Cypress, Codex, and other automated local checks
- `3001`: manual development in the browser

## Manual dev

Run the web app on port 3001:

```bash
pnpm --filter web dev:manual
```

You can also pass the port explicitly:

```bash
pnpm --filter web dev -- -p 3001
```

Open:

```text
http://localhost:3001
```

## Automated local checks

Use port 3000 for Cypress and Codex-driven local runs unless `CYPRESS_BASE_URL` is set explicitly.

Example:

```bash
CYPRESS_BASE_URL=http://localhost:3000 pnpm cypress open
```

## If the port is stuck on Windows

If a Node process keeps port 3000 or 3001 open, kill local Node processes:

```bash
taskkill /F /IM node.exe
```
