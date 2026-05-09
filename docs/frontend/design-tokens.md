# Design Tokens

# Purpose

This document defines the concrete design tokens for the platform.
These values are the single source of truth for all visual properties.

The design system (see `design-system.md`) defines the philosophy and rules.
This document defines the actual CSS values, Tailwind configuration, and custom properties.

---

# Color Tokens

## Light Mode

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8f9fa;
  --color-bg-tertiary: #f1f3f5;
  --color-bg-elevated: #ffffff;
  --color-bg-overlay: rgba(0, 0, 0, 0.4);

  /* Surfaces / Cards */
  --color-surface-default: #ffffff;
  --color-surface-hover: #f8f9fa;
  --color-surface-active: #f1f3f5;
  --color-surface-disabled: #f1f3f5;

  /* Text */
  --color-text-primary: #11181c;
  --color-text-secondary: #687076;
  --color-text-tertiary: #889096;
  --color-text-disabled: #c1c8cd;
  --color-text-inverse: #ffffff;
  --color-text-link: #0068d6;

  /* Borders */
  --color-border-default: #dfe3e6;
  --color-border-muted: #e9ecef;
  --color-border-strong: #c1c8cd;
  --color-border-focus: #0068d6;

  /* Accent / Brand */
  --color-accent-primary: #0068d6;
  --color-accent-hover: #0053b3;
  --color-accent-active: #004199;
  --color-accent-subtle: rgba(0, 104, 214, 0.08);

  /* Semantic */
  --color-success: #18794e;
  --color-success-subtle: rgba(24, 121, 78, 0.08);
  --color-warning: #cc7b16;
  --color-warning-subtle: rgba(204, 123, 22, 0.08);
  --color-danger: #dc2828;
  --color-danger-subtle: rgba(220, 40, 40, 0.08);
  --color-info: #0068d6;
  --color-info-subtle: rgba(0, 104, 214, 0.08);
}
```

## Dark Mode

```css
.dark {
  /* Backgrounds */
  --color-bg-primary: #0d0d0d;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;
  --color-bg-elevated: #1a1a1a;
  --color-bg-overlay: rgba(0, 0, 0, 0.6);

  /* Surfaces / Cards */
  --color-surface-default: #141414;
  --color-surface-hover: #1a1a1a;
  --color-surface-active: #242424;
  --color-surface-disabled: #1a1a1a;

  /* Text */
  --color-text-primary: #ededed;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-text-disabled: #4a4a4a;
  --color-text-inverse: #0d0d0d;
  --color-text-link: #5096e9;

  /* Borders */
  --color-border-default: #2a2a2a;
  --color-border-muted: #1f1f1f;
  --color-border-strong: #3a3a3a;
  --color-border-focus: #5096e9;

  /* Accent / Brand */
  --color-accent-primary: #5096e9;
  --color-accent-hover: #6aaaf0;
  --color-accent-active: #3b82e8;
  --color-accent-subtle: rgba(80, 150, 233, 0.12);

  /* Semantic */
  --color-success: #3cb179;
  --color-success-subtle: rgba(60, 177, 121, 0.12);
  --color-warning: #e09e3b;
  --color-warning-subtle: rgba(224, 158, 59, 0.12);
  --color-danger: #e5484d;
  --color-danger-subtle: rgba(229, 72, 77, 0.12);
  --color-info: #5096e9;
  --color-info-subtle: rgba(80, 150, 233, 0.12);
}
```

---

# Spacing Scale

Based on an 8px grid system.

```css
:root {
  --spacing-0: 0px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-7: 28px;
  --spacing-8: 32px;
  --spacing-9: 36px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-14: 56px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;
}
```

## Tailwind Spacing Extension

```ts
// tailwind.config.ts
extend: {
  spacing: {
    "sidebar": "260px",
    "topbar": "52px",
    "panel": "320px",
    "explorer-max": "1200px",
  }
}
```

---

# Border Radius

```css
:root {
  --radius-none: 0px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}
