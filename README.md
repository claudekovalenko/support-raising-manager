# Support Raising Manager

A support-raising website and management app for a family on mission, installable on your phone as a PWA:

- **A public website** with your mission, vision, focus areas, family story, photos, updates, and giving page.
- **Supporter accounts**: partners sign in with an emailed link (no password). From there they can change, pause, or stop their gift, see their giving history, and choose how you reach them (email, text, Signal).
- **Your dashboard at `/admin`**:
  - **Overview**: progress toward your monthly goal, active partners, money committed and received, and a reminder when you haven't sent an update in 7 days.
  - **Supporters**: contacts, notes, tags, how you know each person, commitments, gifts, and which updates each person received. You can import and export CSV.
  - **Updates**: each week starts from a template (story, praise, prayer, what's next) and can include photos. One click publishes it to the site and sends it by email and text. It also gives you ready-to-paste text for your Signal group.
  - **Finances**: money received per month compared with your goal, commitments by payment method, and a "check in with" list of offline givers who have had no gift recorded in 45 days. You can export gifts as CSV.
  - **Website**: edit all public text and photos. No code needed.

## Run it locally

```bash
npm install
cp .env.example .env         # then set ADMIN_EMAILS to your email
npm run setup                # creates the database + your admin account
npm run db:seed -- --demo    # optional: sample supporters to click around with
npm run dev
```

Open http://localhost:3000/login and enter your admin email. **Until email is connected, the sign-in link (and every email and text) is printed in the terminal.** Open that link to sign in.

## Connecting the real services

Each service is optional. Without it, the app still runs.

| What | Service | `.env` keys | Without it |
|---|---|---|---|
| Emails (sign-in links, updates) | [Resend](https://resend.com) (free tier: 3,000/mo) | `RESEND_API_KEY`, `EMAIL_FROM` | Printed in the server log |
| Online card/bank giving | [Stripe](https://stripe.com) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pledges are recorded, and you log gifts by hand |
| Text messages | [Twilio](https://twilio.com) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Printed in the server log |

**Stripe webhook:** in the Stripe Dashboard → Developers → Webhooks, add `https://YOUR-DOMAIN/api/stripe/webhook` with these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. To test locally, run `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Also turn on the Customer Portal (Settings → Billing → Customer portal) so supporters can update their card.

> **Nonprofit / tax-deductibility note:** if you raise support through a sending organization or 501(c)(3), gifts may need to go through *their* system to be tax-deductible. In that case, leave Stripe off. Put their giving link in **Website → Other ways to give**, and use this app to track commitments and log the gifts they report to you.

**Signal:** Signal has no official API for posting to groups. On a published update, **Share…** opens your phone's share sheet with the message ready for Signal, or you can use **Copy message**. Put your group invite link in **Website → Signal** so supporters who pick Signal can join the group themselves.

## Deploying

The simplest option is a host with a persistent disk, which keeps SQLite and uploaded photos as they are. Examples: [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io), or a small VPS.

```bash
npm run build && npm run db:push && npm start
```

Set `APP_URL` to your real `https://` domain. Mount a volume for the database file and for `uploads/` (or set `UPLOAD_DIR` to a path on the volume).

To use **Postgres** instead (for example Supabase or Neon, which Vercel-style hosting needs), change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma` and point `DATABASE_URL` at it. On serverless hosts, photos also need object storage; replace `src/lib/uploads.ts` with S3, R2, or Supabase Storage.

## Install as an app

When the site is live on https, open `/admin` on your phone:
- **iPhone:** Share → Add to Home Screen.
- **Android:** Chrome menu → Install app.

The home-screen icon has shortcuts for "Write this week's update" and "Supporters".

## Tech

Next.js 15 (App Router, server actions) · React 19 · Prisma · Tailwind CSS 4 · Stripe · Resend · Twilio.

- Code lives in `src/`.
- Messaging logic is in `src/lib/messaging.ts`.
- Giving logic is in `src/lib/stripe*.ts`.
- Sign-in is in `src/lib/auth.ts`.
