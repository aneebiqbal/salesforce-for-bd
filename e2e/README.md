# E2E tests (Playwright)

Requires **Node.js 18+**.

- Run all tests: `npm run test:e2e`
- Run with UI: `npm run test:e2e:ui`
- First run: `npx playwright install` (installs browsers)

Tests start the dev server automatically and run smoke checks (login/register pages load, root redirects).
