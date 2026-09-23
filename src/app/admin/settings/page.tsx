import { SubmitButton } from "@/components/SubmitButton";
import { Photo } from "@/components/Photo";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { updateSettings } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const [hero, family] = await Promise.all([
    s.heroPhotoId ? db.photo.findUnique({ where: { id: s.heroPhotoId } }) : null,
    s.familyPhotoId ? db.photo.findUnique({ where: { id: s.familyPhotoId } }) : null,
  ]);
  const areas = [...s.focusAreas, ...Array(Math.max(0, 4 - s.focusAreas.length)).fill({ title: "", description: "" })].slice(0, 6);

  return (
    <form action={updateSettings} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="h-section">Website</h1>
          <p className="text-sm text-muted">Your mission, vision, and story — what visitors see on the public site.</p>
        </div>
        <SubmitButton>Save</SubmitButton>
      </div>
      {sp.saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved — your site is updated.</p>}
      {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      <section className="card space-y-4">
        <h2 className="font-semibold">The basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="siteName">Site name</label><input id="siteName" name="siteName" defaultValue={s.siteName} className="input" /></div>
          <div><label className="label" htmlFor="tagline">Tagline</label><input id="tagline" name="tagline" defaultValue={s.tagline} className="input" /></div>
        </div>
        <div><label className="label" htmlFor="heroText">Welcome message</label><textarea id="heroText" name="heroText" rows={3} defaultValue={s.heroText} className="input" /></div>
        <div>
          <label className="label" htmlFor="heroPhoto">Main photo</label>
          {hero && <Photo fileName={hero.fileName} alt="" className="mb-2 h-32 rounded-xl object-cover" />}
          <input id="heroPhoto" name="heroPhoto" type="file" accept="image/*" className="input" />
          {hero && <label className="mt-1 flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="remove_heroPhoto" /> Remove</label>}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Mission & vision</h2>
        <div><label className="label" htmlFor="mission">Mission</label><textarea id="mission" name="mission" rows={3} defaultValue={s.mission} className="input" /><p className="hint">What you do and why — 2–3 sentences.</p></div>
        <div><label className="label" htmlFor="vision">Vision</label><textarea id="vision" name="vision" rows={3} defaultValue={s.vision} className="input" /><p className="hint">The future you&apos;re working toward.</p></div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Focus areas</h2>
        <p className="text-sm text-muted">The areas you&apos;re working in. Leave a title blank to hide it.</p>
        {areas.map((a: { title: string; description: string }, i: number) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <input name={`focusTitle${i}`} defaultValue={a.title} placeholder={`Area ${i + 1} title`} className="input" />
            <input name={`focusDesc${i}`} defaultValue={a.description} placeholder="Short description" className="input" />
          </div>
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Your family</h2>
        <div><label className="label" htmlFor="familyBio">About us</label><textarea id="familyBio" name="familyBio" rows={5} defaultValue={s.familyBio} className="input" /></div>
        <div>
          <label className="label" htmlFor="familyPhoto">Family photo</label>
          {family && <Photo fileName={family.fileName} alt="" className="mb-2 h-32 rounded-xl object-cover" />}
          <input id="familyPhoto" name="familyPhoto" type="file" accept="image/*" className="input" />
          {family && <label className="mt-1 flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="remove_familyPhoto" /> Remove</label>}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Giving</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="monthlyGoal">Monthly support goal ($)</label><input id="monthlyGoal" name="monthlyGoal" inputMode="decimal" defaultValue={(s.monthlyGoalCents / 100).toString()} className="input" /></div>
          <div><label className="label" htmlFor="contactEmail">Public contact email</label><input id="contactEmail" name="contactEmail" type="email" defaultValue={s.contactEmail} className="input" /></div>
        </div>
        <div>
          <label className="label" htmlFor="givingInstructions">Other ways to give</label>
          <textarea id="givingInstructions" name="givingInstructions" rows={4} defaultValue={s.givingInstructions} className="input" />
          <p className="hint">Checks, bank transfer, or a link to your sending organization&apos;s giving page. Shown on the Give page.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Signal</h2>
        <div>
          <label className="label" htmlFor="signalGroupLink">Signal group invite link</label>
          <input id="signalGroupLink" name="signalGroupLink" defaultValue={s.signalGroupLink} placeholder="https://signal.group/#..." className="input" />
          <p className="hint">Shown to supporters who choose Signal, so they can join the group themselves.</p>
        </div>
      </section>

      <div className="text-right"><SubmitButton>Save</SubmitButton></div>
    </form>
  );
}