```

## Usage Rules

| Component | Radius |
|---|---|
| Button | `radius-xl` (18px) |
| Input / Select | `radius-xl` (18px) |
| Card | `radius-2xl` (24px) |
| Modal / Dialog | `radius-2xl` (24px) |
| Dropdown / Popover | `radius-xl` (18px) |
| Tabs trigger | `radius-xl` (18px) |
| Badge / Tag | `radius-full` (9999px) |
| Toast | `radius-xl` (18px) |
| Sidebar items | `radius-md` (10px) |
| Explorer items (grid) | `radius-lg` (14px) |
| Explorer items (list) | `radius-md` (10px) |
| Avatar | `radius-full` (9999px) |

---

# Shadows

```css
:root {
  --shadow-none: none;

  /* Subtle elevation */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);

  /* Card / Dropdown */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06),
               0 2px 8px rgba(0, 0, 0, 0.04);

  /* Modal / Dialog */
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08),
               0 0 0 1px rgba(0, 0, 0, 0.04);

  /* Popover / Elevated card */
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1),
               0 0 0 1px rgba(0, 0, 0, 0.04);

  /* Dragging */
  --shadow-xl: 0 12px 48px rgba(0, 0, 0, 0.16),
               0 0 0 1px rgba(0, 0, 0, 0.06);

  /* Focus ring */
  --shadow-focus: 0 0 0 3px rgba(0, 104, 214, 0.4);
}

.dark {
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3),
               0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4),
               0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5),
               0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-xl: 0 12px 48px rgba(0, 0, 0, 0.6),
               0 0 0 1px rgba(255, 255, 255, 0.08);
  --shadow-focus: 0 0 0 3px rgba(80, 150, 233, 0.4);
}
```

---

# Typography

## Font Family

```css
:root {
  --font-sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
               "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code",
               Menlo, Monaco, Consolas, monospace;
}
```

## Font Size Scale

```css
:root {
  --text-xs:   0.75rem;   /* 12px */  line-height: 1rem;      /* 16px */
  --text-sm:   0.8125rem; /* 13px */  line-height: 1.25rem;   /* 20px */
  --text-base: 0.875rem;  /* 14px */  line-height: 1.375rem;  /* 22px */
  --text-md:   0.9375rem; /* 15px */  line-height: 1.5rem;    /* 24px */
  --text-lg:   1.0625rem; /* 17px */  line-height: 1.625rem;  /* 26px */
  --text-xl:   1.25rem;   /* 20px */  line-height: 1.75rem;   /* 28px */
  --text-2xl:  1.5rem;    /* 24px */  line-height: 2rem;      /* 32px */
  --text-3xl:  1.875rem;  /* 30px */  line-height: 2.25rem;   /* 36px */
}

