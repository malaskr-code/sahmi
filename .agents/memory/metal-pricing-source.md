---
name: Metal pricing source and attribution
description: Approved public sources, refresh limits, and attribution for Sahmi gold and silver prices.
---

Use Gold API's public XAU/XAG spot-price endpoints, which return USD per troy ounce without an API key. Convert with 31.1034768 grams per troy ounce and the USD-to-KWD rate from the public open.er-api endpoint.

Refresh the app's metal prices no more often than every 30 minutes. The exchange-rate provider updates daily; cache its rate rather than requesting it during every metal refresh. If an upstream call fails, keep the last saved KWD prices. The Gold API quote does not provide a daily-change percentage, so do not show one for metals.

Show the required `https://www.exchangerate-api.com` attribution only once in the site footer: `Exchange rates by ExchangeRate` in English and `أسعار الصرف من ExchangeRate` in Arabic. Do not repeat it alongside metal prices or on product, cart, checkout, portfolio, gift, or admin content.

**Why:** the user specified these sources and refresh limits, then asked for attribution to appear once in the footer instead of on each metal-price surface.

**How to apply:** keep these constraints when changing price refresh or conversion logic; keep attribution localized and confined to the footer.
