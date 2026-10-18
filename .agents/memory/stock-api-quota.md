---
name: Stock API quota
description: User's quota constraints and the reason for conservative refresh behavior.
---

The user says the oanor free tier is very small: fetch all 12 company tickers in one server-side request and refresh only when the oldest saved price is over eight hours old. Concurrent visitors must not cause duplicate refreshes, and upstream errors must leave saved prices intact.

**Why:** These are explicit user requirements to preserve the small API allowance.

**How to apply:** Preserve the batch and cross-instance refresh protection in future pricing work. Failed attempts also use an eight-hour cooldown; this deliberately prioritizes quota protection over immediate retries during an outage. Do not label retained prices with a new timestamp unless quotes were successfully saved.
