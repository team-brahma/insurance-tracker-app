# UI & Styling Guidelines

This document outlines standard policies for styling, component libraries (shadcn/ui, MUI), and Accessibility (a11y) rules.

---

## 1. Styling Stack & Utility Classes

- **Tailwind CSS First**: Use Tailwind utility classes for all component-level styles.
- **No Inline Styles**: Never use inline `style={{ ... }}` attributes unless dynamic/variable calculation is required (e.g. dynamic width/progress or transition values).
- **Theme Tokens**: Refer to the Tailwind theme design system variables configured in the global styles. Avoid raw, non-tokenized hex codes.

---

## 2. Component Libraries

We support both shadcn/ui and MUI under specific guidelines:

- **shadcn/ui (Tailwind-based primitives)**:
  - Default library for common UI items (buttons, inputs, dialogues, tabs, dropdowns).
  - Copy components into `apps/mobile/src/components/ui/` or `@repo/ui` and wrap them cleanly to match our design system.
- **Material UI (MUI)**:
  - **Exception Only**: Only use MUI components for advanced complex components that would be too expensive or complex to build manually (such as calendar grid schedules, massive responsive tables, or tree views).
  - When importing MUI components, ensure they do not conflict with global Tailwind CSS resets.

---

## 3. Accessibility (a11y) Standards

We design with accessibility in mind by default:

- **Semantic HTML**: Always use appropriate tags (`<main>`, `<section>`, `<nav>`, `<article>`, `<header>`, `<footer>`, `<button>`, `<label>`). Avoid nested `<div>` wrappers where semantic options are viable.
- **ARIA Roles & Labels**: Ensure interactive custom elements have correct `role` and `aria-*` tags. Add `aria-label` or `aria-labelledby` where text content is missing or non-obvious.
- **Keyboard Support**: All interactive components (buttons, dropdowns, inputs) must support keyboard navigation (e.g. `Tab`, `Enter`, `Escape`).
- **Form Accessibility**: Every input field must have an explicitly linked `<label>` tag using `htmlFor`.

---

## 4. Responsive & Mobile-First Design

- **Mobile-First**: Always start styling for the smallest viewport size and scale up using Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
- Ensure interfaces adapt properly to touch inputs and different screen form factors (iOS, Android, Mobile Web).
