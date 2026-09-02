---
name: nextjs-app-router-conventions
description: Use when scaffolding, reviewing, or modifying Next.js App Router projects. Enforces server/client component boundaries, routing conventions, data-fetching patterns, and cache/revalidation discipline for a Next.js 15 App Router codebase.
license: MIT
compatible_agents: claude-code, claude-desktop, cursor, gemini-cli
---

# Next.js App Router Conventions

Use this skill whenever you touch a Next.js App Router project (Next.js 13+,
especially 15). It exists so a codebase never drifts into the default-next-app
shape: everything a client component, every route a `page.tsx` with no thought,
data fetched blindly, no cache strategy.

## When it applies

- Scaffolding a new `app/` directory, route group, or layout.
- Reviewing a PR that adds a page or a data fetch.
- Deciding whether a component belongs on the server or the client.
- Debugging a stale cache or a "hydration mismatch" you don't understand.

Skip it for non-App-Router projects (a Pages Router app, plain React, or anything
not using `next/fetch`-style data loading).

---

## Server vs client: the default is server

App Router components are **server components by default**. You do not opt in to
server; you opt in to client. This is the single most violated convention.

```tsx
// ✅ Server component (no directive) - the default
export default function Page() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

```tsx
// ❌ Wrong: `'use client'` on a component that needs no interactivity
"use client";
export default function Page() { … }
```

Add `"use client"` only when a component genuinely needs a browser API, state,
or an event handler. If a leaf is interactive, keep it **isolated**: a
`"use client"` leaf that receives server-rendered props is the right shape, not a
whole page flipped client.

**Interactive leaf pattern:**

```tsx
// page.tsx (server)
import { Counter } from "./counter";

export default async function Page() {
  const data = await getData();
  return <Counter initial={data.count} />;
}
```

```tsx
// counter.tsx (client only)
"use client";
import { useState } from "react";

export function Counter({ initial }: { initial: number }) {
  const [n, setN] = useState(initial);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

Keep the fast-moving client surface small and at the leaves.

---

## Routing conventions

- `app/{route}/page.tsx` - the route's UI. `loading.tsx` for the fallback,
  `error.tsx` for the error boundary (Client Component, optional `reset`).
- `app/{route}/layout.tsx` - shared shell for a route and its children.
- `app/{route}/route.ts` - the route handler (API) for a route. Use it for the
  HTTP surface; do not reach for an API route when a server action or server
  component will do.
- `app/{route}/not-found.tsx` - scoped 404 for that segment.
- `app/{route}/template.tsx` - re-mounts on navigation (fresh state per visit).
  Use only when you need re-mount; `layout.tsx` keeps state across navigations.
- `app/layout.tsx` - the root layout. It requires `<html>` and `<body>` tags and
  is **not** re-rendered across navigations.

**Route groups** use `(name)` and do not affect the URL. They exist to keep the
structure clean while sharing a layout. A route group does **not** create a URL
segment.

**Dynamic segments** use `[slug]` (required) and `[...slug]` (catch-all). Access
params in server components via `props.params` (a Promise in Next 15 - `await
params`), not via a global `useParams()` that looks like it works server-side.

### Params and searchParams are async in Next 15

In Next.js 15, `params` and `searchParams` passed to `page.tsx` / `layout.tsx` are
**Promises**. Await them:

```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // …
}
```

---

## Data fetching

### Server components: `await` directly

In an async server component, fetch is natural and you don't need a hook:

```tsx
export default async function Post({ id }: { id: string }) {
  const res = await fetch(`https://api.example.com/posts/${id}`);
  if (!res.ok) throw new Error("Failed to load post");
  const post = await res.json();
  return <article>{post.title}</article>;
}
```

### Client components: use a library, not a raw `useEffect` fetch

If data must load on the client, use `use` (for a promise created server-side or
in a shared module) or a real data library (`@tanstack/react-query`). Avoid the
"`useEffect` + `useState` + loading flag" triple unless it's truly a one-off.

```tsx
"use client";
import { use } from "react";

export function Post({ postPromise }: { postPromise: Promise<Post> }) {
  const post = use(postPromise);
  return <article>{post.title}</article>;
}
```

### Cache / revalidation discipline

- `fetch` inside a server component is cached by default in Next 15* and
  de-duplicated. You control revalidation, not the framework's defaults you never
  set.
- Use `unstable_cache` or the `cache` import for expensive, generic data
  transformations you want to share across requests.
- Use `revalidateTag` / `revalidatePath` via **server actions** when a mutation
  should refresh the view, rather than a client router refresh that hides the
  server call.
- The `"use cache"` / `cached` directive is the forward path in newer Next; keep
  an eye on it but don't mix it inadvertently with plain `fetch` caching.

\* The `fetch` cache default changed across versions and reflips in Next 15 with
dynamic APIs. Decide per-request, don't assume the old 30-second global default.

---

## Strict-mode conventions

- **Never import server-only code into a client component.** A module that
  imports `server-only`, reads env vars at module scope, or touches `fs` /
  `process` must stay on the server. Use a `"server-only"` banner in shared
  modules that must not be pulled client-side.
- **Keep `"use client"` boundaries happy:** a client component can import a server
  component only if it passes it as `children` (serialized boundary), never by
  direct import.
- **Metadata:** export a `metadata` object or use `generateMetadata` from server
  components. `generateMetadata` accepts `params` (a Promise, `await` it) and
  returns the right route metadata for SEO.

## References

- `references/data-fetching.md` - cache and revalidation modes in depth.
- `references/routing.md` - route groups, parallel routes, intercepting routes.
