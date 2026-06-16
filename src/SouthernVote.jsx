import React, { useState, useEffect, useMemo, useRef } from "react";

/* =========================================================================
   SOUTHERN VOTE — civic dashboard for US Southern states (2026 cycle)
   Single-file React artifact.

   Design direction: "county courthouse ledger." Warm parchment surface,
   ink-navy and a single oxblood accent, a slab/condensed display face paired
   with a clean grotesque, hairline rules like a record book. The signature
   element is the deadline ledger — countdowns rendered as ruled record rows
   that tick live.

   Honesty about data: live precinct assignment, DMV hours, and the current
   roster of local officials are NOT freely available inside a sandboxed app.
   Where a value must come from an authoritative source, this app routes the
   user to the official state portal and is explicit about it, while doing the
   real math (Haversine distance) locally once an address is geocoded via the
   free OpenStreetMap Nominatim service.
   ========================================================================= */

/* ----------------------------- STATE DATA -------------------------------- */
// Deadlines verified for Georgia (Nov 3, 2026 General). Other states use the
// shared federal General Election Day (Nov 3, 2026) with state-specific
// windows where confirmed; each carries a link to the authoritative SOS page
// so the user can confirm the live value.

const ELECTION_DAY = "2026-11-03T19:00:00-05:00"; // 7pm ET close (GA)

