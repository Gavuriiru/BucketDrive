# Contributing

## Development Workflow

1. Pick an issue or create one describing the change
2. Create a branch: `feat/description`, `fix/description`, `docs/description`
3. Make your changes following the [Project Rules](PROJECT_RULES.md)
4. Run checks locally before pushing: `pnpm lint && pnpm typecheck && pnpm test:unit`
5. Push and open a PR against `main`
6. CI must pass before merge

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(explorer): add grid view with thumbnail previews
fix(upload): correct progress bar for multipart uploads
docs(api): document file endpoints with Zod schemas
chore(deps): update Drizzle to latest version
refactor(storage): extract R2 adapter to shared package
test(shares): add contract tests for share creation
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `style`, `ci`

## Code Standards

- **TypeScript strict** — no `any`, no unchecked casts
- **Zod validation** — all API boundaries must use shared Zod schemas
- **No inline styles** — use Tailwind classes or design tokens
- **Accessibility** — keyboard navigation, ARIA, visible focus states
- **Dark mode** — all components must work in both themes
- **Loading states** — every async interaction needs loading feedback
- **Error handling** — use the error catalog in [Error Codes](docs/architecture/error-codes.md)

### RBAC Rule

Never check roles directly:

```ts
// Forbidden
if (user.role === "admin") { ... }

// Required
if (can(user, "files.delete")) { ... }
```

### Storage Rule

Never access R2 directly outside the StorageProvider abstraction:

```ts
// Forbidden
r2.put(key, body)

// Required
storageProvider.upload({ key, body })
```

## Pull Requests

- One feature or fix per PR
- PR title must follow Conventional Commits format
- Include a description summarizing the change and the approach
- Reference related issues or ADRs
- CI must pass (lint + typecheck + tests)
- Prefer squash merge

## Documentation

When adding or changing features:
- Update relevant docs in `docs/`
- Add ADR in `docs/decisions/` for architectural decisions
- Keep the [README](README.md) table of contents accurate

## Testing

- Unit tests for all business logic (RBAC, validation, utilities)
- Contract tests for every API endpoint (success + error cases)
- E2E tests for critical user journeys

See [Testing Strategy](docs/architecture/testing-strategy.md) for details.

## Getting Help

Check the [Documentation](README.md#documentation) first.
For architecture questions, start with the [ADRs](docs/decisions/).

## Definition of Done

A feature is complete only when:
- Typed, validated, tested
- Accessible (keyboard + screen reader)
- Dark mode compatible
- Responsive (desktop priority)
- Documented
- Production-ready
