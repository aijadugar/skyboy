// docs.skyboy.in serves the docs page at its root. skyboy.in is unchanged.
// The old hosted catalog MCP is not part of the notifier site.

import { NextRequest, NextResponse } from "next/server";

const DOCS_HOST = "docs.skyboy.in";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];

  if (host === DOCS_HOST && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/docs";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
