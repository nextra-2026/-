# NEXTRA

NEXTRA is a static frontend (`index.html`) plus an Express backend (`backend/`).

## Admin security

NEXTRA is configured for **exactly one Admin account**.

- Only `ADMIN_USERNAME` + `ADMIN_PASSWORD` from the backend environment can log in.
- The backend normalizes `data.json` to exactly one admin account on startup.
- JWT tokens are accepted only when their backend identity matches that configured account.
- Customers can use the storefront but cannot access protected admin API endpoints.
- There are no Manager, Supervisor, or Staff admin accounts.

Never commit `backend/.env` or real secrets.

## Deploy

1. Deploy `backend/` to Render, Railway, or another Node.js host.
2. Set the variables from `backend/.env.example`.
3. Deploy `index.html` to GitHub Pages.
4. In `index.html`, replace `https://YOUR-BACKEND-URL` with the deployed backend URL.
5. Log in using the backend `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

Use a persistent disk/database in production so products, customers, and orders survive restarts.