/* Use px values because the design uses 8px baseline */
/* 13px and 15px are NOT used; the scale is: 12, 14, 17, 20, 24, 30 */
/* 14px is the base body text size — optimized for desktop readability */
```

## Font Weight

```css
:root {
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

## Usage Rules

| Context | Size | Weight | Color |
|---|---|---|---|
| Page title (sidebar header) | `text-lg` (17px) | `semibold` | `text-primary` |
| Section heading | `text-xl` (20px) | `semibold` | `text-primary` |
| Body text | `text-base` (14px) | `regular` | `text-primary` |
| Secondary text (metadata) | `text-sm` (13px) | `regular` | `text-secondary` |
| Tertiary text (timestamps, help) | `text-xs` (12px) | `regular` | `text-tertiary` |
| File names (grid) | `text-base` (14px) | `medium` | `text-primary` |
| File names (list) | `text-base` (14px) | `medium` | `text-primary` |
| Button labels | `text-base` (14px) | `medium` | `text-primary` or `text-inverse` |
| Modal title | `text-xl` (20px) | `semibold` | `text-primary` |
| Badge / Tag | `text-xs` (12px) | `medium` | `text-primary` |
| Sidebar items | `text-base` (14px) | `medium` | `text-primary` |
| Breadcrumb | `text-sm` (13px) | `regular` | `text-secondary` |
| Command palette input | `text-lg` (17px) | `regular` | `text-primary` |
| Code / monospace | `text-sm` (13px) | `regular` | `text-primary` |

---

# Iconography

## Icon Library

**Lucide Icons** — all icons must come from this library.

## Icon Sizes

```css
:root {
  --icon-xs: 12px;
  --icon-sm: 16px;
  --icon-md: 20px;
  --icon-lg: 24px;
  --icon-xl: 32px;
}
```

## Usage Rules

| Context | Size |
|---|---|
| Inline with text (buttons, links) | `icon-sm` (16px) |
| Standalone (sidebar items, menu items) | `icon-md` (20px) |
| Large (empty states, hero sections) | `icon-lg` (24px) |
| Extra large (file type previews) | `icon-xl` (32px) |
| Within badges/tags | `icon-xs` (12px) |

---

# Animation Tokens

## Duration

```css
:root {
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 250ms;
  --duration-enter: 300ms;
}
```

## Easing

```css
:root {
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);  /* Material standard */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);         /* Enter */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);          /* Exit */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);    /* Both */
}
```

## Usage

| Animation | Duration | Easing |
|---|---|---|
| Modal open | `duration-normal` (200ms) | `ease-out` |
| Modal close | `duration-fast` (150ms) | `ease-in` |
| Dropdown open | `duration-fast` (150ms) | `ease-out` |
| Hover color change | `duration-instant` (100ms) | `ease-default` |
| Toast enter | `duration-normal` (200ms) | `ease-out` |
| Toast exit | `duration-fast` (150ms) | `ease-in` |
| Drag feedback | `duration-instant` (100ms) | `ease-out` |
| Page transition | `duration-fast` (150ms) | `ease-out` |
| Skeleton pulse | 1.5s infinite | `ease-in-out` |

---

# Breakpoints

```css
/* Mobile first */
:root {
  --screen-sm: 640px;
  --screen-md: 768px;
  --screen-lg: 1024px;
  --screen-xl: 1280px;
  --screen-2xl: 1536px;
}
```

| Breakpoint | Target |
|---|---|
| `< 768px` | Mobile (sidebar hidden, full-width explorer) |
| `768px - 1024px` | Tablet (collapsible sidebar, adjusted grid columns) |
| `> 1024px` | Desktop (full layout, sidebar + panel + explorer) |

---

# Tailwind Configuration

```ts
// tailwind.config.ts
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          elevated: "var(--color-bg-elevated)",
          overlay: "var(--color-bg-overlay)",
        },
        surface: {
          DEFAULT: "var(--color-surface-default)",
          hover: "var(--color-surface-hover)",
          active: "var(--color-surface-active)",
          disabled: "var(--color-surface-disabled)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          link: "var(--color-text-link)",
        },
        border: {
          DEFAULT: "var(--color-border-default)",
          muted: "var(--color-border-muted)",
          strong: "var(--color-border-strong)",
          focus: "var(--color-border-focus)",
        },
        accent: {
          DEFAULT: "var(--color-accent-primary)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          subtle: "var(--color-accent-subtle)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          subtle: "var(--color-success-subtle)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          subtle: "var(--color-warning-subtle)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          subtle: "var(--color-danger-subtle)",
        },
      },
      spacing: {
        sidebar: "260px",
        topbar: "52px",
        panel: "320px",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["13px", "20px"],
        base: ["14px", "22px"],
        md: ["15px", "24px"],
        lg: ["17px", "26px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "36px"],
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        focus: "var(--shadow-focus)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in var(--duration-fast) var(--ease-out)",
        "fade-out": "fade-out var(--duration-fast) var(--ease-in)",
        "slide-in-up": "slide-in-up var(--duration-normal) var(--ease-out)",
        "slide-in-down": "slide-in-down var(--duration-normal) var(--ease-out)",
        "scale-in": "scale-in var(--duration-normal) var(--ease-out)",
      },
    },
  },
}
```

---

# shadcn/ui Theme Override

```css
/* apps/web/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-bg-primary text-text-primary;
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

---

# References

- [Design System](design-system.md)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [Tailwind CSS Configuration](https://tailwindcss.com/docs/configuration)
- [Lucide Icons](https://lucide.dev/)
