# ADR-002: Better Auth como provedor de autenticação

## Status

Accepted

## Context

O BucketDrive precisa de autenticação com:
- OAuth social (GitHub, Google) e email/senha
- RBAC integrado (roles, organizations/workspaces)
- Sessões seguras (HTTPOnly cookies, rotação de token)
- Capacidade de rodar no Cloudflare Worker (serverless)
- Zero custo de infra extra (sem VPS adicional)
- Compatibilidade com D1 como banco de sessões e usuários

Alternativas consideradas: Logto, Cloudflare Zero Trust, Authentik, Zitadel, Clerk.

### Requisitos específicos

- Multi-workspace: um usuário pode pertencer a múltiplos workspaces com diferentes roles
- Mapeamento de roles para o sistema RBAC interno (can(user, "files.delete"))
- Sessões devem ser validadas no Worker a cada request autenticada
- Suporte a MFA no futuro
- Audit logging de eventos de autenticação

## Decision

**Usar Better Auth como provedor de autenticação.**

Better Auth é uma biblioteca TypeScript de autenticação que:
- Roda diretamente no Cloudflare Worker (zero infra extra)
- Persiste sessões e usuários no D1 via Drizzle ORM
- Suporta OAuth (GitHub, Google, etc.) e credenciais email/senha
- Possui plugin de organizações/workspaces com roles
- Fornece endpoints de API e callbacks que integram com Hono

## Architecture

```
Browser (SPA)
    ↓
Better Auth Client SDK (PKCE flow, session management)
    ↓
Hono Worker
    ↓
Better Auth handler (auth.api)
    ↓
D1 Database (users, sessions, accounts, workspaces, members)
```

### Validação de token em endpoints protegidos

```ts
// Middleware Hono
const session = await auth.api.getSession({ headers: c.req.raw.headers })
if (!session) return c.json({ error: "Unauthorized" }, 401)

// Extrair user e workspace context do session
const { user, workspaceId, role } = session
```

### Mapeamento Better Auth → RBAC interno

Better Auth gerencia: users, sessions, workspaces, member roles
RBAC interno gerencia: permissions granulares (files.read, shares.revoke, etc.)

O mapeamento funciona assim:
1. Better Auth resolve: usuário autenticado → workspace → role (owner/admin/editor/viewer)
2. Middleware de RBAC consulta as permissions associadas à role no D1
3. `can(user, "files.delete")` verifica se a role do usuário no workspace atual possui essa permissão

## Alternatives Considered

### Logto (self-hosted)
- **Prós**: RBAC built-in, UI admin completa, maduro
- **Contras**: precisa de VPS/Docker separado (~€5-15/mês), outro serviço para manter, latência extra entre Worker e Logto, validação via JWKS remoto
- **Rejeitado porque**: adiciona infra e custo operacional que podem ser eliminados com Better Auth

### Cloudflare Zero Trust / Access
- **Prós**: já no ecossistema Cloudflare, zero código de auth, OAuth providers built-in
- **Contras**: RBAC muito limitado (apenas claims de OAuth), sem controle granular de roles/workspaces, dependência do dashboard CF para configurar, difícil mapear para `can(user, "files.delete")`
- **Rejeitado porque**: não atende aos requisitos de RBAC granular e multi-workspace

### Authentik
- **Prós**: RBAC completo, policies, OIDC/SAML/LDAP
- **Contras**: pesado (~1GB RAM mínimo), complexo de configurar, Python (ecossistema diferente), requer VPS/Docker
- **Rejeitado porque**: peso operacional desproporcional ao escopo do projeto

### Zitadel
- **Prós**: IAM completo, multi-tenancy, RBAC avançado, cloud-native
- **Contras**: Go (ecossistema diferente), complexo para o escopo, free tier limitado
- **Rejeitado porque**: complexidade maior que o necessário

### Clerk
- **Prós**: ótima DX, componentes React prontos, RBAC built-in
- **Contras**: SaaS apenas (não self-hosted), vendor lock-in, custo por MAU
- **Rejeitado porque**: requisito de self-hosted e custo imprevisível por usuário ativo

## Consequences

### Positivas
- Zero infra extra: Better Auth roda dentro do Worker existente
- Tipagem TypeScript end-to-end (mesmo schema Drizzle para auth e dados)
- Controle total sobre o fluxo de autenticação (sem black box)
- D1 como banco unificado (auth + dados do app no mesmo lugar)
- Plugins de organização/workspace alinhados com o modelo multi-workspace do projeto

### Negativas
- Biblioteca mais nova que alternativas maduras (menos comunidade, documentação menor)
- Sem UI de admin de usuários built-in (precisaremos construir dashboards de gestão)
- Plugin de organizações ainda em evolução ativa
- Menos providers OAuth que Logto/Authentik (mas cobre GitHub + Google)

### Mitigações
- Manter o módulo de auth com abstração clara para trocar de provedor se necessário
- Contribuir com a comunidade Better Auth reportando issues
- Construir dashboards de admin como parte do escopo (já planejado)

## References

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth Organizations Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth Cloudflare Worker Guide](https://www.better-auth.com/docs/integrations/cloudflare)
