---
name: Preview session cookies
description: Replit development-preview cookie behavior relevant to Sahmi login sessions.
---

Sahmi's development preview runs embedded in Replit. The preview proxy rewrites session cookies to `SameSite=None`; authentication should explicitly use `SameSite=None; Secure; HttpOnly` so the session survives in the preview frame. Origin checks remain important for state-changing requests.

**Why:** A live login integration check showed the Replit preview proxy changing `SameSite=Lax` to `SameSite=None`; relying on lax cookies made preview session behavior misleading.

**How to apply:** Keep preview-compatible cookie attributes and verify both direct and browser-preview login/logout behavior when changing session cookie settings.
