---
name: Portable npm lockfiles
description: Prevent Replit's private package firewall URLs from breaking installs on external hosts.
---

For deployments outside Replit, npm lockfile tarball URLs must be reachable from the external build environment. Replit-generated URLs can use an internal firewall host and an extra `/npm/` path segment; Vercel cannot resolve that host, and npm's registry-host replacement can preserve the invalid path.

**Why:** The Sahmi Vercel build failed during dependency installation because lockfile URLs pointed to Replit's private package firewall.

**How to apply:** Before committing a lockfile for an external host, verify all resolved tarball URLs use the public HTTPS registry. When regenerating with an existing `node_modules` tree, avoid using its hidden lock data; generate from a clean package-manifest context.
