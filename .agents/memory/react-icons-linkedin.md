---
name: react-icons LinkedIn icon
description: SiLinkedin was removed from react-icons/si in v5; inline SVG workaround lives in platform-icon.tsx
---

react-icons v5 (specifically v5.6.0 installed in this project) dropped the `SiLinkedin` export from `react-icons/si`, likely for trademark reasons.

**Rule:** Never import `SiLinkedin` from `react-icons/si`. Use `getPlatformIcon(platform)` from `artifacts/plan-it/src/components/platform-icon.tsx` instead.

**Why:** The export simply does not exist. Importing it throws a runtime SyntaxError in Vite that breaks the entire page.

**How to apply:** Any component that needs a social platform icon should call `getPlatformIcon(platform)` which returns an `IconType`-compatible component for INSTAGRAM/TIKTOK/FACEBOOK (using react-icons) and a custom inline SVG for LINKEDIN.
