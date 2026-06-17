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
      note: "A Trump-backed push to dismantle Rep. Clyburn's district after the Callais ruling failed in the GOP-led state Senate. No new map was enacted; the existing map remains in use for 2026.",
      passed: "Rejected in Senate (existing map in use)",
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
      status: "ineffect",
      label: "Current map in effect",
      note: "Mississippi uses its existing congressional map for 2026 — no new map was enacted. (Gov. Reeves canceled a May 2026 special session, which concerned judicial districts.) A Callais-driven congressional redraw is under study for a later cycle.",
      passed: "Existing map in use for 2026",
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
      status: "ineffect",
      label: "New map in effect",
      note: "Gov. DeSantis signed a new mid-decade congressional map on May 4, 2026, reworking 21 of 28 districts to add ~4 Republican-leaning seats (projected 24-4). The Florida Supreme Court declined to block it, so the map is in effect for 2026.",
      passed: "May 2026 (signed); in effect for 2026",
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

// Bump this whenever the redistricting / deadline data is re-checked against
// official sources. Surfaced in the footer so users can judge its freshness.
const DATA_LAST_VERIFIED = "June 2026";

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

// Geocode a free-text address, scoped to the state the user is viewing. Place
// names are wildly ambiguous (there are ~10 "Selma"s and "Springfield"s in the
// US), so we append the state and prefer a result that actually lands in it —
// otherwise "123 Main St, Selma" in the Alabama tab can resolve to S. Carolina.
async function geocodeInState(query, stateCode) {
  const stateName = (STATES[stateCode] && STATES[stateCode].name) || "";

  const fetchHits = async (q) => {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };
  const pick = (hits) => {
    if (!hits.length) return null;
    // Prefer a result that actually lands in the state the user is viewing.
    const best = hits.find((d) => d.address && d.address.state === stateName) || hits[0];
    return { lat: parseFloat(best.lat), lon: parseFloat(best.lon), label: best.display_name };
  };

  // Pass 1: append the state to disambiguate (there are ~10 "Selma"s in the US).
  if (stateName && !new RegExp(stateName, "i").test(query)) {
    const scoped = pick(await fetchHits(`${query}, ${stateName}`));
    if (scoped) return scoped;
  }
  // Pass 2: fall back to the raw query (in case the state appended over-
  // constrained it to zero hits), still preferring an in-state match.
  return pick(await fetchHits(query));
}