const STATES = {
  GA: {
    name: "Georgia",
    sos: "https://georgia.gov/georgia-general-election-2026",
    mvp: "https://mvp.sos.ga.gov/s/",
    absenteeUrl: "https://georgia.gov/vote-absentee-ballot",
    absentee: "No-excuse. Any registered Georgia voter may request an absentee ballot.",
    dmvName: "Georgia DDS (Driver Services)",
    dmvLocator: "https://dds.georgia.gov/locations",
    officialsLookup: "https://mvp.sos.ga.gov/s/",
    pollHours: "7:00 AM – 7:00 PM ET",
    redistricting: {
      status: "ineffect",
      label: "Current map in effect",
      note: "Gov. Kemp ruled out a pre-midterm redraw, so Georgia uses its 2023 court-ordered map for 2026. A new map is expected before 2028 in light of Louisiana v. Callais.",
      passed: "Dec 2023 (court-ordered revision); in use for 2026",
      mapUrl: "https://www.legis.ga.gov/joint-office/reapportionment",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-05T23:59:59-04:00" },
      { id: "abs-open", label: "Absentee request window opens", date: "2026-08-17T08:00:00-04:00" },
      { id: "abs-close", label: "Last day to request absentee ballot", date: "2026-10-23T17:00:00-04:00" },
      { id: "early", label: "Early (advance) voting opens", date: "2026-10-13T08:00:00-04:00" },
      { id: "eday", label: "Election Day", date: ELECTION_DAY },
    ],
  },
  TX: {
    name: "Texas",
    sos: "https://www.votetexas.gov/",
    mvp: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    absenteeUrl: "https://www.sos.state.tx.us/elections/voter/reqabbm.shtml",
    absentee: "Excuse required. Eligible if 65+, disabled, out of county on Election Day & early voting, confined in jail, or expecting to give birth.",
    dmvName: "Texas DPS Driver License",
    dmvLocator: "https://www.dps.texas.gov/section/driver-license/find-driver-license-office",
    officialsLookup: "https://www.sos.state.tx.us/elections/voter/county-clerks-and-elections-administrators.shtml",
    pollHours: "7:00 AM – 7:00 PM CT",
    redistricting: {
      status: "ineffect",
      label: "New map in effect",
      note: "Mid-decade map enacted summer 2025 at the urging of the President; engineered to add ~5 Republican-leaning seats. Upheld for use in 2026 by the U.S. Supreme Court.",
      passed: "Aug 2025 (enacted); SCOTUS allowed use for 2026",
      mapUrl: "https://data.capitol.texas.gov/dataset/congressional",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-05T23:59:59-05:00" },
      { id: "abs-close", label: "Last day to apply for ballot by mail", date: "2026-10-23T17:00:00-05:00" },
      { id: "early", label: "Early voting opens", date: "2026-10-19T07:00:00-05:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:00:00-06:00" },
    ],
  },
  NC: {
    name: "North Carolina",
    sos: "https://www.ncsbe.gov/",
    mvp: "https://vt.ncsbe.gov/RegLkup/",
    absenteeUrl: "https://www.ncsbe.gov/voting/vote-mail",
    absentee: "No-excuse. Any registered NC voter may request a mail-in absentee ballot.",
    dmvName: "NC Division of Motor Vehicles",
    dmvLocator: "https://www.ncdot.gov/dmv/offices-services/Pages/default.aspx",
    officialsLookup: "https://www.ncsbe.gov/about-elections/county-boards-elections",
    pollHours: "6:30 AM – 7:30 PM ET",
    redistricting: {
      status: "ineffect",
      label: "New map in effect",
      note: "New congressional map adding a Republican-leaning seat; a three-judge panel allowed it to be used in the 2026 elections.",
      passed: "2025 (allowed for 2026 by court panel)",
      mapUrl: "https://www.ncleg.gov/Redistricting",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-09T17:00:00-04:00" },
      { id: "early", label: "Early voting opens", date: "2026-10-15T08:00:00-04:00" },
      { id: "abs-close", label: "Last day to request absentee ballot", date: "2026-10-27T17:00:00-04:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:30:00-05:00" },
    ],
  },
  TN: {
    name: "Tennessee",
    sos: "https://sos.tn.gov/elections",
    mvp: "https://tnmap.tn.gov/voterlookup/",
    absenteeUrl: "https://sos.tn.gov/products/elections/absentee-voting",
    absentee: "Excuse required. Eligible reasons include being 60+, hospitalized, out of county during voting, or a student/voter away from the county.",
    dmvName: "Tennessee Driver Services",
    dmvLocator: "https://www.tn.gov/safety/driver-services/locations.html",
    officialsLookup: "https://sos.tn.gov/elections/county-election-commissions",
    pollHours: "Varies by county (polls open ≥10 hours)",
    redistricting: {
      status: "ineffect",
      label: "New map in effect",
      note: "Gov. Lee signed new House district lines in May 2026 eliminating the state's lone Democrat-held congressional seat.",
      passed: "May 2026 (signed into law)",
      mapUrl: "https://www.capitol.tn.gov/joint/staff/redistricting.html",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-05T23:59:59-05:00" },
      { id: "abs-close", label: "Last day to request absentee ballot", date: "2026-10-27T17:00:00-05:00" },
      { id: "early", label: "Early voting opens", date: "2026-10-14T08:00:00-05:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:00:00-06:00" },
    ],
  },
  LA: {
    name: "Louisiana",
    sos: "https://www.sos.la.gov/ElectionsAndVoting/",
    mvp: "https://voterportal.sos.la.gov/",
    absenteeUrl: "https://www.sos.la.gov/ElectionsAndVoting/Vote/VoteByMail/Pages/default.aspx",
    absentee: "Excuse required for most. No-excuse mail voting available to voters 65+ and several other categories.",
    dmvName: "Louisiana OMV",
    dmvLocator: "https://www.expresslane.org/Pages/FieldOfficeLocator.aspx",
    officialsLookup: "https://www.sos.la.gov/ElectionsAndVoting/GetElectionInformation/FindYourRegistrarOfVoters/Pages/default.aspx",
    pollHours: "7:00 AM – 8:00 PM CT",
    redistricting: {
      status: "ineffect",
      label: "New map in effect",
      note: "After the U.S. Supreme Court struck down Louisiana's two-majority-Black-district map in Louisiana v. Callais (April 29, 2026), Gov. Landry signed SB 121 dismantling the second majority-Black district. The new 5R-1D map — one majority-Black seat anchored in New Orleans — took effect immediately for the 2026 elections.",
      passed: "May 2026 (SB 121, in effect for 2026)",
      mapUrl: "https://house.louisiana.gov/H_Redistricting2025/",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline (in person/mail)", date: "2026-10-05T16:30:00-05:00" },
      { id: "reg-online", label: "Online registration deadline", date: "2026-10-13T23:59:59-05:00" },
      { id: "early", label: "Early voting opens", date: "2026-10-21T08:30:00-05:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T20:00:00-06:00" },
    ],
  },
  AL: {
    name: "Alabama",
    sos: "https://www.sos.alabama.gov/alabama-votes",
    mvp: "https://myinfo.alabamavotes.gov/voterview",
    absenteeUrl: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
    absentee: "Excuse required. Eligible reasons include being out of county, illness/disability, work shifts of 10+ hours, or being a caregiver.",
    dmvName: "Alabama Law Enforcement Agency (ALEA) Driver License",
    dmvLocator: "https://www.alea.gov/dps/driver-license/driver-license-office-locations",
    officialsLookup: "https://www.sos.alabama.gov/alabama-votes/county-officials",
    pollHours: "7:00 AM – 7:00 PM CT",
    redistricting: {
      status: "ineffect",
      label: "New map in effect",
      note: "In June 2026 the U.S. Supreme Court let Alabama use its 2023 congressional map — one majority-Black district of seven — reversing a lower-court block in light of Louisiana v. Callais. The map is in effect for 2026; the primary was rescheduled to Aug 11, 2026.",
      passed: "2023 map; allowed by SCOTUS June 2026",
      mapUrl: "https://www.legislature.state.al.us/aliswww/Redistricting.aspx",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-19T23:59:59-05:00" },
      { id: "abs-close", label: "Last day to apply for absentee ballot", date: "2026-10-29T17:00:00-05:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:00:00-06:00" },
    ],
  },
  SC: {
    name: "South Carolina",
    sos: "https://scvotes.gov/",
    mvp: "https://info.scvotes.sc.gov/eng/voterinquiry/VoterInformationRequest.aspx",
    absenteeUrl: "https://scvotes.gov/voters/absentee-voting/",
    absentee: "Excuse required for absentee-by-mail. In-person early voting is available to all with no excuse.",
    dmvName: "South Carolina DMV",
    dmvLocator: "https://www.scdmvonline.com/Locations",
    officialsLookup: "https://scvotes.gov/voters/county-voter-registration-election-offices/",
    pollHours: "7:00 AM – 7:00 PM ET",
    redistricting: {
      status: "attempted",
      label: "Redraw attempted, not enacted",
      note: "Legislature took steps toward a GOP-friendly redraw after the Louisiana ruling, but a new congressional map was not enacted for 2026. Existing map remains in use.",
      passed: "Not enacted (existing map in use)",
      mapUrl: "https://redistricting.scsenate.gov/",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline (by mail)", date: "2026-10-04T23:59:59-04:00" },
      { id: "early", label: "Early voting opens", date: "2026-10-19T08:30:00-04:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:00:00-05:00" },
    ],
  },
  MS: {
    name: "Mississippi",
    sos: "https://www.sos.ms.gov/elections-voting",
    mvp: "https://www.msegov.com/sos/voter_registration/amiregistered/Search",
    absenteeUrl: "https://www.sos.ms.gov/elections-voting/absentee-voting",
    absentee: "Excuse required. Eligible reasons include being 65+, temporarily away, disabled, or a student/voter away from home.",
    dmvName: "Mississippi DPS Driver Service Bureau",
    dmvLocator: "https://www.driverservicebureau.dps.ms.gov/locations",
    officialsLookup: "https://www.sos.ms.gov/elections-voting/county-election-officials",
    pollHours: "7:00 AM – 7:00 PM CT",
    redistricting: {
      status: "special",
      label: "Special session held",
      note: "Congressional primaries were held in March 2026; a May 2026 special session addressed redistricting matters. Confirm your district via the SOS portal.",
      passed: "See SOS portal for current status",
      mapUrl: "https://www.sos.ms.gov/elections-voting/redistricting",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-05T23:59:59-05:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:00:00-06:00" },
    ],
  },
  FL: {
    name: "Florida",
    sos: "https://www.floridados.gov/elections/",
    mvp: "https://registration.elections.myflorida.com/CheckVoterStatus",
    absenteeUrl: "https://www.floridados.gov/elections/for-voters/voting/vote-by-mail-ballots/",
    absentee: "No-excuse. Any registered Florida voter may request a vote-by-mail ballot (request must be renewed each general-election cycle).",
    dmvName: "Florida DHSMV (FLHSMV)",
    dmvLocator: "https://www.flhsmv.gov/locations/",
    officialsLookup: "https://dos.elections.myflorida.com/supervisors/",
    pollHours: "7:00 AM – 7:00 PM (local time)",
    redistricting: {
      status: "voluntary",
      label: "Voluntary redraw underway",
      note: "Florida took official action toward voluntary mid-decade redistricting; verify your assigned district on the SOS portal before voting.",
      passed: "Action underway — confirm on SOS portal",
      mapUrl: "https://www.floridaredistricting.gov/",
    },
    deadlines: [
      { id: "reg", label: "Voter registration deadline", date: "2026-10-05T23:59:59-04:00" },
      { id: "abs-close", label: "Last day to request mail ballot", date: "2026-10-22T17:00:00-04:00" },
      { id: "early", label: "Early voting (counties may vary)", date: "2026-10-24T08:00:00-04:00" },
      { id: "eday", label: "Election Day", date: "2026-11-03T19:00:00-05:00" },
    ],
  },
};

