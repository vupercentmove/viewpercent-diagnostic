import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-session";

/** 로그인 자체에 쓰이는 경로 — 여기까지 막으면 로그인이 불가능해진다 */
const PUBLIC_PATHS = ["/admin/login", "/api/admin/auth"];

async function isAuthed(request: NextRequest) {
  return verifyAdminSessionToken(
    request.cookies.get("admin_auth")?.value,
    process.env.ADMIN_SESSION_SECRET
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (await isAuthed(request)) return NextResponse.next();

  // API는 로그인 화면 HTML 대신 401 JSON을 돌려준다 (fetch 호출자가 파싱 가능하도록)
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
