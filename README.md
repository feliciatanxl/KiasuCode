# KiasuCode

KiasuCode is organized as an npm-workspaces monorepo for a web-first application.

## Workspaces

- `frontend`: React and TypeScript application built with Vite.
- `backend`: Node.js and TypeScript API service.
- `packages/shared`: framework-independent types shared by the frontend and backend.
- `legacy-bot`: archived Telegram bot implementation.

## Development

```powershell
npm install
npm run dev
```

The frontend runs on Vite's default development port. The backend defaults to
`http://localhost:3000`; its smoke-test endpoint is `GET /health`.

Run the repository checks with:

```powershell
npm run typecheck
npm run lint
npm run build
```
