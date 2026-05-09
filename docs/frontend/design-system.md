# Design System

# Philosophy

The interface must feel:
- modern
- polished
- lightweight
- responsive
- desktop-like
- professional

The visual language should prioritize:
- clarity
- hierarchy
- spacing consistency
- smooth interactions
- accessibility

Avoid:
- clutter
- excessive decoration
- visual noise
- inconsistent spacing
- chaotic animations

The experience should resemble:
- Linear
- Raycast
- Notion
- Dropbox
- Google Drive
- VSCode

---

# Core Design Principles

## 1. Consistency

Consistency is mandatory.

The same interaction must always:
- look the same
- behave the same
- animate the same

Avoid:
- inconsistent paddings
- inconsistent radii
- inconsistent hover states
- inconsistent shadows

---

## 2. Hierarchy

Visual hierarchy must be obvious.

Prioritize:
- spacing
- typography
- contrast
- grouping

Avoid:
- oversized text
- excessive colors
- unnecessary borders
- unclear layouts

---

## 3. Accessibility

All components must support:
- keyboard navigation
- visible focus states
- screen readers
- semantic HTML
- dark mode

Never remove focus outlines without replacement.

---

## 4. Motion

Animations must:
- guide attention
- improve clarity
- reinforce hierarchy

Animations must NEVER:
- distract users
- feel random
- happen simultaneously everywhere

Animation flow should:
- occur top-to-bottom
- follow reading order
- preserve visual organization

---

# Color System

## Philosophy

Colors should:
- feel neutral
- avoid oversaturation
- prioritize content visibility

Accent colors should be used sparingly.

---

## Required Theme Support

The application must support:
- light mode
- dark mode

Theme switching must:
- feel instant
- avoid flashing
- preserve contrast accessibility

---

## Semantic Colors

Never use hardcoded colors directly.

Use semantic tokens:

```txt
bg-background
bg-card
text-primary
text-secondary
border-default
border-muted
accent-primary
danger
warning
success
```

---

# Spacing System

Use an 8px spacing system.

Allowed spacing scale:

```txt
2px
4px
8px
12px
16px
24px
32px
40px
48px
64px
```

Avoid arbitrary spacing values.

---

# Border Radius

Consistency is mandatory.

## Radius Scale

```txt
sm  = 6px
md  = 10px
lg  = 14px
xl  = 18px
2xl = 24px
```

---

## Usage Rules

Buttons:
- rounded-xl

Cards:
- rounded-2xl

Inputs:
- rounded-xl

Dropdowns:
- rounded-xl

Modals:
- rounded-2xl

Avoid mixing random radius values.

---

# Shadows

Shadows must be:
- soft
- subtle
- layered

Avoid:
- harsh shadows
- excessive blur
- strong opacity

Shadows should reinforce:
- depth
- elevation
- focus

---

# Typography

# Philosophy

Typography should:
- maximize readability
- preserve hierarchy
- avoid visual overload

Avoid:
- giant text
- too many font weights
- inconsistent line heights

---

## Font Usage

Primary font:
- Inter

Fallbacks:
- system-ui
- sans-serif

---

## Typography Scale

```txt
xs
sm
base
lg
xl
2xl
3xl
```

Avoid arbitrary font sizes.

---

## Font Weight Rules

```txt
400 = regular text
500 = emphasized text
600 = headings
700 = important emphasis
```

Avoid excessive bold text.

---

# Layout System

# Philosophy

Layouts must:
- breathe
- feel organized
- avoid overcrowding

Whitespace is important.

---

## Container Widths

Use consistent max widths.

Avoid:
- extremely wide text blocks
- edge-to-edge clutter

---

## Grid Rules

Use:
- CSS Grid
- Flexbox

Avoid:
- deeply nested layouts
- layout hacks

---

# Component Rules

## Buttons

Buttons must:
- have clear hierarchy
- have visible hover states
- have active states
- have disabled states

Required variants:
- primary
- secondary
- ghost
- destructive

---

## Inputs

Inputs must:
- have visible focus states
- support keyboard navigation
- support validation states

Required states:
- default
- focused
- error
- disabled

---

## Modals

Modals must:
- trap focus
- support ESC closing
- animate smoothly
- avoid excessive nesting

Avoid:
- modal inside modal
- giant modal forms

---

## Dropdowns

Dropdowns must:
- support keyboard navigation
- support search when needed
- have smooth positioning

---

## Tables

Tables must:
- support virtualization
- support selection
- support sorting
- support keyboard navigation

Large datasets must remain performant.

---

# File Explorer UX

The file explorer is a core experience.

It must feel:
- fast
- intuitive
- desktop-like

---

## Required Features

- single click selection
- double click open
- multi-select
- shift selection
- ctrl/cmd selection
- keyboard navigation
- drag and drop
- context menus

---

## Selection Rules

Selected items must:
- remain visually clear
- support bulk actions
- preserve accessibility contrast

---

# Motion System

# Animation Duration

Allowed durations:

```txt
100ms
150ms
200ms
250ms
300ms
```

Avoid slow animations.

---

# Animation Curves

Preferred:
- ease-out
- cubic-bezier smooth transitions

Avoid:
- bounce animations
- elastic motion
- chaotic transitions

---

# Animation Hierarchy

Animations should:
- follow interface hierarchy
- happen sequentially
- preserve readability

Avoid:
- everything animating simultaneously
- random delayed items
- inconsistent directions

---

# Loading States

All async operations require:
- skeletons
- progress indicators
- optimistic feedback

Avoid:
- layout shifts
- blank loading screens

---

# Empty States

Empty states must:
- explain context
- guide users
- avoid dead ends

Include:
- actionable suggestions
- upload actions
- creation actions

---

# Error States

Errors must:
- be understandable
- be actionable
- preserve layout consistency

Avoid generic:
"Something went wrong"

---

# Responsive Design

The application must support:
- desktop
- tablet
- mobile

Desktop experience is priority.

---

# Dark Mode Rules

Dark mode must:
- preserve contrast
- reduce eye strain
- avoid pure black backgrounds

Use layered surfaces.

Avoid:
- neon colors
- excessive saturation

---

# Icons

Use:
- Lucide icons

Icons must:
- remain consistent
- match text alignment
- avoid visual clutter

---

# Accessibility Rules

Required:
- focus visibility
- keyboard navigation
- semantic HTML
- aria labels
- contrast compliance

Never sacrifice accessibility for aesthetics.

---

# Forbidden UI Practices

Never:
- use inline styles
- use random spacing
- mix visual styles
- create inaccessible components
- remove focus outlines
- overanimate interfaces
- create cluttered dashboards
- use inconsistent shadows
- use arbitrary colors

---

# Design Review Checklist

Before shipping UI:

- Is spacing consistent?
- Is hierarchy clear?
- Is dark mode correct?
- Is keyboard navigation working?
- Is accessibility preserved?
- Are animations subtle?
- Is loading state implemented?
- Is error state implemented?
- Is mobile behavior acceptable?
- Does the interface feel cohesive?