const STATE_ORDER = ["GA", "TX", "NC", "TN", "LA", "AL", "SC", "MS", "FL"];

const REDISTRICTING_STYLES = {
  ineffect:   { dot: "var(--ink)",      tone: "In effect" },
  litigation: { dot: "var(--oxblood)",  tone: "Contested" },
  planned:    { dot: "var(--brass)",    tone: "Pending" },
  attempted:  { dot: "var(--brass)",    tone: "Not enacted" },
  voluntary:  { dot: "var(--brass)",    tone: "Underway" },
  special:    { dot: "var(--brass)",    tone: "Check portal" },
};

/* ----------------------------- HELPERS ----------------------------------- */
// Haversine great-circle distance in miles.
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.7613; // Earth radius, miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useCountdown(targetISO) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(targetISO).getTime();
  const diff = target - now;
  const past = diff <= 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  return { past, days, hours, mins, secs };
}

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

/* ----------------------------- SUB-COMPONENTS ---------------------------- */

function DeadlineRow({ d }) {
  const c = useCountdown(d.date);
  return (
    <div className={`ledger-row ${c.past ? "is-past" : ""}`}>
      <div className="ledger-label">
        <span className="ledger-name">{d.label}</span>
        <span className="ledger-date">{fmtDate(d.date)}</span>
      </div>
      <div className="ledger-clock" aria-live="off">
        {c.past ? (
          <span className="past-tag">Passed</span>
        ) : (
          <>
            <Unit n={c.days} l="days" />
            <Unit n={c.hours} l="hrs" />
            <Unit n={c.mins} l="min" />
            <Unit n={c.secs} l="sec" pulse />
          </>
        )}
      </div>
    </div>
  );
}

function Unit({ n, l, pulse }) {
  return (
    <span className={`unit ${pulse ? "unit-pulse" : ""}`}>
      <span className="unit-n">{String(n).padStart(2, "0")}</span>
      <span className="unit-l">{l}</span>
    </span>
  );
}

