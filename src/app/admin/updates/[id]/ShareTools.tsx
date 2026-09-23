"use client";
import { useState } from "react";

export function ShareTools({ signalText, url, signalGroupLink }: { signalText: string; url: string; signalGroupLink: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: signalText });
      } catch {
        /* user dismissed */
      }
    } else copy(signalText, "signal");
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Signal doesn&apos;t allow apps to post into groups, so this gives you the text ready to paste. On your phone, <strong>Share</strong> opens the share sheet — pick Signal and your group.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={share} className="btn-primary">Share…</button>
        <button type="button" onClick={() => copy(signalText, "signal")} className="btn-secondary">{copied === "signal" ? "Copied ✓" : "Copy message"}</button>
        <button type="button" onClick={() => copy(url, "link")} className="btn-secondary">{copied === "link" ? "Copied ✓" : "Copy link"}</button>
        {signalGroupLink && <a href={signalGroupLink} target="_blank" rel="noopener" className="btn-ghost">Open Signal group ↗</a>}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted">Preview message</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-cream p-3 text-xs whitespace-pre-wrap">{signalText}</pre>
      </details>
    </div>
  );
}
