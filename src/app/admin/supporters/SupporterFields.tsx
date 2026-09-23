type S = {
  name?: string; email?: string; phone?: string | null; address?: string | null; source?: string | null;
  tags?: string; notes?: string; status?: string; preferredChannel?: string;
  emailUpdates?: boolean; smsUpdates?: boolean; signalMember?: boolean;
};

export function SupporterFields({ s = {}, showEmail = false }: { s?: S; showEmail?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={s.name ?? ""} className="input" />
        </div>
        {showEmail && (
          <div>
            <label className="label" htmlFor="email">Email *</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" defaultValue={s.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="address">Mailing address</label>
          <input id="address" name="address" defaultValue={s.address ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="source">How we know them</label>
          <input id="source" name="source" defaultValue={s.source ?? ""} placeholder="Home church, college, family…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tags">Tags</label>
          <input id="tags" name="tags" defaultValue={s.tags ?? ""} placeholder="prayer team, board, family" className="input" />
          <p className="hint">Comma separated</p>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={s.status ?? "ACTIVE"} className="input">
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused (don&apos;t send updates)</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="preferredChannel">Prefers</label>
          <select id="preferredChannel" name="preferredChannel" defaultValue={s.preferredChannel ?? "EMAIL"} className="input">
            <option value="EMAIL">Email</option>
            <option value="SMS">Text</option>
            <option value="SIGNAL">Signal</option>
          </select>
        </div>
      </div>
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="emailUpdates" defaultChecked={s.emailUpdates ?? true} className="h-4 w-4 accent-brand" /> Email updates</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="smsUpdates" defaultChecked={s.smsUpdates ?? false} className="h-4 w-4 accent-brand" /> Text updates</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="signalMember" defaultChecked={s.signalMember ?? false} className="h-4 w-4 accent-brand" /> In Signal group</label>
      </fieldset>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={s.notes ?? ""} className="input" placeholder="Kids' names, prayer requests, last conversation…" />
      </div>
    </div>
  );
}