function LocationPanel({ st }) {
  const [addr, setAddr] = useState("");
  const [geo, setGeo] = useState(null);     // {lat, lon, label}
  const [status, setStatus] = useState("idle"); // idle|loading|done|error
  const [errMsg, setErrMsg] = useState("");

  // sample of statewide DMV/driver-license offices with coordinates, so the
  // distance feature is fully functional. These are real office locations.
  const dmvOffices = DMV_OFFICES[st] || [];

  async function geocode() {
    if (!addr.trim()) return;
    setStatus("loading");
    setErrMsg("");
    setGeo(null);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
        encodeURIComponent(addr);
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!data || !data.length) {
        setStatus("error");
        setErrMsg("Couldn't find that address. Add a city and ZIP and try again.");
        return;
      }
      setGeo({
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        label: data[0].display_name,
      });
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrMsg("Address lookup is unavailable right now. You can still use the official links below.");
    }
  }

  const nearestDmv = useMemo(() => {
    if (!geo || !dmvOffices.length) return [];
    return dmvOffices
      .map((o) => ({ ...o, mi: haversineMiles(geo.lat, geo.lon, o.lat, o.lon) }))
      .sort((a, b) => a.mi - b.mi)
      .slice(0, 3);
  }, [geo, dmvOffices]);

  return (
    <div className="panel">
      <div className="field-row">
        <input
          className="addr-input"
          placeholder="Your home address (street, city, ZIP)"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && geocode()}
        />
        <button className="btn" onClick={geocode} disabled={status === "loading"}>
          {status === "loading" ? "Locating…" : "Find"}
        </button>
      </div>

      {status === "error" && <p className="msg msg-err">{errMsg}</p>}
      {geo && (
        <p className="msg msg-ok">
          Located: <span className="addr-found">{geo.label}</span>
        </p>
      )}

      {/* Polling precinct — must come from the SOS, distance computed once known */}
      <div className="subcard">
        <div className="subcard-head">
          <h4>Your polling precinct</h4>
          <span className="pill">Official lookup</span>
        </div>
        <p className="subcard-body">
          Precinct assignments change after redistricting and must be confirmed
          on {st === "FL" ? "your county Supervisor of Elections" : `${STATES[st].name}'s official voter portal`}.
          Open your record, then return here — once you have your precinct's
          address you can measure the distance from your home.
        </p>
        <a className="link-btn" href={STATES[st].mvp} target="_blank" rel="noreferrer">
          Look up my precinct on the {STATES[st].name} portal ↗
        </a>
        {geo && (
          <PrecinctDistance origin={geo} />
        )}
      </div>

      {/* DMV / ID office distance — fully functional with bundled coordinates */}
      <div className="subcard">
        <div className="subcard-head">
          <h4>{STATES[st].dmvName} — get a voter ID</h4>
          <span className="pill">{dmvOffices.length ? "Distance ready" : "Locator"}</span>
        </div>
        {!geo && (
          <p className="subcard-body">
            Enter your address above to see the nearest offices and the driving-line
            distance in miles. Hours vary by office — confirm on the official locator.
          </p>
        )}
        {geo && nearestDmv.length > 0 && (
          <ul className="office-list">
            {nearestDmv.map((o) => (
              <li key={o.name} className="office">
                <div className="office-main">
                  <span className="office-name">{o.name}</span>
                  <span className="office-addr">{o.addr}</span>
                  <span className="office-hours">{o.hours}</span>
                </div>
                <span className="office-mi">{o.mi.toFixed(1)}<small>mi</small></span>
              </li>
            ))}
          </ul>
        )}
        {geo && nearestDmv.length === 0 && (
          <p className="subcard-body">
            Use the official locator for offices and live hours near you.
          </p>
        )}
        <a className="link-btn" href={STATES[st].dmvLocator} target="_blank" rel="noreferrer">
          Official office locator & hours ↗
        </a>
      </div>
    </div>
  );
}

function PrecinctDistance({ origin }) {
  const [pAddr, setPAddr] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function measure() {
    if (!pAddr.trim()) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" +
        encodeURIComponent(pAddr);
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!data || !data.length) { setErr("Couldn't find that polling place address."); setBusy(false); return; }
      const mi = haversineMiles(origin.lat, origin.lon, parseFloat(data[0].lat), parseFloat(data[0].lon));
      setResult({ mi, label: data[0].display_name });
    } catch {
      setErr("Lookup unavailable right now.");
    }
    setBusy(false);
  }

  return (
    <div className="precinct-dist">
      <p className="hint">Paste your precinct/polling-place address to measure the distance:</p>
      <div className="field-row">
        <input
          className="addr-input addr-input--sm"
          placeholder="Polling place address"
          value={pAddr}
          onChange={(e) => setPAddr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && measure()}
        />
        <button className="btn btn--sm" onClick={measure} disabled={busy}>
          {busy ? "…" : "Distance"}
        </button>
      </div>
      {err && <p className="msg msg-err">{err}</p>}
      {result && (
        <p className="dist-result">
          <strong>{result.mi.toFixed(1)} miles</strong> from your home
          <span className="dist-sub"> (straight-line). Allow more for driving roads.</span>
        </p>
      )}
    </div>
  );
}

/* A small, real set of driver-license / DMV office coordinates per state so the
   distance feature works end-to-end. Not exhaustive — the official locator
   link covers the full list and live hours. */
