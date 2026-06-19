#!/usr/bin/env node
/* =========================================================================
   SOUTHERN VOTE — automated reminder sender.

   Runs on a schedule (see .github/workflows/reminders.yml). For each of the
   nine states, it looks at the deadlines in src/data/states.js and, when a
   deadline is exactly one of the configured "lead days" away (e.g. 14, 7, or
   1 day out), creates and sends a reminder email through Buttondown — targeted
   to just that state's subscribers using the per-state tag the sign-up form
   applies (e.g. "Georgia").

   Why this design:
   - Same data as the app. It imports STATES from the shared module, so a
     deadline correction in one place updates both the app and the emails.
   - Idempotent. Each (state, deadline, lead) pair produces a deterministic
     subject line; before sending, the script checks Buttondown for an email
     with that subject and skips if it already exists. So a manual re-run or a
     double cron fire won't double-send.
   - Safe by default. Pass nothing and it runs in DRY-RUN mode (logs what it
     WOULD send, contacts the API read-only). Real sends require both
     BUTTONDOWN_API_KEY and SEND=1.

   Environment:
     BUTTONDOWN_API_KEY   required for any API call (kept in CI secrets)
     SEND=1               actually create+send; otherwise dry-run
     REMINDER_LEAD_DAYS   comma list of days-before to fire (default "14,7,1")
     APP_URL              link included in the email (default the prod URL)
     REMINDER_TZ          IANA tz used to compute "today" (default America/New_York)
   ========================================================================= */

import { STATES, STATE_ORDER } from "../src/data/states.js";

const API = "https://api.buttondown.email/v1";
const API_KEY = process.env.BUTTONDOWN_API_KEY || "";
const SEND = process.env.SEND === "1";
const LEAD_DAYS = (process.env.REMINDER_LEAD_DAYS || "14,7,1")
  .split(",")
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n >= 0);
const APP_URL = process.env.APP_URL || "https://amullice-beep.github.io/southern-vote/";
const TZ = process.env.REMINDER_TZ || "America/New_York";

/* ----- date helpers -------------------------------------------------------
   Deadlines are authored as local wall-clock times with an explicit offset.
   We only care about the calendar DATE, so we compare the deadline's date to
   "today" in REMINDER_TZ. Using UTC-midnight for both sides sidesteps DST. */

function ymdToUTC(y, m, d) {
  return Date.UTC(y, m - 1, d);
}

// "Today" as a {y,m,d} in the configured timezone.
function todayInTZ(tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
  return { y: get("year"), m: get("month"), d: get("day") };
}

// Whole days from today (in TZ) until a deadline's calendar date.
function daysUntil(isoDate) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map((n) => parseInt(n, 10));
  const t = todayInTZ(TZ);
  const deadlineUTC = ymdToUTC(y, m, d);
  const todayUTC = ymdToUTC(t.y, t.m, t.d);
  return Math.round((deadlineUTC - todayUTC) / 86400000);
}

function prettyDate(isoDate) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map((n) => parseInt(n, 10));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ymdToUTC(y, m, d)));
}

/* ----- email content ------------------------------------------------------ */

function leadPhrase(days) {
  if (days === 0) return "is TODAY";
  if (days === 1) return "is TOMORROW";
  return `is in ${days} days`;
}

function buildSubject(state, deadline, days) {
  // Deterministic — used both as the visible subject and the dedupe key.
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return `[${state.name}] ${deadline.label} ${when} — ${prettyDate(deadline.date)}`;
}

function buildBody(state, deadline, days) {
  return [
    `You signed up with **Southern Vote** for ${state.name} election reminders.`,
    "",
    `### ⏰ ${deadline.label} ${leadPhrase(days)}`,
    `**${prettyDate(deadline.date)}**`,
    "",
    "**What to do now:**",
    `- Register or check your registration: [${state.name} voter lookup](${state.mvp})`,
    `- Request a mail / absentee ballot: [official page](${state.absenteeUrl})`,
    `- ${state.absentee}`,
    "",
    `Your live countdowns, maps, and polling info are always in the app:`,
    `${APP_URL}`,
    "",
    `Official source (this always governs): [${state.name} Secretary of State](${state.sos})`,
    "",
    "— Southern Vote",
  ].join("\n");
}

/* ----- Buttondown API ----------------------------------------------------- */

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Buttondown ${options.method || "GET"} ${path} → ${res.status}: ${text}`);
  }
  return json;
}

// Has an email with this exact subject already been created? (dedupe guard)
async function subjectAlreadyExists(subject) {
  const data = await api(`/emails?subject=${encodeURIComponent(subject)}`);
  const results = Array.isArray(data) ? data : data.results || [];
  return results.some((e) => e.subject === subject);
}

// Target subscribers carrying the state's tag (the sign-up form tags by name).
function tagFilter(stateName) {
  return {
    predicate: "and",
    groups: [],
    filters: [{ field: "subscriber.tags", operator: "contains", value: stateName }],
  };
}

async function createAndSend(state, deadline, days) {
  const subject = buildSubject(state, deadline, days);
  const body = buildBody(state, deadline, days);

  if (!SEND) {
    console.log(`  DRY-RUN would send → "${subject}"`);
    return "dry-run";
  }

  if (await subjectAlreadyExists(subject)) {
    console.log(`  skip (already sent) → "${subject}"`);
    return "skipped";
  }

  // Create as a draft first, then flip to about_to_send (Buttondown's safe
  // two-step send flow). filters scope it to this state's tag.
  const draft = await api("/emails", {
    method: "POST",
    body: JSON.stringify({
      subject,
      body,
      status: "draft",
      filters: tagFilter(state.name),
    }),
  });

  await api(`/emails/${draft.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "about_to_send" }),
  });

  console.log(`  SENT → "${subject}" (email ${draft.id})`);
  return "sent";
}

/* ----- main --------------------------------------------------------------- */

async function main() {
  console.log(
    `Southern Vote reminders — ${SEND ? "LIVE SEND" : "DRY RUN"} | ` +
      `lead days [${LEAD_DAYS.join(", ")}] | tz ${TZ}`
  );

  if (!API_KEY) {
    if (SEND) {
      console.error("BUTTONDOWN_API_KEY is required to send. Aborting.");
      process.exit(1);
    }
    console.log("(no BUTTONDOWN_API_KEY set — dedupe check skipped in dry run)");
  }

  const tally = { sent: 0, skipped: 0, "dry-run": 0 };
  let due = 0;

  for (const code of STATE_ORDER) {
    const state = STATES[code];
    for (const deadline of state.deadlines) {
      const days = daysUntil(deadline.date);
      if (!LEAD_DAYS.includes(days)) continue;
      due++;
      console.log(`${state.name}: "${deadline.label}" in ${days}d (${deadline.date.slice(0, 10)})`);
      try {
        // Dedupe needs the API key; in dry-run without a key we just log.
        const outcome = API_KEY || !SEND ? await createAndSend(state, deadline, days) : "skipped";
        tally[outcome] = (tally[outcome] || 0) + 1;
      } catch (err) {
        console.error(`  ERROR for ${state.name}/${deadline.id}: ${err.message}`);
        process.exitCode = 1;
      }
    }
  }

  if (due === 0) {
    console.log("No deadlines hit a lead-day threshold today. Nothing to send.");
  } else {
    console.log(
      `Done. ${due} deadline(s) matched — sent ${tally.sent}, skipped ${tally.skipped}, dry-run ${tally["dry-run"]}.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
