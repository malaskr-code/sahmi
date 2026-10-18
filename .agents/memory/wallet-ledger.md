---
name: Wallet ledger invariants
description: Rules for wallet balances, pending reservations, and payment completion in Sahmi.
---

Sahmi wallet balance must never be stored as a mutable balance value; derive it from the signed transaction ledger. Pending gift checkout reservations reduce spendable funds, and payment completion must update the ledger and gift/order state atomically.

**Why:** A derived balance avoids drift, while reservations and atomic completion prevent concurrent checkouts from spending the same wallet funds.

**How to apply:** Append ledger entries for every wallet movement. Compute spendable funds from the ledger minus active reservations, and keep those checks and paid-order finalization inside MongoDB transactions.