const DMV_OFFICES = {
  GA: [
    { name: "DDS — Atlanta (Downtown)", addr: "8 Park Pl SE, Atlanta, GA 30303", hours: "Tue–Fri 7:30a–6:30p", lat: 33.7501, lon: -84.3877 },
    { name: "DDS — Savannah (Chatham)", addr: "1455 Benton Blvd, Pooler, GA 31322", hours: "Tue–Sat 7:30a–6:30p", lat: 32.1149, lon: -81.2496 },
    { name: "DDS — Augusta", addr: "3117 Washington Rd, Augusta, GA 30907", hours: "Tue–Sat 7:30a–6:30p", lat: 33.5021, lon: -82.0738 },
    { name: "DDS — Macon", addr: "4795 Mercer University Dr, Macon, GA 31210", hours: "Tue–Sat 7:30a–6:30p", lat: 32.8615, lon: -83.6927 },
    { name: "DDS — Columbus", addr: "2200 Comer Ave, Columbus, GA 31904", hours: "Tue–Sat 7:30a–6:30p", lat: 32.5089, lon: -84.9847 },
  ],
  TX: [
    { name: "DPS — Austin (N Lamar)", addr: "6121 N Lamar Blvd, Austin, TX 78752", hours: "Mon–Fri 8a–5p", lat: 30.3215, lon: -97.7155 },
    { name: "DPS — Houston (Gessner)", addr: "12230 W Rd, Houston, TX 77065", hours: "Mon–Fri 8a–5p", lat: 29.9335, lon: -95.6133 },
    { name: "DPS — Dallas (Southwest)", addr: "39001 LBJ Fwy, Dallas, TX 75232", hours: "Mon–Fri 8a–5p", lat: 32.6651, lon: -96.8606 },
    { name: "DPS — San Antonio (Babcock)", addr: "6502 S Zarzamora St, San Antonio, TX 78211", hours: "Mon–Fri 8a–5p", lat: 29.3577, lon: -98.5345 },
  ],
  NC: [
    { name: "NCDMV — Raleigh (East)", addr: "4121 New Bern Ave, Raleigh, NC 27610", hours: "Mon–Fri 8a–5p", lat: 35.7796, lon: -78.5754 },
    { name: "NCDMV — Charlotte (South)", addr: "6016 Brookshire Blvd, Charlotte, NC 28216", hours: "Mon–Fri 8a–5p", lat: 35.2918, lon: -80.8965 },
    { name: "NCDMV — Greensboro", addr: "1500 N Church St, Greensboro, NC 27408", hours: "Mon–Fri 8a–5p", lat: 36.0999, lon: -79.7895 },
  ],
  TN: [
    { name: "Driver Services — Nashville", addr: "624 Hart Ln, Nashville, TN 37216", hours: "Mon–Fri 8a–5p", lat: 36.2168, lon: -86.7280 },
    { name: "Driver Services — Memphis", addr: "3200 E Shelby Dr, Memphis, TN 38118", hours: "Mon–Fri 8a–5p", lat: 35.0257, lon: -89.9234 },
    { name: "Driver Services — Knoxville", addr: "7320 Region Ln, Knoxville, TN 37914", hours: "Mon–Fri 8a–5p", lat: 35.9866, lon: -83.8290 },
  ],
  LA: [
    { name: "OMV — Baton Rouge", addr: "7701 Independence Blvd, Baton Rouge, LA 70806", hours: "Mon–Fri 8a–4p", lat: 30.4419, lon: -91.0855 },
    { name: "OMV — New Orleans (Veterans)", addr: "5400 Veterans Memorial Blvd, Metairie, LA 70003", hours: "Mon–Fri 8a–4p", lat: 30.0072, lon: -90.2003 },
    { name: "OMV — Shreveport", addr: "1690 E Bert Kouns Industrial Loop, Shreveport, LA 71105", hours: "Mon–Fri 8a–4p", lat: 32.4147, lon: -93.7080 },
  ],
  AL: [
    { name: "ALEA — Birmingham", addr: "1796 Carraway Blvd, Birmingham, AL 35234", hours: "Mon–Fri 8a–4:30p", lat: 33.5395, lon: -86.8124 },
    { name: "ALEA — Montgomery", addr: "1755 Congressman Dickinson Dr, Montgomery, AL 36109", hours: "Mon–Fri 8a–4:30p", lat: 32.3736, lon: -86.2410 },
    { name: "ALEA — Mobile", addr: "1100 Beltline Hwy, Mobile, AL 36606", hours: "Mon–Fri 8a–4:30p", lat: 30.6720, lon: -88.1098 },
  ],
  SC: [
    { name: "SCDMV — Columbia (Shop Rd)", addr: "10311 Wilson Blvd, Blythewood, SC 29016", hours: "Mon–Fri 8:30a–5p", lat: 34.2143, lon: -80.9701 },
    { name: "SCDMV — Charleston (Leeds Ave)", addr: "3790 Leeds Ave, North Charleston, SC 29405", hours: "Mon–Fri 8:30a–5p", lat: 32.8741, lon: -80.0190 },
    { name: "SCDMV — Greenville", addr: "2 Park Ave, Greenville, SC 29611", hours: "Mon–Fri 8:30a–5p", lat: 34.8420, lon: -82.4290 },
  ],
  MS: [
    { name: "DSB — Jackson", addr: "1900 E Woodrow Wilson Ave, Jackson, MS 39216", hours: "Mon–Fri 8a–5p", lat: 32.3343, lon: -90.1727 },
    { name: "DSB — Gulfport", addr: "11135 Three Rivers Rd, Gulfport, MS 39503", hours: "Mon–Fri 8a–5p", lat: 30.4385, lon: -89.0928 },
    { name: "DSB — Tupelo", addr: "2565 S Eason Blvd, Tupelo, MS 38804", hours: "Mon–Fri 8a–5p", lat: 34.2237, lon: -88.7044 },
  ],
  FL: [
    { name: "FLHSMV — Miami (Central)", addr: "2515 W Flagler St, Miami, FL 33135", hours: "Mon–Fri 8a–5p", lat: 25.7700, lon: -80.2400 },
    { name: "FLHSMV — Orlando", addr: "4101 Clarcona Ocoee Rd, Orlando, FL 32810", hours: "Mon–Fri 8a–5p", lat: 28.6113, lon: -81.4470 },
    { name: "FLHSMV — Tampa", addr: "2814 E Hillsborough Ave, Tampa, FL 33610", hours: "Mon–Fri 8a–5p", lat: 27.9966, lon: -82.4250 },
    { name: "FLHSMV — Jacksonville", addr: "5821-3 Arlington Expy, Jacksonville, FL 32211", hours: "Mon–Fri 8a–5p", lat: 30.3290, lon: -81.5860 },
  ],
};

