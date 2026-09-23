import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { importSupporters } from "../actions";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/supporters" className="text-sm text-muted">← Supporters</Link>
      <h1 className="h-section">Import contacts</h1>
      <div className="card space-y-4">
        <p>Upload a <strong>.csv</strong> file (export one from Google Contacts, Excel, Mailchimp, or your sending organization).</p>
        <p className="text-sm text-muted">
          Columns we recognize (any order): <code>email</code> (required), <code>name</code> or <code>first name</code> + <code>last name</code>,{" "}
          <code>phone</code>, <code>address</code>, <code>source</code>, <code>tags</code>, <code>notes</code>, <code>amount</code>, <code>interval</code>{" "}
          (monthly / quarterly / annual / one_time).
        </p>
        <p className="text-sm text-muted">Existing contacts are matched by email — we fill in missing details but never overwrite what&apos;s there. Imported contacts get email updates only.</p>
        {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Please choose a CSV file.</p>}
        <form action={importSupporters} className="space-y-4">
          <input type="file" name="file" accept=".csv,text/csv" required className="input" />
          <SubmitButton pendingText="Importing…">Import</SubmitButton>
        </form>
      </div>
    </div>
  );
}
