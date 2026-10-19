# Sahmi

Sahmi lets people give shares of companies listed on Boursa Kuwait as gifts.

## Stack

- Next.js and TypeScript
- Tailwind CSS
- MongoDB with Mongoose
- JWT authentication in secure cookies
- Stripe Checkout
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
- `STRIPE_SECRET_KEY` — Stripe secret API key
- `CODE_SECRET` — encryption key for gift codes
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret, if a webhook handler is configured

Keep all secrets server-side. Use Stripe test-mode keys while testing. Sahmi shows checkout totals in KWD and sends card charges to Stripe in USD at the configured fixed rate of 1 KWD = 3.25 USD.

For a Stripe test checkout, use card number `4242 4242 4242 4242`, any future expiry date, and any CVC.
