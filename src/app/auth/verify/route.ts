import { NextResponse, type NextRequest } from "next/server";
import { verifyLoginToken } from "@/lib/auth";
import { APP_URL } from "@/lib/config";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const nextParam = req.nextUrl.searchParams.get("next") ?? "";
  const user = token ? await verifyLoginToken(token) : null;
  if (!user) return NextResponse.redirect(`${APP_URL}/login?error=expired`);
  const fallback = user.role === "ADMIN" ? "/admin" : "/account";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") && nextParam !== "/account" ? nextParam : fallback;
  return NextResponse.redirect(`${APP_URL}${next}`);
}
