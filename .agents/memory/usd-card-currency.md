---
name: USD Stripe charges
description: Currency handling between Sahmi's KWD wallet and Stripe's USD card charges.
---

Sahmi continues to show checkout totals and maintain wallet/order accounting in KWD. Stripe card payments use USD converted at the user-confirmed fixed rate of 1 KWD = 3.25 USD; never treat KWD and USD as the same numeric amount or change the rate without explicit confirmation.

**Why:** The user chose USD card charges because Stripe rejects KWD on the connected account, while preferring KWD as the customer-facing currency in Sahmi.

**How to apply:** Convert only the card-paid portion, lock its USD cents to the signed quote/order, and keep wallet ledger entries in KWD.
