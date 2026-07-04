---
name: Responsive app shell & mobile nav drawer
description: How the bank-app layout adapts across mobile/tablet/desktop, and the accessibility contract the mobile nav drawer must satisfy.
---

# Responsive app shell & mobile nav drawer

The authenticated app shell (`AppLayout`) drives responsiveness for every page — individual pages already use responsive Tailwind grids (`sm:/md:/lg:grid-cols-*`) and the shadcn `Table` component already wraps content in `overflow-auto`, so page-level tables/grids are generally NOT the problem.

**The shell pattern:** desktop sidebar is a persistent panel (`hidden lg:flex w-64`); on mobile/tablet (<1024px) the same nav renders as a slide-in drawer opened by a hamburger button in the header. Nav markup is shared via a single `SidebarContent` component so the two presentations never diverge. Content/header padding scales `p-4 sm:p-6 lg:p-8`.

**Why this matters:** the original bug ("everything mixed together" on mobile) was a fixed always-visible `w-64` sidebar eating ~256px of a ~390px screen. A fixed sidebar with no mobile collapse is the usual culprit for a "messy" mobile layout here — check the shell before touching pages.

**Accessibility contract for the mobile drawer (required — code review will block without it):**
- Drawer element needs `role="dialog"`, `aria-modal="true"`, and an `aria-label`.
- Trigger button needs `aria-expanded` and `aria-controls` pointing at the drawer id.
- A visible close button, plus Escape-to-close.
- Focus management: move focus into the drawer on open, trap Tab within it, and restore focus to the trigger on close (do this in the open-effect's cleanup so route-change closes also restore focus).
- Lock `document.body.style.overflow` while open; restore in cleanup.
- Touch targets >= 44px (`min-h-[44px]` on nav links, generous hamburger padding).

**How to apply:** reuse this exact shell pattern for any new authenticated layout; if you add an overlay/drawer/modal anywhere, satisfy the same a11y contract up front rather than as a follow-up.
