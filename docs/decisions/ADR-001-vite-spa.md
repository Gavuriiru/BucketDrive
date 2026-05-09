# ADR-001: Vite SPA vs Next.js App Router

## Status

Accepted

## Context

O BucketDrive é uma plataforma de armazenamento cloud que funciona como frontend para Cloudflare R2. A aplicação é puramente uma Single Page Application (SPA): não tem requisitos de SEO, não tem conteúdo público indexável, e toda a lógica de negócio reside no backend (Cloudflare Workers + Hono).

Os documentos iniciais do projeto referenciavam Next.js App Router como framework. Next.js é otimizado para Server-Side Rendering (SSR), Static Site Generation (SSG) e aplicações híbridas — capacidades que não agregam valor a este projeto.

### Características do projeto

- **Auth externo**: Better Auth roda no Worker, tokens JWT são validados no backend e renovados no cliente
- **UI desktop-like**: interações pesadas no cliente (drag & drop, context menus, seleção múltipla, atalhos de teclado)
- **Zero SEO**: sem páginas públicas indexáveis (share links são dinâmicos e protegidos)
- **Dados dinâmicos**: todos os dados vêm da API via TanStack Query, sem necessidade de pré-renderização

## Decision

**Usar Vite + React SPA em vez de Next.js App Router.**

Stack final do frontend:
- React 19 + TypeScript
- Vite como build tool e dev server
- TanStack Router para roteamento client-side
- Tailwind CSS v4 + shadcn/ui para estilização

## Alternatives Considered

### Next.js App Router
- **Prós**: estrutura de rotas file-based, Server Components, Image Optimization built-in
- **Contras**: overhead de SSR/SSG não utilizado, edge runtime constraints em Workers, bundle maior, complexidade de Server Components + Client Components boundary, hidratação desnecessária
- **Rejeitado porque**: o projeto é puramente uma SPA. A separação Server/Client Components adiciona atrito sem trazer benefício real.

### Vite SPA
- **Prós**: build rápido (esbuild/rollup), HMR instantâneo, bundle otimizado, sem SSR overhead, deploy trivial como arquivos estáticos no Cloudflare Pages, 100% client-side sem hidratação
- **Contras**: carregamento inicial maior que SSR (mitigado com code splitting e lazy loading)
- **Aceito porque**: alinhamento total com a natureza SPA do projeto, menor complexidade, melhor DX

### Outros (SvelteKit, SolidJS, Remix)
- **Rejeitados**: o ecossistema React + shadcn/ui oferece a melhor combinação de componentes, tipagem, e suporte da comunidade para o escopo do projeto.

## Consequences

### Positivas
- Build e HMR significativamente mais rápidos que Next.js
- Arquitetura mais simples: sem server components, sem hidratação, sem boundary `'use client'`/`'use server'`
- Deploy trivial: `vite build` → Cloudflare Pages static assets
- Bundle menor: sem React Server Components runtime
- Melhor integração com padrões SPA: Zustand global, TanStack Query cache, router client-side puro

### Negativas
- Sem SSR para share pages públicas (resolvido: Worker renderiza HTML mínimo para share links se necessário)
- Sem Image Optimization built-in (resolvido: Cloudflare Images ou transformação via Worker)
- Carregamento inicial completo do bundle JS (mitigado: code splitting por rota, lazy loading de features)

## References

- [Vite Documentation](https://vitejs.dev/)
- [TanStack Router](https://tanstack.com/router)
