# Routing anatomy

## Route groups vs folders

```
app/
  (marketing)/            # route group - no URL segment
    page.tsx              # -> /
    about/page.tsx        # -> /about
  (app)/                  # a second group with its own layout
    dashboard/page.tsx    # -> /dashboard
```

A route group `(name)` lets two areas of the tree share or differ in layouts
while keeping URLs clean. The group name never appears in the path. Use it to
split a marketing shell from an authenticated app shell without nesting URLs.

## Dynamic routes

```
app/
  blog/
    [slug]/page.tsx       # /blog/hello-world
    [...slug]/page.tsx    # /blog/a/b/c  (catch-all)
    [[...slug]]/page.tsx  # optional catch-all (matches /blog too)
```

`[slug]` is required and matches one segment. `[...slug]` captures one or more.
`[[...slug]]` makes the whole segment optional. Choose based on whether the
parents path is valid without the dynamic part.

## Parallel routes

```
app/dashboard/
  @analytics/page.tsx
  @team/page.tsx
  page.tsx
```

A `@slot` renders independently and can be `Promise.all`-ed to stream
independently. It needs a `default.tsx` to satisfy the fallback for an
unmatched slot. Reach for it to show unrelated panels that load at their own
pace, not to split one logical page.

## Intercepting routes

`app/(.)photo/[id]/page.tsx` matches `/photo/[id]` from within its parent and can
soft-navigate a modal without changing the address-bar segment. It is the
"open a modal that keeps the underlying page in the URL" pattern.

## `generateStaticParams`

For a fully-static dynamic route, export every known path:

```tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}
```

Combine with `generateMetadata` for per-route SEO titles from the same data.
