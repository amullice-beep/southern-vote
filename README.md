# Southern Vote — installable PWA

A citizen's record book for the 2026 election across nine Southern states.
This is a Vite + React Progressive Web App: it runs as a website **and** can be
installed to a phone or desktop home screen, opening fullscreen like a native app.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 — live reload while you edit
```

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ locally to test the installable build
```

The build generates the service worker (`sw.js`), the web app manifest, and
precaches the app shell so it loads instantly and works offline (the deadline
clocks, maps info, and absentee rules all work with no connection; only the
address geocoder needs the network).

## Deploy (pick one — all free)

**Vercel**
```bash
npm i -g vercel
vercel            # follow prompts; it auto-detects Vite
```

**Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages**
1. In `vite.config.js`, set `base: "/<your-repo-name>/"`.
2. `npm run build`, then push the `dist/` folder to a `gh-pages` branch
   (or use the `gh-pages` npm package / a GitHub Action).

> A PWA **must be served over HTTPS** for install + service worker to work.
> All three hosts above give you HTTPS automatically. `localhost` is also
> treated as secure during development.

## How people install it

Once it's live at a URL, share that URL. Then:

- **iPhone/iPad (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** an install banner appears, or menu → *Install app*.
- **Desktop (Chrome/Edge):** an install icon appears in the address bar.

After installing, it launches fullscreen with the star icon, no browser bar —
the native-app feel, with none of the app-store cost or review.

## Updating

Because `registerType` is `autoUpdate`, when you redeploy a new build, installed
users get the update automatically the next time they open the app. Handy for
pushing a corrected deadline right before a registration cutoff.

## Reminder sign-ups (email/text)

The "Never miss a deadline" card has a built-in sign-up form. It's **inactive
until you give it a form backend** — the app is a static site, so it can't store
sign-ups or send messages by itself.

**Quick free setup (email, ~2 minutes) with Formspree:**

1. Create a free account at [formspree.io](https://formspree.io) and add a new form.
2. Copy its endpoint (looks like `https://formspree.io/f/abcxyz`).
3. Paste it into `REMINDER_ENDPOINT` near the top of `src/SouthernVote.jsx`,
   then `npm run build` and redeploy.

Now every sign-up is emailed to you (and stored in your Formspree dashboard).
The form posts JSON `{ email, phone, state }` plus a spam honeypot. Formspree is
used because its endpoint is safe to expose in client-side code — never put a
Mailchimp/Twilio API key in the app.

### Sending the reminder emails (Buttondown)

Formspree only *collects* sign-ups. To actually send reminder emails, the form
also subscribes each address into a [Buttondown](https://buttondown.com)
newsletter (when configured), which is where you write and send the reminders.

1. Create a free Buttondown account (its free tier covers a small list).
2. Find your username — your newsletter lives at `buttondown.com/<username>`.
3. Put it in `BUTTONDOWN_USERNAME` near the top of `src/SouthernVote.jsx`, then
   `npm run build` and redeploy.

Now each sign-up is subscribed into Buttondown **tagged by state** (e.g.
`Georgia`), so before a deadline you can send a reminder to just that state's
voters from the Buttondown dashboard. (Formspree still keeps the full record,
including phone numbers, for future SMS.) Buttondown's embed endpoint is
client-safe; never put a Buttondown *API key* in the app.

**Text (SMS)** reminders still need a paid sender (Twilio) plus a small
serverless function + scheduler — not included here.

### Automated sending (no manual dashboard work)

Instead of composing each reminder by hand in Buttondown, a scheduled job can
send them for you. [`scripts/send-reminders.js`](scripts/send-reminders.js)
reads the deadlines in [`src/data/states.js`](src/data/states.js) — the same
data the app shows — and, when a deadline is a set number of days away, creates
and sends a Buttondown email scoped to that state's tag. A GitHub Actions cron
([`.github/workflows/reminders.yml`](.github/workflows/reminders.yml)) runs it
daily, so nothing depends on which host serves the site.

**Setup (one time):**

1. In Buttondown → *Settings → Programming → API*, copy your **API key**.
2. In your GitHub repo → *Settings → Secrets and variables → Actions → New
   repository secret*, add `BUTTONDOWN_API_KEY` with that value. (The API key is
   secret — it lives only in CI, never in the app, unlike the client-safe embed
   username above.)

That's it. The workflow fires daily at ~13:00 UTC and emails each state's
subscribers when one of its deadlines is **14, 7, or 1 day** away.

**Try it safely first:** run it locally in dry-run mode — it contacts the API
read-only and just logs what it *would* send:

```bash
npm run reminders                       # dry run, default lead days (14,7,1)
REMINDER_LEAD_DAYS=120 npm run reminders # dry run, pretend a deadline is 120d out
BUTTONDOWN_API_KEY=xxx npm run reminders:send   # real send (also needs SEND=1, set by the script)
```

You can also trigger the workflow by hand from the **Actions** tab
(*Send deadline reminders → Run workflow*); leave **send** empty for a dry run,
or set it to `1` to send for real.

**How it stays safe:**

- **Idempotent** — each (state, deadline, lead-day) makes a deterministic
  subject line; before sending, the script checks Buttondown for that subject
  and skips if it already exists. A double cron fire or manual re-run won't
  double-send.
- **Dry-run by default** — real sends require both `BUTTONDOWN_API_KEY` and
  `SEND=1` (the scheduled job sets `SEND=1` automatically).
- **Tunable** — `REMINDER_LEAD_DAYS` (e.g. `"30,14,7,3,1"`) and `APP_URL`
  override the defaults.

> First live send: confirm in the Buttondown dashboard that the email targeted
> the right tag. Buttondown's tag filter matches subscribers by tag name (e.g.
> `Georgia`), which is exactly how the sign-up form tags them — but it's worth
> eyeballing the first one.

## Project layout

```
index.html              app entry
vite.config.js          Vite + PWA config (manifest, icons, caching)
src/
  main.jsx              mounts the app, registers the service worker
  SouthernVote.jsx      the app itself
  index.css             base/global styles
  data/
    states.js           states + deadlines + links (shared by app and sender)
scripts/
  send-reminders.js     scheduled Buttondown sender (uses src/data/states.js)
.github/workflows/
  deploy.yml            build + deploy to GitHub Pages
  reminders.yml         daily cron that runs the reminder sender
public/
  favicon.svg           icons (star + ledger frame identity)
  pwa-192.png, pwa-512.png, pwa-512-maskable.png, apple-touch-icon.png
```

## A note on the data

Deadlines, redistricting status, and absentee rules were accurate to mid-2026
and link to each Secretary of State's official page, which always governs.
Before each election, re-verify the dates in `src/data/states.js` against those
official sources and redeploy. (That one file feeds both the app's countdowns
and the automated reminder emails, so a correction there fixes both.)
