---
name: Metal pricing source and attribution
description: Approved public sources, refresh limits, and attribution for Sahmi gold and silver prices.
---

Use Gold API's public XAU/XAG spot-price endpoints, which return USD per troy ounce without an API key. Convert with 31.1034768 grams per troy ounce and the USD-to-KWD rate from the public open.er-api endpoint.

Refresh the app's metal prices no more often than every 30 minutes. The exchange-rate provider updates daily; cache its rate rather than requesting it during every metal refresh. If an upstream call fails, keep the last saved KWD prices. The Gold API quote does not provide a daily-change percentage, so do not show one for metals.

Whenever a KWD metal price is displayed, include a visible link to `https://www.exchangerate-api.com` labeled `Rates by ExchangeRate-API`.

**Why:** the user specified these sources, the 30-minute refresh interval, and the required attribution.

**How to apply:** keep these constraints when changing the metal price refresh job, conversion, or any page that displays a converted metal price.
