# NEXTRA — Admin Only

## Backend on Render
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables:
  - `ADMIN_USERNAME` = your admin username
  - `ADMIN_PASSWORD` = your admin password
  - `JWT_SECRET` = a long random secret

The backend creates exactly one `Admin` account and seeds the supplied NEXTRA price list automatically when the products database is empty.

## Frontend
The `index.html` already points to:
`https://nextra-backend-mqiy.onrender.com`

If your Render URL changes, replace `BACKEND_URL` in `index.html`.

## Important
Render Free filesystem storage is not persistent. For permanent products/orders, use a persistent disk or external database.
