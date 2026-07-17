# StudySpace Monorepo

StudySpace is a seat-reservation platform connecting students with self-study libraries/reading rooms.

## Structure

- `apps/web`: Next.js 15 frontend
- `apps/api`: Node.js & Express API with Socket.io & Prisma
- `packages/shared`: Shared types, validators, and Zod schemas
- `packages/ui`: Shared React component library
- `packages/typescript-config`: Shared compiler options
- `packages/eslint-config`: Shared linting guidelines

## Development

Install dependencies:
```bash
pnpm install
```

Run dev servers:
```bash
pnpm dev
```
