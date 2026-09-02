# Data fetching, cache, and revalidation

## Two caches that collide

Next has two caches that people routinely confuse:

1. **The data cache** - `fetch` results cached on the server (or the
   `"use cache"` directive). This is what `revalidateTag` / `revalidatePath`
   clears, and what `next: { revalidate }` controls.
2. **The client-side router cache** - the prefetched RSC payload that makes
   navigations feel instant. It is separate, lives in the browser, and is NOT
   cleared by server-side `revalidateTag`.

When a UI looks "stale" after a mutation, the fix is often both: revalidate on
the server **and** refresh the router (or set `router.refresh()`), because the
router cache in the browser still holds the old segment.

## Choosing a revalidation mode

| Situation | Do this |
|---|---|
| Widely-shared, near-static content (a docs page) | `fetch(url, { next: { revalidate: 3600 } })` - ISR-style, hourly |
| Per-request, highly-reactive data (a user's own cart) | `fetch(url, { cache: "no-store" })` - always fresh, never cached |
| Data you want to invalidate precisely after a write | Server action calls `revalidateTag("my-tag")` after the mutation |
| Heavily-derived, request-independent data | Wrap in `cache()` from `react` - dedupe per render, not per fetch |

## `cache()` from React vs `fetch` caching

`import { cache } from "react"` memoizes a function across the same render pass.
It does **not** persist across requests like the data cache. Use it to avoid
re-running an expensive calculation or database call when two components on the
same server render need the same thing.

## Dynamic APIs and the whole-dynamic opt-out

The `cookies()`, `headers()`, `searchParams` (in a page that awaits them), and
`draftMode()` APIs all opt a route out of static rendering. A route using any of
these becomes dynamic, and the fetch cache behaves accordingly. If you see a page
that "should be static" running at request time, this is why - check you're not
pulling a dynamic API.

## Suspense primitives

- `loading.tsx` wraps a route segment in `<Suspense>` automatically.
- For a finer-grained stream, wrap a single leaf in `<Suspense fallback={…}>`
  inside a server component so the shell paints first and the heavy part streams.

## The `"use cache"` directive

Newer Next versions let you annotate a function `"use cache"` to opt that
function's return into the data cache with a granular per-call `revalidate`.
It is the forward path and replaces ad-hoc `fetch` cache config once you're on a
version that supports it. When adopting it, be explicit about the revalidate
window per call site and add a `cacheTag` if you'll need to invalidate it later.
