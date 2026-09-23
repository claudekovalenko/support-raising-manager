import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { SupporterFields } from "../SupporterFields";
import { createSupporter } from "../actions";

export default async function NewSupporterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/supporters" className="text-sm text-muted">← Supporters</Link>
      <h1 className="h-section">Add a supporter</h1>
      {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Please enter a valid email address.</p>}
      <form action={createSupporter} className="card space-y-6">
        <SupporterFields showEmail />
        <div className="border-t border-line pt-5">
          <h2 className="mb-3 font-semibold">Commitment <span className="font-normal text-muted">(optional)</span></h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="amount">Amount ($)</label>
              <input id="amount" name="amount" inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="interval">Frequency</label>
              <select id="interval" name="interval" className="input">
                <option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="ANNUAL">Yearly</option><option value="ONE_TIME">One time</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="method">Gives via</label>
              <select id="method" name="method" className="input">
                <option value="OTHER">Sending org / other</option><option value="CHECK">Check</option><option value="BANK">Bank transfer</option><option value="ZELLE">Zelle</option>
              </select>
            </div>
          </div>
        </div>
        <SubmitButton>Add supporter</SubmitButton>
      </form>
    </div>
  );
}
