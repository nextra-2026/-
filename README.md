# NEXTRA

NEXTRA is packaged as a static frontend (`index.html`) plus an Express backend (`backend/`). Product, customer and order data are persisted by the backend in `backend/data.json` (use a persistent disk in production).

## Deploy

1. Backend: deploy `backend/` to a Node.js host. Set the variables from `backend/.env.example`.
2. Frontend: in `index.html`, replace `https://YOUR-BACKEND-URL` with the deployed backend URL, then publish `index.html` to GitHub Pages.
3. Open the site, create products from the Admin dashboard, and test a customer order.
4. The first owner login is the `ADMIN_USERNAME` / `ADMIN_PASSWORD` values from the backend environment.

Never commit `.env` or real secrets.
