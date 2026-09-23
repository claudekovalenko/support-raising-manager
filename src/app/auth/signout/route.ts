import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { APP_URL } from "@/lib/config";

export async function POST() {
  await signOut();
  return NextResponse.redirect(`${APP_URL}/`, { status: 303 });
}
