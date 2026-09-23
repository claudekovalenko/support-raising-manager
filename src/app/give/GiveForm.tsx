"use client";
import { useActionState, useState } from "react";
import { give, type GiveState } from "./actions";

const PRESETS = [25, 50, 100, 250, 500];
const INTERVAL_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Yearly" },
  { value: "ONE_TIME", label: "One time" },
];

export function GiveForm({
  stripeEnabled,
  defaults,
}: {
  stripeEnabled: boolean;
  defaults: { name: string; email: string; phone: string };
}) {
  const [state, action, pending] = useActionState<GiveState, FormData>(give, {});
  const [amount, setAmount] = useState("50");
  const [interval, setInterval] = useState("MONTHLY");
  const [method, setMethod] = useState(stripeEnabled ? "STRIPE" : "MANUAL");
  const [channel, setChannel] = useState("EMAIL");

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="label">How often?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INTERVAL_OPTIONS.map((o) => (
            <label key={o.value} className={`btn cursor-pointer border ${interval === o.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-white"}`}>
              <input type="radio" name="interval" value={o.value} checked={interval === o.value} onChange={() => setInterval(o.value)} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Amount</legend>
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setAmount(String(p))}
              className={`btn border ${amount === String(p) ? "border-brand bg-brand-soft text-brand" : "border-line bg-white"}`}
            >
              ${p}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">$</span>
          <input name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input pl-7" aria-label="Custom amount" required />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" defaultValue={defaults.name} required autoComplete="name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={defaults.email} required autoComplete="email" className="input" />
        </div>
      </div>

      <fieldset>
        <legend className="label">How would you like to get our updates?</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "EMAIL", l: "Email" },
            { v: "SMS", l: "Text" },
            { v: "SIGNAL", l: "Signal group" },
          ].map((o) => (
            <label key={o.v} className={`btn cursor-pointer border ${channel === o.v ? "border-brand bg-brand-soft text-brand" : "border-line bg-white"}`}>
              <input type="radio" name="channel" value={o.v} checked={channel === o.v} onChange={() => setChannel(o.v)} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="phone">Phone {channel === "EMAIL" && <span className="font-normal text-muted">(optional)</span>}</label>
        <input id="phone" name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" className="input" required={channel !== "EMAIL"} placeholder="+1 555 123 4567" />
      </div>

      <fieldset>
        <legend className="label">Payment</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {stripeEnabled && (
            <label className={`card cursor-pointer p-4! ${method === "STRIPE" ? "border-brand ring-2 ring-brand/20" : ""}`}>
              <input type="radio" name="method" value="STRIPE" checked={method === "STRIPE"} onChange={() => setMethod("STRIPE")} className="sr-only" />
              <span className="block font-semibold">Card or bank (online)</span>
              <span className="text-sm text-muted">Secure checkout. Change or cancel anytime.</span>
            </label>
          )}
          <label className={`card cursor-pointer p-4! ${method === "MANUAL" ? "border-brand ring-2 ring-brand/20" : ""}`}>
            <input type="radio" name="method" value="MANUAL" checked={method === "MANUAL"} onChange={() => setMethod("MANUAL")} className="sr-only" />
            <span className="block font-semibold">Check, transfer, or through our sending org</span>
            <span className="text-sm text-muted">Record your commitment; we&apos;ll share how to give.</span>
          </label>
        </div>
      </fieldset>

      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "One moment…" : method === "STRIPE" ? "Continue to secure payment" : "Commit to give"}
      </button>
    </form>
  );
}
