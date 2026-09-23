import { PublicShell } from "@/components/PublicShell";
import { SubmitButton } from "@/components/SubmitButton";
import { sendLoginLink } from "@/lib/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

export const metadata = { title: "Sign in" };

async function requestLink(formData: FormData) {
  "use server";
  const email = z.string().email().safeParse(formData.get("email"));
  const next = String(formData.get("next") || "/account");
  if (!email.success) redirect(`/login?error=email&next=${encodeURIComponent(next)}`);
  await sendLoginLink(email.data, next);
  redirect(`/login?sent=1&next=${encodeURIComponent(next)}`);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next || "/account";
  return (
    <PublicShell>
      <div className="container-page flex justify-center py-16">
        <div className="card w-full max-w-md">
          {sp.sent ? (
            <div className="text-center">
              <div className="mb-4 text-4xl">✉️</div>
              <h1 className="h-section mb-3">Check your email</h1>
              <p className="text-muted">
                We sent you a sign-in link. Tap it on this device to continue. It expires in 30 minutes.
              </p>
              <a href={`/login?next=${encodeURIComponent(next)}`} className="btn-ghost mt-6">Use a different email</a>
            </div>
          ) : (
            <>
              <h1 className="h-section mb-2">Sign in</h1>
              <p className="mb-6 text-muted">No password needed — we&apos;ll email you a secure link.</p>
              {sp.error === "email" && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Please enter a valid email.</p>}
              {sp.error === "expired" && (
                <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">That link expired or was already used. Request a new one below.</p>
              )}
              <form action={requestLink} className="space-y-4">
                <input type="hidden" name="next" value={next} />
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com" />
                </div>
                <SubmitButton className="btn-primary w-full" pendingText="Sending…">Email me a sign-in link</SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
