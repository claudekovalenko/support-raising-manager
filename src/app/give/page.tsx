import { PublicShell } from "@/components/PublicShell";
import { ProgressBar } from "@/components/ProgressBar";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { stripeConfigured } from "@/lib/config";
import { monthlyCommitted } from "@/lib/stats";
import { GiveForm } from "./GiveForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Give" };

export default async function GivePage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const [s, user, committed, sp] = await Promise.all([getSettings(), getCurrentUser(), monthlyCommitted(), searchParams]);
  return (
    <PublicShell>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow mb-3">Partner with us</p>
          <h1 className="h-display mb-5">Join the team that sends us</h1>
          <p className="mb-8 text-lg text-muted">{s.mission}</p>
          <div className="card mb-6">
            <ProgressBar current={committed} goal={s.monthlyGoalCents} />
          </div>
          {s.givingInstructions && (
            <div className="card bg-sand/40">
              <h2 className="mb-2 font-semibold">Other ways to give</h2>
              <p className="whitespace-pre-line text-sm text-muted">{s.givingInstructions}</p>
            </div>
          )}
        </div>
        <div className="card">
          {sp.canceled && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Payment was canceled — nothing was charged.</p>}
          <GiveForm
            stripeEnabled={stripeConfigured()}
            defaults={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }}
          />
        </div>
      </div>
    </PublicShell>
  );
}