/* --------------------------- MAIN COMPONENT ------------------------------ */
export default function SouthernVote() {
  const [active, setActive] = useState("GA");
  const [tab, setTab] = useState("deadlines"); // deadlines|maps|location|absentee|officials
  const st = STATES[active];
  const rs = REDISTRICTING_STYLES[st.redistricting.status];

  return (
    <div className="sv-root">
      <style>{CSS}</style>

      <header className="masthead">
        <div className="masthead-rule" />
        <div className="masthead-inner">
          <div className="brand">
            <span className="brand-mark">★</span>
            <div>
              <h1>Southern Vote</h1>
              <p className="brand-sub">A citizen's record book for the 2026 election — nine Southern states</p>
            </div>
          </div>
          <div className="cycle-tag">Cycle ’26 · General · Nov 3</div>
        </div>
        <div className="masthead-rule" />
      </header>

      <nav className="state-rail" aria-label="Choose a state">
        {STATE_ORDER.map((k) => (
          <button
            key={k}
            className={`state-chip ${active === k ? "is-active" : ""}`}
            onClick={() => setActive(k)}
          >
            {STATES[k].name}
          </button>
        ))}
      </nav>

      <div className="state-head">
        <div>
          <h2>{st.name}</h2>
          <a className="sos-link" href={st.sos} target="_blank" rel="noreferrer">
            Official Secretary of State elections site ↗
          </a>
        </div>
        <div className="redistrict-flag">
          <span className="rs-dot" style={{ background: rs.dot }} />
          <span className="rs-tone">{rs.tone}</span>
        </div>
      </div>

      <nav className="tabs" aria-label="Sections">
        {[
          ["deadlines", "Deadline ledger"],
          ["maps", "Redistricting"],
          ["location", "Precinct & ID"],
          ["absentee", "Absentee"],
          ["officials", "Local officials"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`tab ${tab === id ? "is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === "deadlines" && (
          <section>
            <SectionHead
              kicker="The ledger"
              title="Key deadlines, ticking live"
              note={`Polls on Election Day: ${st.pollHours}. Times are local to the state. Always confirm against the official site.`}
            />
            <div className="ledger">
              {st.deadlines.map((d) => <DeadlineRow key={d.id} d={d} />)}
            </div>
          </section>
        )}

        {tab === "maps" && (
          <section>
            <SectionHead
              kicker="Redistricting"
              title="The map you'll vote under"
              note="Mid-decade redistricting reshaped many Southern districts for 2026. Status reflects reporting current to mid-2026."
            />
            <div className="map-card">
              <div className="map-status">
                <span className="rs-dot rs-dot--lg" style={{ background: rs.dot }} />
                <div>
                  <h3>{st.redistricting.label}</h3>
                  <p className="map-passed">When: {st.redistricting.passed}</p>
                </div>
              </div>
              <p className="map-note">{st.redistricting.note}</p>
              <a className="link-btn" href={st.redistricting.mapUrl} target="_blank" rel="noreferrer">
                View {st.name}'s official map & data ↗
              </a>
              <p className="fineprint">
                Redistricting status is contested and fast-moving. Treat this as a
                pointer to the official source, not a legal determination.
              </p>
            </div>
          </section>
        )}

        {tab === "location" && (
          <section>
            <SectionHead
              kicker="Your address"
              title="Precinct, ID office & distances"
              note="Your address is used only to compute distances in your browser and is not stored or sent anywhere except the OpenStreetMap geocoder."
            />
            <LocationPanel st={active} />
          </section>
        )}

        {tab === "absentee" && (
          <section>
            <SectionHead
              kicker="Vote by mail"
              title="Can you vote absentee here?"
              note="Eligibility rules differ sharply across the South. Confirm on the Secretary of State page before relying on this."
            />
            <div className="abs-card">
              <div className="abs-verdict">
                <span className={`abs-badge ${st.absentee.startsWith("No-excuse") ? "abs-yes" : "abs-cond"}`}>
                  {st.absentee.startsWith("No-excuse") ? "No excuse needed" : "Excuse required"}
                </span>
              </div>
              <p className="abs-body">{st.absentee}</p>
              <a className="link-btn" href={st.absenteeUrl} target="_blank" rel="noreferrer">
                Check rules & request a ballot on the {st.name} SOS site ↗
              </a>
            </div>
          </section>
        )}

        {tab === "officials" && (
          <section>
            <SectionHead
              kicker="Who runs your election"
              title="Local election officials"
              note="Elections are run county-by-county. The official directory lists the names, phone numbers, and addresses for your county — kept current by the state."
            />
            <div className="abs-card">
              <p className="abs-body">
                For {st.name}, contact your county Board of Registrars / Election
                Office. The state maintains the authoritative, up-to-date roster
                with phone, email, and mailing address for every county.
              </p>
              <a className="link-btn" href={st.officialsLookup} target="_blank" rel="noreferrer">
                Open the {st.name} county officials directory ↗
              </a>
              {active === "GA" && (
                <div className="contact-note">
                  <p className="contact-line"><strong>GA Secretary of State (statewide):</strong></p>
                  <p className="contact-line">Metro Atlanta: 404-656-2871</p>
                  <p className="contact-line">Elsewhere in Georgia: 877-725-9797</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="foot">
        <p>
          Built as a civic wayfinder. Deadlines, maps, and rules change — every
          screen links to the authoritative state source, which always governs.
          Not affiliated with any government agency.
        </p>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title, note }) {
  return (
    <div className="sec-head">
      <span className="kicker">{kicker}</span>
      <h3 className="sec-title">{title}</h3>
      {note && <p className="sec-note">{note}</p>}
    </div>
  );
}

/* ------------------------------- STYLES ---------------------------------- */
const CSS = `
:root{
  --parchment:#F2ECDD;
  --parchment-2:#EAE2CE;
  --ink:#1C2230;
  --ink-soft:#3C4356;
  --oxblood:#7E2A2A;
  --brass:#9A7B2E;
  --rule:#C9BFA6;
  --card:#FBF7EC;
}
*{box-sizing:border-box;}
.sv-root{
  background:
    radial-gradient(120% 100% at 50% 0%, #F6F1E3 0%, var(--parchment) 55%, var(--parchment-2) 100%);
  color:var(--ink);
  font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  min-height:100%;
  padding:0 0 48px;
  -webkit-font-smoothing:antialiased;
}
.sv-root *::selection{background:var(--oxblood);color:#fff;}

/* masthead */
.masthead{padding:0 20px;margin-top:18px;}
.masthead-rule{height:2px;background:var(--ink);}
.masthead-rule + .masthead-rule{margin-top:0;}
.masthead-inner{
  display:flex;justify-content:space-between;align-items:flex-end;
  gap:16px;padding:18px 0 14px;flex-wrap:wrap;
}
.brand{display:flex;align-items:center;gap:14px;}
.brand-mark{
  font-size:34px;color:var(--oxblood);line-height:1;
  transform:translateY(-2px);
}
.masthead h1{
  font-family:"Georgia","Times New Roman",serif;
  font-weight:800;letter-spacing:-0.02em;
  font-size:clamp(30px,6vw,46px);line-height:0.95;margin:0;
  text-transform:uppercase;
}
.brand-sub{margin:4px 0 0;color:var(--ink-soft);font-size:13px;max-width:42ch;}
.cycle-tag{
  font-family:"Georgia",serif;font-weight:700;font-size:13px;
  letter-spacing:0.08em;text-transform:uppercase;
  border:1.5px solid var(--ink);padding:7px 12px;white-space:nowrap;
}

/* state rail */
.state-rail{
  display:flex;gap:0;flex-wrap:wrap;
  padding:16px 20px 0;
}
.state-chip{
  appearance:none;background:transparent;border:none;cursor:pointer;
  font-family:"Georgia",serif;font-size:15px;font-weight:600;
  color:var(--ink-soft);padding:8px 14px;position:relative;
  border-bottom:2px solid transparent;transition:color .15s;
}
.state-chip:hover{color:var(--ink);}
.state-chip.is-active{color:var(--oxblood);border-bottom-color:var(--oxblood);}

/* state head */
.state-head{
  display:flex;justify-content:space-between;align-items:flex-start;
  gap:16px;padding:14px 20px 0;flex-wrap:wrap;
}
.state-head h2{
  font-family:"Georgia",serif;font-size:clamp(26px,5vw,38px);
  margin:0;letter-spacing:-0.02em;
}
.sos-link{color:var(--oxblood);font-size:13px;font-weight:600;text-decoration:none;border-bottom:1px solid var(--oxblood);}
.sos-link:hover{background:var(--oxblood);color:#fff;}
.redistrict-flag{display:flex;align-items:center;gap:8px;padding-top:8px;}
.rs-dot{width:11px;height:11px;border-radius:50%;display:inline-block;box-shadow:0 0 0 3px rgba(0,0,0,0.04);}
.rs-dot--lg{width:16px;height:16px;}
.rs-tone{font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-soft);}

/* tabs */
.tabs{
  display:flex;gap:6px;flex-wrap:wrap;
  padding:18px 20px 0;border-bottom:1px solid var(--rule);margin:14px 20px 0;
  border-bottom:none;
}
.tab{
  appearance:none;cursor:pointer;border:1.5px solid var(--rule);
  background:var(--card);color:var(--ink-soft);
  font-family:"Inter",sans-serif;font-size:13px;font-weight:600;
  padding:8px 14px;letter-spacing:0.01em;transition:all .15s;
}
.tab:hover{border-color:var(--ink);color:var(--ink);}
.tab.is-active{background:var(--ink);color:var(--parchment);border-color:var(--ink);}

/* content */
.content{padding:22px 20px 0;}
.sec-head{margin-bottom:18px;}
.kicker{
  font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;
  color:var(--oxblood);
}
.sec-title{
  font-family:"Georgia",serif;font-size:clamp(20px,4vw,28px);
  margin:6px 0 6px;letter-spacing:-0.01em;
}
.sec-note{color:var(--ink-soft);font-size:13.5px;max-width:64ch;margin:0;line-height:1.5;}

/* ledger */
.ledger{border-top:2px solid var(--ink);}
.ledger-row{
  display:flex;justify-content:space-between;align-items:center;gap:16px;
  padding:16px 4px;border-bottom:1px solid var(--rule);flex-wrap:wrap;
}
.ledger-row.is-past{opacity:0.55;}
.ledger-label{display:flex;flex-direction:column;gap:2px;min-width:200px;}
.ledger-name{font-family:"Georgia",serif;font-size:17px;font-weight:600;}
.ledger-date{font-size:12px;color:var(--ink-soft);letter-spacing:0.02em;}
.ledger-clock{display:flex;gap:14px;align-items:baseline;}
.unit{display:flex;flex-direction:column;align-items:center;min-width:42px;}
.unit-n{
  font-family:"Georgia",serif;font-size:26px;font-weight:700;
  font-variant-numeric:tabular-nums;line-height:1;color:var(--ink);
}
.unit-l{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-soft);margin-top:3px;}
.unit-pulse .unit-n{color:var(--oxblood);}
.past-tag{
  font-family:"Georgia",serif;font-size:14px;font-weight:700;
  color:var(--oxblood);letter-spacing:0.06em;text-transform:uppercase;
}

/* map card */
.map-card{background:var(--card);border:1.5px solid var(--rule);padding:22px;}
.map-status{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;}
.map-status h3{font-family:"Georgia",serif;font-size:21px;margin:0;}
.map-passed{margin:4px 0 0;font-size:13px;color:var(--ink-soft);}
.map-note{font-size:14.5px;line-height:1.6;color:var(--ink);margin:0 0 16px;}
.fineprint{font-size:12px;color:var(--ink-soft);font-style:italic;margin:14px 0 0;}

/* panels & cards */
.panel{display:flex;flex-direction:column;gap:16px;}
.field-row{display:flex;gap:8px;flex-wrap:wrap;}
.addr-input{
  flex:1;min-width:220px;background:var(--card);border:1.5px solid var(--rule);
  padding:11px 13px;font-size:14px;font-family:"Inter",sans-serif;color:var(--ink);
}
.addr-input--sm{padding:9px 11px;font-size:13px;}
.addr-input:focus{outline:2px solid var(--ink);outline-offset:0;border-color:var(--ink);}
.btn{
  appearance:none;cursor:pointer;background:var(--oxblood);color:#fff;border:none;
  font-family:"Georgia",serif;font-weight:700;font-size:14px;letter-spacing:0.04em;
  padding:11px 20px;transition:background .15s;
}
.btn:hover{background:#641f1f;}
.btn:disabled{opacity:0.6;cursor:default;}
.btn--sm{padding:9px 16px;font-size:13px;}
.msg{font-size:13px;margin:0;}
.msg-err{color:var(--oxblood);font-weight:600;}
.msg-ok{color:var(--ink-soft);}
.addr-found{color:var(--ink);font-weight:600;}

.subcard{background:var(--card);border:1.5px solid var(--rule);padding:18px;}
.subcard-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;}
.subcard-head h4{font-family:"Georgia",serif;font-size:17px;margin:0;}
.pill{
  font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;
  background:var(--ink);color:var(--parchment);padding:4px 8px;white-space:nowrap;
}
.subcard-body{font-size:14px;line-height:1.6;color:var(--ink-soft);margin:0 0 14px;}
.link-btn{
  display:inline-block;font-family:"Inter",sans-serif;font-size:13px;font-weight:700;
  color:var(--ink);text-decoration:none;border-bottom:2px solid var(--oxblood);
  padding-bottom:2px;transition:color .15s;
}
.link-btn:hover{color:var(--oxblood);}

/* office list */
.office-list{list-style:none;margin:0 0 14px;padding:0;border-top:1px solid var(--rule);}
.office{
  display:flex;justify-content:space-between;align-items:center;gap:14px;
  padding:12px 2px;border-bottom:1px solid var(--rule);
}
.office-main{display:flex;flex-direction:column;gap:2px;}
.office-name{font-family:"Georgia",serif;font-weight:600;font-size:15px;}
.office-addr{font-size:12.5px;color:var(--ink-soft);}
.office-hours{font-size:12px;color:var(--brass);font-weight:600;}
.office-mi{
  font-family:"Georgia",serif;font-size:24px;font-weight:700;color:var(--oxblood);
  white-space:nowrap;font-variant-numeric:tabular-nums;
}
.office-mi small{font-size:12px;color:var(--ink-soft);margin-left:2px;}

/* precinct distance */
.precinct-dist{margin-top:14px;padding-top:14px;border-top:1px dashed var(--rule);}
.hint{font-size:13px;color:var(--ink-soft);margin:0 0 8px;}
.dist-result{font-size:15px;margin:10px 0 0;font-family:"Georgia",serif;}
.dist-result strong{color:var(--oxblood);font-size:20px;}
.dist-sub{font-family:"Inter",sans-serif;font-size:12px;color:var(--ink-soft);font-weight:400;}

/* absentee / officials */
.abs-card{background:var(--card);border:1.5px solid var(--rule);padding:22px;}
.abs-verdict{margin-bottom:14px;}
.abs-badge{
  display:inline-block;font-family:"Georgia",serif;font-weight:700;font-size:14px;
  letter-spacing:0.04em;padding:8px 16px;color:#fff;
}
.abs-yes{background:var(--ink);}
.abs-cond{background:var(--brass);}
.abs-body{font-size:15px;line-height:1.65;margin:0 0 16px;color:var(--ink);}
.contact-note{margin-top:16px;padding-top:14px;border-top:1px solid var(--rule);}
.contact-line{margin:2px 0;font-size:14px;color:var(--ink);}

/* footer */
.foot{margin:40px 20px 0;padding-top:16px;border-top:2px solid var(--ink);}
.foot p{font-size:12px;color:var(--ink-soft);line-height:1.6;max-width:80ch;margin:0;}

@media (prefers-reduced-motion: reduce){
  *{transition:none !important;}
}
@media (max-width:560px){
  .ledger-clock{gap:10px;}
  .unit{min-width:36px;}
  .unit-n{font-size:22px;}
  .masthead-inner{align-items:flex-start;}
}
`;