// Reverse-geocode a coordinate to a human-readable label (best-effort).
async function reverseLabel(lat, lon) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const d = await res.json();
    return (d && d.display_name) || "Your current location";
  } catch {
    return "Your current location";
  }
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
  const [locating, setLocating] = useState(false); // GPS lookup in progress

  // sample of statewide DMV/driver-license offices with coordinates, so the
  // distance feature is fully functional. These are real office locations.
  const dmvOffices = DMV_OFFICES[st] || [];

  async function geocode() {
    if (!addr.trim()) return;
    setStatus("loading");
    setErrMsg("");
    setGeo(null);
    try {
      const g = await geocodeInState(addr, st);
      if (!g) {
        setStatus("error");
        setErrMsg(`Couldn't find that address in ${STATES[st].name}. Add a city and ZIP and try again.`);
        return;
      }
      setGeo(g);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrMsg("Address lookup is unavailable right now. You can still use the official links below.");
    }
  }

  // Use the device's GPS/location instead of typing an address.
  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setErrMsg("This browser can't share your location. Type your address instead.");
      return;
    }
    setStatus("loading");
    setErrMsg("");
    setGeo(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseLabel(latitude, longitude);
        setGeo({ lat: latitude, lon: longitude, label });
        setStatus("done");
        setLocating(false);
      },
      (err) => {
        setStatus("error");
        setLocating(false);
        setErrMsg(
          err && err.code === 1
            ? "Location permission was denied. Type your address instead."
            : "Couldn't get your location. Type your address instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
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

      <button
        className="btn-geo"
        onClick={useMyLocation}
        disabled={status === "loading"}
        type="button"
      >
        {locating ? (
          <><span className="geo-spinner" aria-hidden="true" /> Locating…</>
        ) : (
          <><span aria-hidden="true">◎</span> Use my current location</>
        )}
      </button>

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
          <PrecinctDistance origin={geo} st={st} />
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
                  {o.hours && <span className="office-hours">{o.hours}</span>}
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

function PrecinctDistance({ origin, st }) {
  const [pAddr, setPAddr] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function measure() {
    if (!pAddr.trim()) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const g = await geocodeInState(pAddr, st);
      if (!g) { setErr("Couldn't find that polling place address."); setBusy(false); return; }
      const mi = haversineMiles(origin.lat, origin.lon, g.lat, g.lon);
      setResult({ mi, label: g.label });
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

/* Driver-license / DMV office coordinates per state for the distance feature.
   GA is the complete official DDS center list (geocoded; ~20 coords are
   city-level approximations where the street address didn't geocode). Other
   states are still a major-office sample pending the same treatment. The
   official locator link always governs for exact addresses and live hours. */
const DMV_OFFICES = {
  GA: [
    { name: "DDS — Albany", addr: "2062 Newton Road, Albany, GA", lat: 31.55072, lon: -84.17290 },
    { name: "DDS — Alpharetta", addr: "11575 Maxwell Rd, Alpharetta, GA", lat: 34.06305, lon: -84.30111 },
    { name: "DDS — Americus", addr: "1601 North Martin Luther King Blvd, Americus, GA", lat: 32.08732, lon: -84.24033 },
    { name: "DDS — Athens", addr: "1505 US Highway 29 N, Athens, GA", lat: 33.95977, lon: -83.37640 },
    { name: "DDS — Atlanta", addr: "400 Whitehall Street SW, Atlanta, GA", lat: 33.74396, lon: -84.40298 },
    { name: "DDS — Augusta", addr: "3423 Mike Padgett Highway, Augusta, GA", lat: 33.39825, lon: -82.00566 },
    { name: "DDS — Bainbridge", addr: "101 Airport Road, Bainbridge, GA", lat: 30.90205, lon: -84.60222 },
    { name: "DDS — Between", addr: "1010 Heritage Pkwy, Between, GA", lat: 33.82310, lon: -83.80873 },
    { name: "DDS — Blairsville", addr: "37 Chase Drive, Blairsville, GA", lat: 34.87714, lon: -83.94742 },
    { name: "DDS — Blue Ridge", addr: "211 Industrial Blvd, Blue Ridge, GA", lat: 34.85533, lon: -84.32578 },
    { name: "DDS — Brunswick", addr: "134 Jack Hartman Blvd, Brunswick, GA", lat: 31.14995, lon: -81.49149 },
    { name: "DDS — Calhoun", addr: "402 Belwood Road, Calhoun, GA", lat: 34.46196, lon: -84.92533 },
    { name: "DDS — Canton", addr: "220 Brown Industrial Pkwy, Canton, GA", lat: 34.23897, lon: -84.46968 },
    { name: "DDS — Carrollton", addr: "512 Old Newnan Road, Carrollton, GA", lat: 33.57529, lon: -85.04970 },
    { name: "DDS — Cartersville", addr: "1304 Joe Frank Harris Pkwy, Cartersville, GA", lat: 34.20550, lon: -84.81495 },
    { name: "DDS — Cedartown", addr: "1626 Rockmart Highway, Cedartown, GA", lat: 34.01651, lon: -85.21942 },
    { name: "DDS — Columbus", addr: "8397 Macon Road, Midland, GA", lat: 32.53953, lon: -84.84339 },
    { name: "DDS — Conyers", addr: "2206 Eastview Pkwy, Conyers, GA", lat: 33.66761, lon: -84.01769 },
    { name: "DDS — Cordele", addr: "409 South Midway Road, Cordele, GA", lat: 31.96531, lon: -83.74591 },
    { name: "DDS — Covington", addr: "8134 Geiger Street, Covington, GA", lat: 33.61075, lon: -83.87562 },
    { name: "DDS — Cumming", addr: "400 Aquatic Circle, Cumming, GA", lat: 34.22529, lon: -84.10878 },
    { name: "DDS — Cuthbert", addr: "608B Blakely Street, Cuthbert, GA", lat: 31.77056, lon: -84.78937 },
    { name: "DDS — Dallas", addr: "114 Justice Center Drive, Dallas, GA", lat: 33.91969, lon: -84.85085 },
    { name: "DDS — Dalton", addr: "235 Wagner Drive, Dalton, GA", lat: 34.76919, lon: -84.97025 },
    { name: "DDS — Decatur", addr: "2801 Candler Road, Decatur, GA", lat: 33.75250, lon: -84.29215 },
    { name: "DDS — Douglas", addr: "348 Thomas Frier Sr Drive, Douglas, GA", lat: 31.47375, lon: -82.85541 },
    { name: "DDS — Dublin", addr: "620 County Farm Road, Dublin, GA", lat: 32.49593, lon: -82.92347 },
    { name: "DDS — Elberton", addr: "45 Forest Avenue, Elberton, GA", lat: 34.11162, lon: -82.87162 },
    { name: "DDS — Evans", addr: "4408 Evans to Locks Road, Evans, GA", lat: 33.54016, lon: -82.12800 },
    { name: "DDS — Fayetteville", addr: "749 W Lanier Avenue, Fayetteville, GA", lat: 33.44789, lon: -84.47399 },
    { name: "DDS — Forest Park", addr: "5036 GA Highway 85, Forest Park, GA", lat: 33.62205, lon: -84.36909 },
    { name: "DDS — Fort Benning", addr: "6691 Marchant Avenue, Fort Benning, GA", lat: 32.39446, lon: -84.80626 },
    { name: "DDS — Gainesville", addr: "1010 Aviation Blvd, Gainesville, GA", lat: 34.27786, lon: -83.83055 },
    { name: "DDS — Greensboro", addr: "1180 C Weldon Smith Drive, Greensboro, GA", lat: 33.57568, lon: -83.18238 },
    { name: "DDS — Griffin", addr: "1313 Arthur K Bolton Pkwy, Griffin, GA", lat: 33.23742, lon: -84.19616 },
    { name: "DDS — Helena", addr: "351 8th Street, Helena, GA", lat: 32.06795, lon: -82.90070 },
    { name: "DDS — Hinesville", addr: "2301 Airport Road, Hinesville, GA", lat: 31.78651, lon: -81.63525 },
    { name: "DDS — Jackson", addr: "1578 Highway 16 West, Jackson, GA", lat: 33.29457, lon: -83.96602 },
    { name: "DDS — Kennesaw", addr: "3690 Old 41 Hwy NW, Kennesaw, GA", lat: 33.99622, lon: -84.59899 },
    { name: "DDS — Kingsland", addr: "333 South Ashley Street, Kingsland, GA", lat: 30.79214, lon: -81.68311 },
    { name: "DDS — LaGrange", addr: "900 Dallis Street, LaGrange, GA", lat: 33.03929, lon: -85.03133 },
    { name: "DDS — Lawrenceville", addr: "310 Hurricane Shoals Road NE, Lawrenceville, GA", lat: 33.97401, lon: -83.98088 },
    { name: "DDS — Lithonia", addr: "8040 Rockbridge Road, Lithonia, GA", lat: 33.71233, lon: -84.10519 },
    { name: "DDS — Locust Grove", addr: "619 Tanger Blvd, Locust Grove, GA", lat: 33.32823, lon: -84.10271 },
    { name: "DDS — Macon", addr: "200 Cherry Street, Macon, GA", lat: 32.83427, lon: -83.62365 },
    { name: "DDS — Marietta", addr: "1605 County Services Pkwy, Marietta, GA", lat: 33.91381, lon: -84.58147 },
    { name: "DDS — Milledgeville", addr: "200 Carl Vinson Road, Milledgeville, GA", lat: 33.02287, lon: -83.20698 },
    { name: "DDS — Newnan", addr: "128 Bullsboro Drive, Newnan, GA", lat: 33.38650, lon: -84.78027 },
    { name: "DDS — Norcross", addr: "2211 Beaver Ruin Road, Norcross, GA", lat: 33.93630, lon: -84.18722 },
    { name: "DDS — Perry", addr: "450 Larry Walker Pkwy, Perry, GA", lat: 32.44284, lon: -83.74288 },
    { name: "DDS — Reidsville", addr: "3092 GA Highway 147, Reidsville, GA", lat: 32.08686, lon: -82.11790 },
    { name: "DDS — Rincon", addr: "2792 Highway 21 S, Rincon, GA", lat: 32.29603, lon: -81.23539 },
    { name: "DDS — Rock Spring", addr: "156 Pin Oak Drive, Rock Spring, GA", lat: 34.81559, lon: -85.23746 },
    { name: "DDS — Rome", addr: "3390 Martha Berry Highway NE, Rome, GA", lat: 34.25704, lon: -85.16467 },
    { name: "DDS — Sandersville", addr: "115 Jones Street, Sandersville, GA", lat: 32.98399, lon: -82.81204 },
    { name: "DDS — Savannah", addr: "1117 Eisenhower Drive, Savannah, GA", lat: 32.00602, lon: -81.09904 },
    { name: "DDS — Statesboro", addr: "19051 Highway 301 N, Statesboro, GA", lat: 32.44901, lon: -81.78329 },
    { name: "DDS — Swainsboro", addr: "994 US Highway 1 N, Swainsboro, GA", lat: 32.59739, lon: -82.33374 },
    { name: "DDS — Thomaston", addr: "281 Knight Trail, Thomaston, GA", lat: 32.89828, lon: -84.30067 },
    { name: "DDS — Thomasville", addr: "4788 US 84 Bypass W, Thomasville, GA", lat: 30.83658, lon: -83.97878 },
    { name: "DDS — Thomson", addr: "172 Bob Kirk Road, Thomson, GA", lat: 33.46632, lon: -82.50261 },
    { name: "DDS — Tifton", addr: "3057 US Highway 41 S, Tifton, GA", lat: 31.45497, lon: -83.51083 },
    { name: "DDS — Toccoa", addr: "62 Doyle Street, Toccoa, GA", lat: 34.57937, lon: -83.32753 },
    { name: "DDS — Trenton", addr: "75 Case Avenue, Trenton, GA", lat: 34.87239, lon: -85.51015 },
    { name: "DDS — Valdosta", addr: "371 Gil Harbin Industrial Blvd, Valdosta, GA", lat: 30.80588, lon: -83.26842 },
    { name: "DDS — Warner Robins", addr: "198 Carl Vinson Pkwy, Warner Robins, GA", lat: 32.59981, lon: -83.66499 },
    { name: "DDS — Waycross", addr: "3029 Memorial Drive, Waycross, GA", lat: 31.19851, lon: -82.32466 },
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
    { name: "ALEA — Abbeville", addr: "101 N Doswell St, Abbeville, AL 36310", lat: 31.57414, lon: -85.24942 },
    { name: "ALEA — Alexander City", addr: "395 Lee Street, Alexander City, AL 35010", lat: 32.94015, lon: -85.95910 },
    { name: "ALEA — Andalusia", addr: "1 Court Square, Andalusia, AL 36420", lat: 31.30805, lon: -86.48208 },
    { name: "ALEA — Ashland", addr: "93 County Road 31, Ashland, AL 36251", lat: 33.27373, lon: -85.83607 },
    { name: "ALEA — Ashville", addr: "31675 US Highway 411, Ashville, AL 35953", lat: 33.83692, lon: -86.25498 },
    { name: "ALEA — Athens", addr: "503 S Jefferson Street, Athens, AL 35611", lat: 34.81995, lon: -86.97183 },
    { name: "ALEA — Bay Minette", addr: "203A Oak Street, Bay Minette, AL 36507", lat: 30.88001, lon: -87.77740 },
    { name: "ALEA — Bessemer", addr: "1801 3rd Avenue, Bessemer, AL 35020", lat: 33.40152, lon: -86.95426 },
    { name: "ALEA — Birmingham", addr: "908 Bankhead Hwy W, Birmingham, AL 35204", lat: 33.53069, lon: -86.85112 },
    { name: "ALEA — Birmingham (US-280)", addr: "19220 US Highway 280, Birmingham, AL 35242", lat: 33.43263, lon: -86.71442 },
    { name: "ALEA — Brewton", addr: "314 Belleville Avenue, Brewton, AL 36426", lat: 31.10656, lon: -87.07151 },
    { name: "ALEA — Butler", addr: "117 South Mulberry, Butler, AL 36904", lat: 32.08686, lon: -88.22139 },
    { name: "ALEA — Camden", addr: "219 Claiborne Street, Camden, AL 36726", lat: 31.98887, lon: -87.29324 },
    { name: "ALEA — Carrollton", addr: "155 Reform Street, Carrollton, AL 35447", lat: 33.26265, lon: -88.09481 },
    { name: "ALEA — Centre", addr: "260 Cedar Bluff Road, Centre, AL 35960", lat: 34.15368, lon: -85.67692 },
    { name: "ALEA — Centreville", addr: "8 Court Square West, Centreville, AL 35042", lat: 32.94574, lon: -87.13574 },
    { name: "ALEA — Chatom", addr: "45 Court Street, Chatom, AL 36518", lat: 31.46567, lon: -88.25658 },
    { name: "ALEA — Clanton", addr: "53 Robert Threlkeld Parkway, Clanton, AL 35045", lat: 32.83920, lon: -86.63092 },
    { name: "ALEA — Columbiana", addr: "104 Depot Street, Columbiana, AL 35051", lat: 33.17922, lon: -86.60724 },
    { name: "ALEA — Cullman", addr: "500 2nd Avenue SW, Cullman, AL 35055", lat: 34.17270, lon: -86.84231 },
    { name: "ALEA — Decatur", addr: "302 Lee Street NE, Decatur, AL 35601", lat: 34.60684, lon: -86.98571 },
    { name: "ALEA — Dothan", addr: "5679 Montgomery Hwy, Dothan, AL 36303", lat: 31.27464, lon: -85.45278 },
    { name: "ALEA — Double Springs", addr: "23415 Highway 195, Double Springs, AL 35553", lat: 34.14649, lon: -87.40224 },
    { name: "ALEA — Eufaula", addr: "405 E Barbour Street, Eufaula, AL 36027", lat: 31.89135, lon: -85.14058 },
    { name: "ALEA — Eutaw", addr: "400 Morrow Avenue, Eutaw, AL 35462", lat: 32.83935, lon: -87.88703 },
    { name: "ALEA — Evergreen", addr: "106 Hillcrest Drive, Evergreen, AL 36401", lat: 31.45127, lon: -86.95984 },
    { name: "ALEA — Fairhope", addr: "1100 Fairhope Avenue, Fairhope, AL 36532", lat: 30.52303, lon: -87.90694 },
    { name: "ALEA — Fayette", addr: "103 1st Avenue NE, Fayette, AL 35555", lat: 33.68575, lon: -87.83004 },
    { name: "ALEA — Foley", addr: "201 E Section Avenue, Foley, AL 36535", lat: 30.41416, lon: -87.68274 },
    { name: "ALEA — Fort Payne", addr: "1209 Forest Avenue North, Fort Payne, AL 35967", lat: 34.44425, lon: -85.71969 },
    { name: "ALEA — Gadsden", addr: "800 Forrest Ave, Gadsden, AL 35901", lat: 34.01563, lon: -86.01164 },
    { name: "ALEA — Geneva", addr: "200 N Commerce Street, Geneva, AL 36340", lat: 31.04003, lon: -85.86626 },
    { name: "ALEA — Greensboro", addr: "701 Hall Street, Greensboro, AL 36744", lat: 32.70458, lon: -87.59584 },
    { name: "ALEA — Greenville", addr: "101 S Conecuh Street, Greenville, AL 36037", lat: 31.82921, lon: -86.61794 },
    { name: "ALEA — Grove Hill", addr: "146 Clark Street, Grove Hill, AL 36451", lat: 31.70774, lon: -87.77579 },
    { name: "ALEA — Guntersville", addr: "357 Blount Avenue, Guntersville, AL 35976", lat: 34.35973, lon: -86.29214 },
    { name: "ALEA — Hamilton", addr: "4521 Military Street South, Hamilton, AL 35570", lat: 34.08121, lon: -87.97584 },
    { name: "ALEA — Hayneville", addr: "205 East Tuskeena Street, Hayneville, AL 36040", lat: 32.18415, lon: -86.57805 },
    { name: "ALEA — Heflin", addr: "120 Vickery St, Heflin, AL 36264", lat: 33.64988, lon: -85.58788 },
    { name: "ALEA — Huntsville (Governors)", addr: "7262 Governors West, Huntsville, AL 35806", lat: 34.70230, lon: -86.69170 },
    { name: "ALEA — Huntsville (Redstone)", addr: "Building 3494, Redstone Arsenal, Huntsville, AL 35808", lat: 34.72985, lon: -86.58590 },
    { name: "ALEA — Jacksonville", addr: "1703 Pelham Road South, Jacksonville, AL 36265", lat: 33.78439, lon: -85.76146 },
    { name: "ALEA — Jasper", addr: "1801 3rd Avenue S, Jasper, AL 35501", lat: 33.83122, lon: -87.27751 },
    { name: "ALEA — LaFayette", addr: "9 Jane Place, LaFayette, AL 36862", lat: 32.91669, lon: -85.40508 },
    { name: "ALEA — Linden", addr: "101 North Shiloh Street, Linden, AL 36748", lat: 32.30625, lon: -87.79807 },
    { name: "ALEA — Livingston", addr: "104 Hospital Drive, Livingston, AL 35470", lat: 32.58416, lon: -88.18728 },
    { name: "ALEA — Luverne", addr: "301 Glenwood Avenue, Luverne, AL 36049", lat: 31.71214, lon: -86.26273 },
    { name: "ALEA — Madison", addr: "100 Plaza Blvd, Madison, AL 35758", lat: 34.70746, lon: -86.74583 },
    { name: "ALEA — Marion", addr: "1710 S Washington Street, Marion, AL 36756", lat: 32.63292, lon: -87.31903 },
    { name: "ALEA — Mobile", addr: "3400 Demetropolis Road, Mobile, AL 36693", lat: 30.62286, lon: -88.15709 },
    { name: "ALEA — Monroeville", addr: "121 Pineville Road, Monroeville, AL 36460", lat: 31.52830, lon: -87.32291 },
    { name: "ALEA — Montgomery (Coliseum)", addr: "1040 Coliseum Boulevard, Montgomery, AL 36109", lat: 32.40350, lon: -86.26303 },
    { name: "ALEA — Montgomery (Ripley St)", addr: "301 South Ripley Street, Montgomery, AL 36104", lat: 32.37490, lon: -86.29792 },
    { name: "ALEA — Moulton", addr: "14451 Market Street, Moulton, AL 35650", lat: 34.48113, lon: -87.29187 },
    { name: "ALEA — New Brockton", addr: "1015 E McKinnon Street, New Brockton, AL 36351", lat: 31.38572, lon: -85.92939 },
    { name: "ALEA — Oneonta", addr: "1000 Lincoln Avenue, Oneonta, AL 35121", lat: 33.95738, lon: -86.46664 },
    { name: "ALEA — Opelika", addr: "1220 Fox Run Avenue, Opelika, AL 36801", lat: 32.65078, lon: -85.35120 },
    { name: "ALEA — Ozark", addr: "202 Hwy 123 South, Ozark, AL 36360", lat: 31.43237, lon: -85.62877 },
    { name: "ALEA — Pelham", addr: "1022 County Services Drive, Pelham, AL 35124", lat: 33.28208, lon: -86.79527 },
    { name: "ALEA — Pell City", addr: "1815 Cogswell Avenue, Pell City, AL 35125", lat: 33.58671, lon: -86.28674 },
    { name: "ALEA — Phenix City", addr: "1320 Broad Street, Phenix City, AL 36867", lat: 32.47143, lon: -85.00064 },
    { name: "ALEA — Prattville", addr: "218 N Court Street, Prattville, AL 36067", lat: 32.46484, lon: -86.47545 },
    { name: "ALEA — Rockford", addr: "309 Jackson Street, Rockford, AL 35136", lat: 32.89079, lon: -86.21987 },
    { name: "ALEA — Russellville", addr: "410 N Jackson Avenue, Russellville, AL 35653", lat: 34.50864, lon: -87.72835 },
    { name: "ALEA — Scottsboro", addr: "205 Liberty Lane, Scottsboro, AL 35768", lat: 34.65862, lon: -86.01657 },
    { name: "ALEA — Selma", addr: "102 Church St, Selma, AL 36701", lat: 32.41686, lon: -87.02659 },
    { name: "ALEA — Sheffield", addr: "4500 Hatch Boulevard, Sheffield, AL 35660", lat: 34.77259, lon: -87.67134 },
    { name: "ALEA — Sumiton", addr: "101 State Street, Sumiton, AL 35148", lat: 33.75088, lon: -87.04952 },
    { name: "ALEA — Talladega", addr: "1 Court Square, Talladega, AL 35160", lat: 33.43328, lon: -86.09863 },
    { name: "ALEA — Troy", addr: "120 W Church Street, Troy, AL 36081", lat: 31.80717, lon: -85.97250 },
    { name: "ALEA — Tuscaloosa", addr: "2645 Skyland Boulevard E, Tuscaloosa, AL 35405", lat: 33.16840, lon: -87.50304 },
    { name: "ALEA — Tuskegee", addr: "101 Fonville Street, Tuskegee, AL 36083", lat: 32.42188, lon: -85.69369 },
    { name: "ALEA — Union Springs", addr: "201 Powell Street, Union Springs, AL 36089", lat: 32.14184, lon: -85.71464 },
    { name: "ALEA — Vernon", addr: "1118 County Road 9, Vernon, AL 35592", lat: 33.74203, lon: -88.12543 },
    { name: "ALEA — Wedowee", addr: "1 S Main Street, Wedowee, AL 36278", lat: 33.29907, lon: -85.48180 },
    { name: "ALEA — Wetumpka", addr: "100 Commerce Street, Wetumpka, AL 36092", lat: 32.53720, lon: -86.20487 },
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
        <p className="foot-verified">
          Redistricting &amp; deadline data last verified: {DATA_LAST_VERIFIED}.
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
  --star:#1E4FA3;
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
  font-size:34px;color:var(--star);line-height:1;
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
.btn-geo{
  appearance:none;cursor:pointer;margin-top:8px;background:none;border:none;padding:0;
  color:var(--star);font-family:"Georgia",serif;font-weight:600;font-size:13px;
  letter-spacing:0.02em;text-decoration:underline;text-underline-offset:2px;
}
.btn-geo:hover{color:var(--ink);}
.btn-geo:disabled{opacity:0.5;cursor:default;text-decoration:none;}
.geo-spinner{
  display:inline-block;width:11px;height:11px;vertical-align:-1px;margin-right:1px;
  border:2px solid rgba(30,79,163,0.3);border-top-color:var(--star);border-radius:50%;
  animation:geo-spin .7s linear infinite;
}
@keyframes geo-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion: reduce){.geo-spinner{animation:none;}}
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
.foot-verified{margin-top:8px !important;font-style:italic;letter-spacing:.02em;}

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
