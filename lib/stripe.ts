import Stripe from "stripe";

export class StripeConfigurationError extends Error {
  constructor(message = "A Stripe test-mode secret key is required.") {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith("sk_test_")) throw new StripeConfigurationError();
  return stripeClient ??= new Stripe(secretKey, { maxNetworkRetries: 2 });
}
