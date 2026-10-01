# Intern — Les grands débuts

The authentication pages use a warm paper surface, an oversized typographic poster, a modest form scale and orange wayfinding. DM Sans and Instrument Serif are self-hosted with their OFL licenses. Icons use Hugeicons. The artwork is decorative; the account form remains the main landmark, with persistent labels, native input semantics and password-manager support.

Registration retains the existing three-step API flow and field values on back navigation. Its progress indicator describes steps without implying that a user can skip validation. Pointer transitions take 150 ms; keyboard navigation and reduced-motion preferences suppress those transitions.

The pared-back revision keeps the two main headings and essential controls, removing marketing captions and repeated instructions. Authentication fields use underlines and real HTML labels integrated into each field. Labels float on focus, when a value exists, and on browser autofill; they never disappear. Pointer and keyboard focus use a thicker accent underline without a rectangular outline. Invalid authentication fields retain browser constraints but display associated inline feedback instead of native validation tooltips. Shared onboarding fields retain their existing external labels. Errors, disabled controls and password visibility retain their semantics.

## Input polish verification

### Structure and visual density

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/components/auth/AuthControls.tsx:7` | Separate labels and filled rectangular fields | Integrated persistent labels, a single underline, explicit focus and error states | Borders communicate structure; the form has less visual weight without losing its accessible labels. |
| LOW | `frontend/src/components/auth/AuthLayout.tsx:11` | Repeated captions, overlines and footer copy | Main headings and essential actions | Removes competing text and makes the form easier to scan. |

### Contextual icons and interruptible feedback

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `frontend/src/components/auth/AuthControls.tsx:23` | Instant replacement of the password icon | Both Hugeicons cross-fade with opacity, scale and blur; keyboard and reduced-motion changes are immediate | Makes pointer feedback coherent while preserving a static visible state and immediate keyboard response. |

Verification: build, lint, token checks and 40 Playwright tests pass. Inspected empty, focused, filled and restored-value fields in Chrome, desktop and mobile layouts, light/dark contrast and text zoom. Pointer field transitions were replayed at 10% speed. Login, signup, errors, loading, disabled controls, reset and onboarding regression checks use mocked API responses. Hover/pressed rules and reduced-motion fallbacks were also reviewed in the implementation. Chrome autofill styling was inspected using a forced browser pseudo-state.

Not verified: physical iOS/Android keyboards, third-party password-manager interfaces, or live account creation during this UI pass.

Approve for the inspected scope.

## Artwork provenance

`frontend/public/images/intern-first-step.webp` was created on 2026-09-30 with the built-in imagegen tool, then encoded as WebP at quality 82 (1086 × 1448, about 99 KiB). It depicts an imagined staircase, not a claimed photograph of a real building. The existing architecture assets were preserved.

Generation prompt:

> Create a premium editorial architecture photograph for the Intern career platform. Portrait 3:4 format, photorealistic analog medium format architectural photography. A REAL monumental burnt bright orange painted steel spiral staircase seen from below, dramatic sculptural diagonal sweeping upward from lower right toward upper left, brushed orange metal railing with slight lived-in texture, pale warm ivory concrete modernist interior around it. A small circular skylight with pale daylight, softly lit warm neutral walls. Restrained, highly composed, art-school architecture magazine aesthetic, authentic physical detail, subtle fine photographic film grain, deep natural shadows and sunlight. Orange dominates the stair but cream dominates negative space. Strong graphic composition, sophisticated and memorable. Fill the vertical frame; close crop of stair geometry, not a wide empty room. NO text, NO lettering, NO logos, NO people, NO floating objects, NO CGI plastic, NO surrealism, NO gradients used as graphics, NO mockup. This is a standalone photograph, no UI. It will be placed on a warm paper editorial login page next to very large ink typography. The orange should feel like painted steel, not glowing light. Produce one final image.
