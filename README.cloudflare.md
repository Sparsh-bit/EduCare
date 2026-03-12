# Cloudflare Deploy Structure

This repository now includes a Cloudflare-compatible project layer at the root:

```
ndps-erp/
├── public/
├── app/
├── functions/
│   └── api/
│       ├── login.js
│       ├── students.js
│       └── teachers.js
├── package.json
└── index.html
```

## Local dev

```bash
npm install
npm run dev
```

This runs Cloudflare Pages dev server with:
- static output from `.cloudflare/public`
- API routes from `functions/api`

## Deploy

```bash
npm run deploy
```

## Environment variables

Set these in Cloudflare Pages/Workers settings:

- `API_TOKEN_SECRET`: secret used for API token signing.
- `ERP_ADMIN_USER`: login username for `/api/login`.
- `ERP_ADMIN_PASSWORD`: login password for `/api/login`.
- `CORS_ORIGIN`: allowed CORS origin (use your frontend domain in production).

Optional:

- `ERP_DATA_KV`: KV binding for persisting created students/teachers.
  - Without KV, API still works in read mode with in-memory defaults.
