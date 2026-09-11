# NEXTRA — GitHub + Backend deployment

## GitHub Pages (frontend)
Upload/push:
- `index.html`
- `.gitignore`
- `README.md`

Do NOT upload `backend/.env`.

Before publishing, set the backend URL in `index.html` instead of `https://YOUR-BACKEND-URL`.

## Backend
Deploy the `backend/` folder to Render/Railway/another Node.js host.

Set:
- `PORT` (the host may provide it automatically)
- `JWT_SECRET` — long random secret
- `ADMIN_USERNAME` — your one admin username
- `ADMIN_PASSWORD` — your one admin password
- `FRONTEND_ORIGIN` — your GitHub Pages origin
- `DATA_FILE` — persistent disk path if your host provides one

Start command:
`npm start`

## Important
The `.env` file is intentionally excluded from this package. Put secrets in your hosting provider's Environment Variables, not GitHub.

The backend creates/normalizes exactly one Admin account at startup and rejects tokens that do not match that account.
