# SubPilot

> AI-powered subtitle translation tool with intelligent batching and multi-provider support.

## Project Overview

This is a **Next.js 16** application that translates subtitle files (SRT, VTT, ASS, LRC) using AI providers like Doubao, OpenAI, DeepSeek, etc.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS v4, Radix UI
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`)
- **Cache**: IndexedDB (via `idb`)

## Key Architecture

```
src/
├── app/page.tsx          # Main UI (single page)
├── app/api/translate/    # Unified API proxy
├── lib/engine/
│   ├── batcher.ts        # Core: Smart batching + concurrency
│   ├── cache.ts          # IndexedDB caching
│   └── translator.ts     # High-level orchestrator
├── lib/providers/        # AI provider adapters
│   ├── registry.ts       # Provider registry
│   ├── doubao.ts         # VolcEngine (Doubao)
│   └── ...
└── lib/parsers/          # Subtitle format parsers
```

## Critical Files

| File | Purpose |
|---|---|
| `src/lib/engine/batcher.ts` | Smart batching, concurrency control, context injection |
| `src/lib/providers/*.ts` | AI provider implementations |
| `src/app/api/translate/route.ts` | API proxy for AI calls |

## Code Conventions

1. **TypeScript only** - No JavaScript files
2. **Comments in Chinese** - Code comments use Chinese for clarity
3. **Provider pattern** - All AI providers implement the `Provider` interface
4. **Rate limiting** - Each provider has `RateLimitConfig` with `maxConcurrency`, `recommendedBatchSize`

## Common Tasks

### Adding a new AI Provider
1. Create `src/lib/providers/new-provider.ts`
2. Define `ProviderSchema` with UI fields
3. Implement `Provider` class
4. Add case in `src/app/api/translate/route.ts`
5. Export in `src/lib/providers/index.ts`

### Adjusting Translation Performance
- Modify `maxConcurrency` and `recommendedBatchSize` in provider's `rateLimit` config
- Smaller batches + higher concurrency = faster (for high-RPM APIs)

### Debugging Translation Issues
- Enable `debug: true` in `BatcherConfig`
- Check browser console for batch logs
- Check IndexedDB for cached results

## Testing

```bash
npm test          # Run vitest
npm run test:run  # Run once
```

## Development

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm start         # Start production server
```

## Deployment

- **Production URL**: https://subpilot.sumulige.com
- **Platform**: Vercel (auto-deploy on push to main)
- **GitHub Actions**: `.github/workflows/ci.yml` (lint + test), `.github/workflows/deploy.yml` (Vercel deploy)

## Documentation

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project memory for AI (this file) |
| `ARCHITECTURE.md` | Core logic explanation |
| `DEPLOYMENT.md` | Deployment guide (Vercel, Docker, VPS) |
| `README.md` | User-facing bilingual guide |
| `.claude/skills/` | Domain knowledge for AI maintenance |
