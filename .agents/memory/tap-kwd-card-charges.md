---
name: Tap KWD card charges
description: Sahmi's currency handling after replacing Stripe with Tap.
---

Tap's charge API supports KWD amounts with three decimal places. Charge the card-paid portion in the same KWD amount shown at checkout and keep wallet/order accounting in KWD; do not apply the former Stripe USD conversion.

**Why:** The previous USD conversion was conditional on Stripe not supporting KWD. The user requested Tap instead, and Tap's official charge API accepts KWD directly.

**How to apply:** For Tap card, wallet-only, and split payments, use KWD fils for the signed quote, provider amount, and wallet ledger.
