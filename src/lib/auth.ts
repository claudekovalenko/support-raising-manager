import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { adminEmails, APP_URL } from "./config";
import { sendEmail } from "./messaging";

const SESSION_COOKIE = "srm_session";
const SESSION_DAYS = 90;
const LOGIN_TOKEN_MINUTES = 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Creates the user if needed and emails them a one-click sign-in link. */
export async function sendLoginLink(rawEmail: string, next = "/account") {
  const email = normalizeEmail(rawEmail);

  // Basic throttle: at most 5 links per email per 15 minutes.
  const recent = await db.loginToken.count({
    where: { email, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } },
  });
  if (recent >= 5) return;

  const token = randomToken();
  await db.loginToken.create({
    data: {
      email,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60 * 1000),
    },
  });

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const url = `${APP_URL}/auth/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(safeNext)}`;
  await sendEmail({
    to: email,
    subject: "Your sign-in link",
    text: `Click to sign in:\n\n${url}\n\nThis link expires in ${LOGIN_TOKEN_MINUTES} minutes. If you didn't request it, you can ignore this email.`,
    html: `<p>Click the button below to sign in.</p><p><a href="${url}" style="display:inline-block;background:#1f4d3a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Sign in</a></p><p style="color:#666;font-size:13px">This link expires in ${LOGIN_TOKEN_MINUTES} minutes. If you didn't request it, you can ignore this email.</p>`,
  });
}

/** Consumes a login token and starts a session. Returns the user or null. */
export async function verifyLoginToken(token: string) {
  const record = await db.loginToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await db.loginToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  const isAdmin = adminEmails().includes(record.email);
  const user = await db.user.upsert({
    where: { email: record.email },
    create: { email: record.email, role: isAdmin ? "ADMIN" : "SUPPORTER" },
    update: isAdmin ? { role: "ADMIN" } : {},
  });

  const sessionToken = randomToken();
  await db.session.create({
    data: {
      tokenHash: sha256(sessionToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: APP_URL.startsWith("https://"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return user;
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/account");
  return user;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}
