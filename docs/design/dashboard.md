# Candidate dashboard

The supplied dashboard image informs structure only. The accepted login is the
visual source of truth: warm paper, dark ink, orange actions, DM Sans with restrained
Instrument Serif accents, thin rules and 6 px control corners. Shared brand tokens
serve both surfaces; the authentication pages retain their existing appearance.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/theme.css` | Separate green/pastel workspace palette | Shared `--brand-*` roles with login aliases | One product identity across authentication and the workspace |
| MEDIUM | `frontend/src/components/dashboard/dashboard.css` | Rounded pills and enclosed panels | Underlined search and filters, thin table rules, compact rectangular buttons | Preserve the login's surfaces and control language |
| MEDIUM | `frontend/src/pages/Dashboard.tsx` | Placeholder sections | Real offers, paginated/filterable account-owned applications, loading/error/empty states | Actions and status labels reflect available data |
| MEDIUM | `frontend/src/components/dashboard/dashboard.css` | Four vertically stacked mobile cards | Horizontal offer rail; position and status remain visible in the mobile table | Keep the application overview within reach |

Icons use Hugeicons. No decorative entry motion, match percentages, generated
applications, fictional profile credits or production demo data. Applying opens a
real source link from the offer detail; the dashboard itself never sends a dossier.
"Tout vérifier" opens the review list. The existing external-submission boundary is
unchanged. Initials stand in for unavailable company logos.

Validation uses a real Chrome browser with mocked frontend API responses, plus
Django/PostgreSQL tests for read-only data isolation, filtering, latest run/document
state and bounded row queries. Desktop/mobile, light/dark, keyboard focus, help-dialog
Escape/focus restoration, loading, empty, failure and retry are checked. Static
hover/pressed and reduced-motion styles are inspected in code; there are no entrance
animations to replay. Real remote ATS submissions are not verified or enabled.

Approve for the inspected UI scope.
