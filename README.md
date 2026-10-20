# Sahmi

Sahmi lets people give shares of companies listed on Boursa Kuwait as gifts.

## Stack

- Next.js and TypeScript
- Tailwind CSS
- MongoDB with Mongoose
- JWT authentication in secure cookies
- Tap hosted checkout
- oanor Kuwait Stock API

## Run locally

Use Node.js 20.9 or newer.

```sh
npm install
cp .env.example .env.local
# Add your development values to .env.local; never commit it.
npm run dev
```

The development server runs at `http://localhost:5000`. To create a production build, run `npm run build`.

## Environment variables

Set these in `.env.local` for development and in the hosting provider's environment-variable settings for deployment:

- `MONGODB_URI` — MongoDB connection string
- `KUWAIT_STOCK_API_KEY` — oanor Kuwait Stock API key
- `JWT_SECRET` — signing key for authentication and price quotes
- `ADMIN_EMAIL` — email address that receives the admin role
- `TAP_SECRET_KEY` — Tap secret API key (use a test key while testing)
- `CODE_SECRET` — encryption key for gift codes

Keep all secrets server-side. Sahmi uses Tap's hosted payment page and submits card charges in KWD. The `/api/tap/webhook` endpoint verifies Tap's documented `hashstring` using the Tap secret API key before updating an order.
