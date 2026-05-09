# PROJECT RULES

## Project Vision

This project is a modern cloud storage platform inspired by:
- Google Drive
- Dropbox
- Nextcloud
- Finder
- VSCode

The platform must prioritize:
- desktop-like UX
- performance
- accessibility
- scalability
- security
- consistency
- polished frontend interactions

This is NOT a CRUD dashboard project.

The product experience must feel:
- fluid
- responsive
- keyboard-driven
- highly interactive
- visually refined

---

# Core Principles

## 1. UX First

All interfaces must prioritize:
- usability
- clarity
- responsiveness
- smooth interactions
- minimal friction

Avoid:
- cluttered layouts
- excessive modals
- confusing navigation
- inconsistent spacing
- poor loading states

---

## 2. Desktop-Like Experience

The application should behave similarly to:
- Finder
- Windows Explorer
- Google Drive
- VSCode

Required:
- keyboard navigation
- context menus
- drag and drop
- multi-selection
- optimistic UI
- fast interactions

---

## 3. Accessibility

Accessibility is mandatory.

All features must support:
- keyboard navigation
- screen readers
- focus visibility
- semantic HTML
- ARIA compliance

Never ship inaccessible components.

---

## 4. Security First

Security is not optional.

All systems must consider:
- RBAC
- input validation
- CSRF protection
- XSS prevention
- secure cookies
- rate limiting
- secure file sharing
- audit logging

Never trust frontend permissions.

---

# Technical Rules

## TypeScript

Strict TypeScript is mandatory.

Forbidden:
- any
- unknown unchecked casts
- untyped API responses

Required:
- shared types
- runtime validation
- typed APIs
- typed database access

---

## Validation

All external input must be validated.

Required:
- Zod validation
- API schema validation
- upload validation

Never trust:
- query params
- request bodies
- frontend state

---

## Frontend Rules

Frontend stack:
- Next.js App Router
- TailwindCSS
- shadcn/ui
- Framer Motion
- TanStack Query
- Zustand

Required:
- dark mode
- responsive design
- loading states
- error states
- empty states
- optimistic updates

Forbidden:
- inline styles
- inconsistent spacing
- duplicated components
- hardcoded colors
- inaccessible interactions

---

## Design System

The design system is mandatory.

All UI must use:
- design tokens
- spacing scale
- typography scale
- shared animations
- shared shadows
- shared radius

Avoid visual inconsistency.

---

## State Management

Server state:
- TanStack Query

Client UI state:
- Zustand

Avoid:
- unnecessary global state
- prop drilling
- duplicated cache logic

---

## Backend Rules

Backend responsibilities:
- authentication
- RBAC
- storage orchestration
- file metadata
- sharing
- audit logs

All business logic must live in backend services.

Forbidden:
- frontend business rules
- direct storage access from frontend
- duplicated authorization logic

---

## Storage Rules

Storage must be abstracted.

Never directly depend on R2 APIs.

Required:
- StorageProvider abstraction
- provider isolation
- signed URL support
- multipart upload support

The system must support future providers:
- S3
- MinIO
- Backblaze
- Wasabi

---

## RBAC Rules

Never check roles directly.

Forbidden:
if (user.role === "admin")

Required:
can(user, "files.delete")

Permissions must be:
- granular
- composable
- backend validated

---

## API Rules

All APIs must:
- validate input
- validate output
- return typed responses
- handle errors consistently

Required:
- pagination
- structured errors
- audit-safe responses

---

## Performance Rules

Performance is critical.

Required:
- virtualization
- lazy loading
- code splitting
- optimistic updates
- memoization when necessary

Avoid:
- unnecessary rerenders
- oversized client bundles
- blocking UI

---

## Animation Rules

Animations must:
- feel smooth
- feel subtle
- improve UX

Avoid:
- excessive motion
- chaotic animations
- random transitions

Animations should:
- follow interface hierarchy
- occur top-to-bottom
- preserve visual clarity

---

## Sharing Rules

All sharing systems must support:
- expiration
- revocation
- password protection
- readonly access
- auditability

External access must be isolated from internal permissions.

---

## Logging & Audit

Critical actions must generate audit logs:
- uploads
- deletions
- sharing
- permission changes
- login events

Logs must be structured and queryable.

---

## Definition of Done

A feature is complete only if:
- typed
- validated
- tested
- documented
- accessible
- responsive
- dark mode compatible
- keyboard accessible
- secure
- production-ready

---

## Forbidden Architecture Decisions

Never:
- bypass RBAC
- duplicate business logic
- hardcode permissions
- tightly couple frontend/backend
- directly expose storage providers
- create inaccessible UI
- use inconsistent naming
- create giant components
- ignore loading/error states

---

## Naming Conventions

Use consistent terminology.

Required terms:
- FileObject
- Folder
- ShareLink
- Workspace
- WorkspaceMember
- StorageProvider
- Permission
- Role

Never invent alternative names for existing concepts.

---

## Documentation Rules

All important features must include:
- feature spec
- API contract
- permission requirements
- UX rules
- edge cases

Architecture decisions must be documented using ADRs.