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
    { name: "DPS — Abilene", addr: "1102 E Lowden St, Abilene, TX 79601", lat: 32.48174, lon: -99.69860 },
    { name: "DPS — Alice", addr: "300 South Johnson Street, Alice, TX 78332", lat: 27.74662, lon: -98.08253 },
    { name: "DPS — Alpine", addr: "3500 North Highway 118, Alpine, TX 79830", lat: 30.37320, lon: -103.66752 },
    { name: "DPS — Amarillo", addr: "6592 East I-40, Amarillo, TX 79118", lat: 35.20729, lon: -101.83712 },
    { name: "DPS — Andrews", addr: "201 N Main St, Andrews, TX 79714", lat: 32.32014, lon: -102.54765 },
    { name: "DPS — Angleton", addr: "757 County Road 44, Angleton, TX 77515", lat: 29.16941, lon: -95.43188 },
    { name: "DPS — Anson", addr: "1110 West Court Plaza, Anson, TX 79501", lat: 32.75696, lon: -99.89708 },
    { name: "DPS — Aransas Pass", addr: "919 S Commercial, Aransas Pass, TX 78336", lat: 27.90420, lon: -97.14492 },
    { name: "DPS — Athens", addr: "511 Hwy 175 West, Athens, TX 75751", lat: 32.20444, lon: -95.85491 },
    { name: "DPS — Austin North Lamar", addr: "6121 North Lamar, Austin, TX 78752", lat: 30.32970, lon: -97.72321 },
    { name: "DPS — Austin Northwest", addr: "13730 Research Boulevard, Austin, TX 78750", lat: 30.45791, lon: -97.79402 },
    { name: "DPS — Austin Pflugerville Mega Center", addr: "216 East Wells Branch Parkway, Pflugerville, TX 78660", lat: 30.43937, lon: -97.62000 },
    { name: "DPS — Austin South", addr: "6425 South Interstate 35, Austin, TX 78744", lat: 30.19157, lon: -97.76889 },
    { name: "DPS — Baird", addr: "1257 FM 2047, Baird, TX 79504", lat: 32.40485, lon: -99.41278 },
    { name: "DPS — Ballinger", addr: "602 Strong Ave, Ballinger, TX 76821", lat: 31.73871, lon: -99.94494 },
    { name: "DPS — Bastrop", addr: "305 Eskew St, Bastrop, TX 78602", lat: 30.10609, lon: -97.32704 },
    { name: "DPS — Bay City", addr: "510 Avenue F, Bay City, TX 77414", lat: 29.00000, lon: -95.97173 },
    { name: "DPS — Baytown", addr: "5420 Decker Drive, Baytown, TX 77520", lat: 29.78076, lon: -95.02538 },
    { name: "DPS — Beaumont", addr: "7200 Eastex Freeway, Beaumont, TX 77708", lat: 30.13530, lon: -94.16914 },
    { name: "DPS — Beeville", addr: "400 S Hillside Drive, Beeville, TX 78102", lat: 28.40633, lon: -97.73206 },
    { name: "DPS — Big Lake", addr: "300 North Plaza Ave, Big Lake, TX 76932", lat: 31.19326, lon: -101.46069 },
    { name: "DPS — Big Spring", addr: "5725 IH 20 West, Big Spring, TX 79720", lat: 32.25040, lon: -101.47874 },
    { name: "DPS — Boerne", addr: "1415 East Blanco, Boerne, TX 78006", lat: 29.79724, lon: -98.71596 },
    { name: "DPS — Bonham", addr: "1203 East Sam Rayburn, Bonham, TX 75418", lat: 33.57659, lon: -96.16735 },
    { name: "DPS — Borger", addr: "3249 Fairlanes Blvd, Borger, TX 79007", lat: 35.65147, lon: -101.44625 },
    { name: "DPS — Bowie", addr: "603 East Decatur Street, Bowie, TX 76230", lat: 33.55899, lon: -97.84847 },
    { name: "DPS — Brady", addr: "900 E Main St, Brady, TX 76825", lat: 31.13541, lon: -99.32964 },
    { name: "DPS — Breckenridge", addr: "200 West Walker Street, Breckenridge, TX 76424", lat: 32.75551, lon: -98.90400 },
    { name: "DPS — Brenham", addr: "975 US 290 West, Brenham, TX 77833", lat: 30.16688, lon: -96.39774 },
    { name: "DPS — Brownfield", addr: "802 North Ballard, Brownfield, TX 79316", lat: 33.18721, lon: -102.26631 },
    { name: "DPS — Brownsville", addr: "2901 Paredes Line Road, Brownsville, TX 78526", lat: 25.95688, lon: -97.48739 },
    { name: "DPS — Brownwood", addr: "1516 Market Place Blvd, Brownwood, TX 76801", lat: 31.73367, lon: -98.98672 },
    { name: "DPS — Bryan", addr: "2571 North Earl Rudder Freeway, Bryan, TX 77803", lat: 30.71953, lon: -96.39532 },
    { name: "DPS — Caldwell", addr: "102 North Shaw, Caldwell, TX 77836", lat: 30.53363, lon: -96.69253 },
    { name: "DPS — Cameron", addr: "512 N Jefferson, Cameron, TX 76520", lat: 30.85508, lon: -96.98128 },
    { name: "DPS — Canadian", addr: "400 Main Street, Canadian, TX 79014", lat: 35.91200, lon: -100.38102 },
    { name: "DPS — Canton", addr: "1601 North Trade Days Blvd, Canton, TX 75103", lat: 32.53860, lon: -95.86181 },
    { name: "DPS — Canton CDL", addr: "14589 IH 20 S Access Road, Canton, TX 75103", lat: 32.53860, lon: -95.86181 },
    { name: "DPS — Carrollton Mega Center", addr: "4600 State Highway 121, Carrollton, TX 75010", lat: 33.03630, lon: -96.92220 },
    { name: "DPS — Carthage", addr: "110 South Sycamore, Carthage, TX 75633", lat: 32.15554, lon: -94.34126 },
    { name: "DPS — Castroville", addr: "8366 FM 471 South, Castroville, TX 78009", lat: 29.34670, lon: -98.83969 },
    { name: "DPS — Center", addr: "1281 Southview Circle, Center, TX 75935", lat: 31.78050, lon: -94.18528 },
    { name: "DPS — Centerville", addr: "113 West Main Street, Centerville, TX 75833", lat: 31.25921, lon: -95.97901 },
    { name: "DPS — Childress", addr: "1700 Avenue F Northwest, Childress, TX 79201", lat: 34.43364, lon: -100.22274 },
    { name: "DPS — Clarendon", addr: "723 West 2nd Street, Clarendon, TX 79226", lat: 34.94150, lon: -100.89529 },
    { name: "DPS — Clarksville", addr: "500 North Cedar, Clarksville, TX 75426", lat: 33.61373, lon: -95.05194 },
    { name: "DPS — Cleburne", addr: "600 West Kilpatrick, Cleburne, TX 76033", lat: 32.36478, lon: -97.40582 },
    { name: "DPS — Cleveland", addr: "304 Campbell St, Cleveland, TX 77327", lat: 30.34747, lon: -95.07171 },
    { name: "DPS — Coleman", addr: "112 North Concho, Coleman, TX 76834", lat: 31.83120, lon: -99.42404 },
    { name: "DPS — Colorado City", addr: "333 Pine Street, Colorado City, TX 79512", lat: 32.39047, lon: -100.87011 },
    { name: "DPS — Columbus", addr: "3229 Columbus Loop, Columbus, TX 78934", lat: 29.69416, lon: -96.56994 },
    { name: "DPS — Comanche", addr: "101 FM 3381, Comanche, TX 76442", lat: 31.91511, lon: -98.59222 },
    { name: "DPS — Conroe", addr: "2 Hilbig Street, Conroe, TX 77301", lat: 30.31188, lon: -95.45605 },
    { name: "DPS — Corpus Christi Mega Center", addr: "3506 Twin River Blvd, Corpus Christi, TX 78410", lat: 27.84618, lon: -97.56489 },
    { name: "DPS — Corsicana", addr: "3030 US 287, Corsicana, TX 75109", lat: 32.07063, lon: -96.44248 },
    { name: "DPS — Cotulla", addr: "201 S Main St, Cotulla, TX 78014", lat: 28.43475, lon: -99.23489 },
    { name: "DPS — Crane", addr: "1212 S Alford, Crane, TX 79731", lat: 31.40446, lon: -102.35425 },
    { name: "DPS — Crockett", addr: "112 East Houston Ave, Crockett, TX 75835", lat: 31.31841, lon: -95.46029 },
    { name: "DPS — Crosbyton", addr: "215 South Berkshire, Crosbyton, TX 79322", lat: 33.65859, lon: -101.23925 },
    { name: "DPS — Crystal City", addr: "200 East Uvalde, Crystal City, TX 78839", lat: 28.67977, lon: -99.82753 },
    { name: "DPS — Cuero", addr: "208 E Live Oak, Cuero, TX 77954", lat: 29.09263, lon: -97.28829 },
    { name: "DPS — Daingerfield", addr: "500 Broadnax, Daingerfield, TX 75638", lat: 33.03521, lon: -94.72575 },
    { name: "DPS — Dalhart", addr: "320 Denver Avenue, Dalhart, TX 79022", lat: 36.06300, lon: -102.52201 },
    { name: "DPS — Dallas South Mega Center", addr: "39025 LBJ Service Road, Dallas, TX 75232", lat: 32.87740, lon: -96.68712 },
    { name: "DPS — Decatur", addr: "2000 South Trinity, Decatur, TX 76234", lat: 33.21952, lon: -97.58676 },
    { name: "DPS — Del Rio", addr: "2012 Veterans Blvd, Del Rio, TX 78840", lat: 29.38431, lon: -100.90552 },
    { name: "DPS — Denton", addr: "4020 E McKinney, Denton, TX 76208", lat: 33.21021, lon: -97.08348 },
    { name: "DPS — Denver City", addr: "201 N Main Street, Denver City, TX 79323", lat: 32.96796, lon: -102.82939 },
    { name: "DPS — Dimmitt", addr: "100 East Bedford, Dimmitt, TX 79027", lat: 34.55087, lon: -102.30775 },
    { name: "DPS — Dumas", addr: "817 South Bliss, Dumas, TX 79029", lat: 35.85693, lon: -101.97157 },
    { name: "DPS — Eagle Pass", addr: "5164 E Main St, Eagle Pass, TX 78852", lat: 28.70872, lon: -100.48429 },
    { name: "DPS — Eastland", addr: "1002 Lago Vista, Eastland, TX 76448", lat: 32.40070, lon: -98.80121 },
    { name: "DPS — Edinburg Mega Center", addr: "5160 North Interstate 69C, Edinburg, TX 78542", lat: 26.30140, lon: -98.16245 },
    { name: "DPS — El Paso Gateway", addr: "7300 Gateway East, El Paso, TX 79915", lat: 31.76555, lon: -106.36703 },
    { name: "DPS — El Paso Hondo Pass", addr: "4505 Hondo Pass, El Paso, TX 79904", lat: 31.86963, lon: -106.43670 },
    { name: "DPS — El Paso Northwest", addr: "1854 Northwestern, El Paso, TX 79912", lat: 31.87775, lon: -106.57470 },
    { name: "DPS — El Paso Scott Simpson", addr: "11612 Scott Simpson Drive, El Paso, TX 79936", lat: 31.74531, lon: -106.29999 },
    { name: "DPS — Emory", addr: "109 Wood, Emory, TX 75440", lat: 32.87582, lon: -95.76578 },
    { name: "DPS — Fairfield", addr: "118 Commerce St, Fairfield, TX 75840", lat: 31.72523, lon: -96.16192 },
    { name: "DPS — Falfurrias", addr: "217 East Miller Street, Falfurrias, TX 78355", lat: 27.22610, lon: -98.14249 },
    { name: "DPS — Floresville", addr: "800 10th Street, Floresville, TX 78114", lat: 29.14814, lon: -98.15780 },
    { name: "DPS — Flower Mound", addr: "6200 Canyon Falls Drive, Flower Mound, TX 76226", lat: 33.07523, lon: -97.20759 },
    { name: "DPS — Floydada", addr: "105 South Main Street, Floydada, TX 79235", lat: 33.98499, lon: -101.33412 },
    { name: "DPS — Fort Bliss", addr: "505 Pershing Road, Fort Bliss, TX 79916", lat: 31.80156, lon: -106.42957 },
    { name: "DPS — Fort Cavazos", addr: "69005 TJ Mills Blvd, Fort Cavazos, TX 76544", lat: 31.12652, lon: -97.80273 },
    { name: "DPS — Fort Stockton", addr: "2302 West Dickinson, Fort Stockton, TX 79735", lat: 30.89411, lon: -102.90445 },
    { name: "DPS — Fort Worth East", addr: "3500 Miller Avenue, Fort Worth, TX 76119", lat: 32.71072, lon: -97.26298 },
    { name: "DPS — Fort Worth Mega Center", addr: "8301 Brentwood Stair Road, Fort Worth, TX 76120", lat: 32.75381, lon: -97.17339 },
    { name: "DPS — Fort Worth South", addr: "6413 Woodway Drive, Fort Worth, TX 76133", lat: 32.64970, lon: -97.37623 },
    { name: "DPS — Fredericksburg", addr: "125 W Main St, Fredericksburg, TX 78624", lat: 30.27593, lon: -98.87390 },
    { name: "DPS — Friona", addr: "521 Euclid Street, Friona, TX 79035", lat: 34.63963, lon: -102.72117 },
    { name: "DPS — Gainesville", addr: "206 West California, Gainesville, TX 76240", lat: 33.62422, lon: -97.14634 },
    { name: "DPS — Galveston", addr: "6812 Broadway, Galveston, TX 77554", lat: 29.28917, lon: -94.84680 },
    { name: "DPS — Garland", addr: "350 West Interstate 30, Garland, TX 75043", lat: 32.84101, lon: -96.59056 },
    { name: "DPS — Garland Mega Center", addr: "4445 Saturn Rd, Garland, TX 75041", lat: 32.86295, lon: -96.65008 },
    { name: "DPS — Gatesville", addr: "3418 E Main St, Gatesville, TX 76528", lat: 31.43449, lon: -97.71381 },
    { name: "DPS — George West", addr: "301 Houston, George West, TX 78022", lat: 28.33417, lon: -98.11421 },
    { name: "DPS — Georgetown", addr: "515 Pine Street, Georgetown, TX 78626", lat: 30.63828, lon: -97.67018 },
    { name: "DPS — Giddings", addr: "170 E Industry, Giddings, TX 78942", lat: 30.17523, lon: -96.92590 },
    { name: "DPS — Gilmer", addr: "713 State Highway 155 North, Gilmer, TX 75644", lat: 32.72880, lon: -94.94456 },
    { name: "DPS — Goldthwaite", addr: "1011 4th Street, Goldthwaite, TX 76844", lat: 31.44979, lon: -98.56953 },
    { name: "DPS — Gonzales", addr: "1711 Sarah Dewitt Drive, Gonzales, TX 78629", lat: 29.52182, lon: -97.44346 },
    { name: "DPS — Graham", addr: "142 N Elm Street, Graham, TX 76450", lat: 33.10205, lon: -98.58958 },
    { name: "DPS — Grand Prairie", addr: "701 N Bagdad Rd, Grand Prairie, TX 75050", lat: 32.75697, lon: -96.97115 },
    { name: "DPS — Greenville", addr: "2801 Stuart St, Greenville, TX 75401", lat: 33.13771, lon: -96.10470 },
    { name: "DPS — Groesbeck", addr: "1221 East Yeagua, Groesbeck, TX 76642", lat: 31.51571, lon: -96.51308 },
    { name: "DPS — Hallettsville", addr: "412 North Texana, Hallettsville, TX 77964", lat: 29.44741, lon: -96.94169 },
    { name: "DPS — Hamilton", addr: "101 W Henry, Hamilton, TX 76531", lat: 31.70512, lon: -98.12495 },
    { name: "DPS — Harlingen", addr: "1630 North 77 Sunshine Strip, Harlingen, TX 78550", lat: 26.20932, lon: -97.69643 },
    { name: "DPS — Haskell", addr: "1 Avenue D, Haskell, TX 79521", lat: 33.15712, lon: -99.73287 },
    { name: "DPS — Hearne CDL", addr: "12511 Airport Road, Hearne, TX 77859", lat: 30.87888, lon: -96.59624 },
    { name: "DPS — Hebbronville", addr: "201 N Oak Ave, Hebbronville, TX 78361", lat: 27.30773, lon: -98.67728 },
    { name: "DPS — Hemphill", addr: "213 Market Street, Hemphill, TX 75948", lat: 31.34333, lon: -93.84985 },
    { name: "DPS — Hempstead", addr: "235 Highway 290 E, Hempstead, TX 77445", lat: 30.09295, lon: -96.08065 },
    { name: "DPS — Henderson", addr: "325 Fair Park, Henderson, TX 75654", lat: 32.14975, lon: -94.79733 },
    { name: "DPS — Hereford", addr: "807 W 15th Street, Hereford, TX 79045", lat: 34.83674, lon: -102.40995 },
    { name: "DPS — Hillsboro", addr: "126 S Covington, Hillsboro, TX 76645", lat: 32.00611, lon: -97.13150 },
    { name: "DPS — Houston Dacoma", addr: "4545 Dacoma, Houston, TX 77092", lat: 29.80868, lon: -95.45361 },
    { name: "DPS — Houston East", addr: "11039 East Freeway, Houston, TX 77029", lat: 29.77286, lon: -95.23387 },
    { name: "DPS — Houston Gessner CDL", addr: "12220 S Gessner, Houston, TX 77071", lat: 29.64399, lon: -95.52933 },
    { name: "DPS — Houston Gessner Mega Center", addr: "12220 South Gessner, Houston, TX 77071", lat: 29.64399, lon: -95.52933 },
    { name: "DPS — Houston North Mega Center", addr: "8418 Veterans Memorial Drive, Houston, TX 77088", lat: 29.88524, lon: -95.41925 },
    { name: "DPS — Houston Southeast Mega Center", addr: "10810 Galveston Rd, Houston, TX 77034", lat: 29.61238, lon: -95.18817 },
    { name: "DPS — Houston Spring Mega Center", addr: "4740 Spring Cypress Rd, Spring, TX 77379", lat: 30.05160, lon: -95.49477 },
    { name: "DPS — Humble", addr: "7710 Will Clayton Parkway, Humble, TX 77338", lat: 29.98002, lon: -95.26820 },
    { name: "DPS — Huntsville", addr: "523 State Highway 75 N, Huntsville, TX 77320", lat: 30.73725, lon: -95.58698 },
    { name: "DPS — Hurst", addr: "624 Northeast Loop 820, Hurst, TX 76053", lat: 32.81957, lon: -97.20452 },
    { name: "DPS — Jacksonville", addr: "2028 East Rusk Street, Jacksonville, TX 75766", lat: 31.97005, lon: -95.23041 },
    { name: "DPS — Jasper", addr: "2398 W Gibson, Jasper, TX 75951", lat: 30.90524, lon: -94.01601 },
    { name: "DPS — Jourdanton", addr: "1102 Campbell, Jourdanton, TX 78026", lat: 28.91730, lon: -98.54426 },
    { name: "DPS — Junction", addr: "501 Main Street, Junction, TX 76849", lat: 30.48881, lon: -99.76589 },
    { name: "DPS — Karnes City", addr: "210 W Calvert, Karnes City, TX 78118", lat: 28.88447, lon: -97.89434 },
    { name: "DPS — Kermit", addr: "735 S East Ave, Kermit, TX 79745", lat: 31.85546, lon: -103.08066 },
    { name: "DPS — Kerrville", addr: "311 Sidney Baker Street South, Kerrville, TX 78028", lat: 30.03970, lon: -99.14550 },
    { name: "DPS — Kilgore CDL", addr: "4831 FM 349, Kilgore, TX 75662", lat: 32.40358, lon: -94.80947 },
    { name: "DPS — Killeen", addr: "5100 W Elms Rd, Killeen, TX 76549", lat: 31.10013, lon: -97.79415 },
    { name: "DPS — Kingsville", addr: "100 W King Avenue, Kingsville, TX 78363", lat: 27.51566, lon: -97.86861 },
    { name: "DPS — Lake Worth", addr: "5816 Azle Ave, Lake Worth, TX 76135", lat: 32.81275, lon: -97.40881 },
    { name: "DPS — Lamesa", addr: "608 North Main Street, Lamesa, TX 79331", lat: 32.73573, lon: -101.95502 },
    { name: "DPS — Lampasas", addr: "1690 North US Highway 281, Lampasas, TX 76550", lat: 31.08810, lon: -98.18780 },
    { name: "DPS — Laredo", addr: "1901 Bob Bullock Loop, Laredo, TX 78043", lat: 27.51451, lon: -99.44901 },
    { name: "DPS — Levelland", addr: "624 Avenue H, Levelland, TX 79336", lat: 33.58700, lon: -102.37801 },
    { name: "DPS — Lewisville", addr: "400 N Valley Pkwy, Lewisville, TX 75067", lat: 33.04614, lon: -97.02155 },
    { name: "DPS — Liberty", addr: "2103 Cos Street, Liberty, TX 77575", lat: 30.06102, lon: -94.79451 },
    { name: "DPS — Linden", addr: "604 Hwy 8N, Linden, TX 75563", lat: 33.01235, lon: -94.36547 },
    { name: "DPS — Littlefield", addr: "100 West 6th Drive, Littlefield, TX 79339", lat: 33.91892, lon: -102.33284 },
    { name: "DPS — Livingston", addr: "1735 N Washington Ave, Livingston, TX 77351", lat: 30.72431, lon: -94.93282 },
    { name: "DPS — Livingston CDL", addr: "3161 US-59, Livingston, TX 77351", lat: 30.72449, lon: -94.94498 },
    { name: "DPS — Llano", addr: "1447 TX-71, Llano, TX 78643", lat: 30.73350, lon: -98.66018 },
    { name: "DPS — Lockhart", addr: "110 South Main St, Lockhart, TX 78644", lat: 29.88454, lon: -97.67228 },
    { name: "DPS — Longview", addr: "416 Lake Lamond Road, Longview, TX 75604", lat: 32.49144, lon: -94.76408 },
    { name: "DPS — Lubbock", addr: "1404 Lubbock Business Park Blvd, Lubbock, TX 79403", lat: 33.62736, lon: -101.82087 },
    { name: "DPS — Lufkin", addr: "2809 South John Reditt Drive, Lufkin, TX 75904", lat: 31.33862, lon: -94.72886 },
    { name: "DPS — Madisonville", addr: "103 West Trinity, Madisonville, TX 77864", lat: 30.94839, lon: -95.91350 },
    { name: "DPS — Marble Falls", addr: "1405A Mormon Mill Rd, Marble Falls, TX 78654", lat: 30.60554, lon: -98.24784 },
    { name: "DPS — Marshall", addr: "5215 Loop 390 N, Marshall, TX 75670", lat: 32.54478, lon: -94.36610 },
    { name: "DPS — McAllen", addr: "1414 North Bicentennial Boulevard, McAllen, TX 78501", lat: 26.21779, lon: -98.23603 },
    { name: "DPS — McKinney", addr: "400 Powerhouse Street, McKinney, TX 75071", lat: 33.19765, lon: -96.61545 },
    { name: "DPS — Meridian", addr: "500 Hwy 174, Meridian, TX 76665", lat: 31.92473, lon: -97.65611 },
    { name: "DPS — Midland Mega Center", addr: "2800 Wright Drive, Midland, TX 79706", lat: 31.93372, lon: -102.21607 },
    { name: "DPS — Mineral Wells", addr: "600 FM 1821 North, Mineral Wells, TX 76067", lat: 32.81391, lon: -98.08231 },
    { name: "DPS — Mission", addr: "722 North Breyfogle Road, Mission, TX 78572", lat: 26.23922, lon: -98.36801 },
    { name: "DPS — Monahans", addr: "3600 S Stockton, Monahans, TX 79756", lat: 31.55665, lon: -102.89304 },
    { name: "DPS — Mount Pleasant", addr: "1906 North Jefferson, Mount Pleasant, TX 75455", lat: 33.17550, lon: -94.96953 },
    { name: "DPS — Muleshoe", addr: "303 West 2nd Street, Muleshoe, TX 79347", lat: 34.22503, lon: -102.72638 },
    { name: "DPS — Munday", addr: "121 East Main St, Munday, TX 76371", lat: 33.44908, lon: -99.61961 },
    { name: "DPS — Nacogdoches", addr: "5407 N US Hwy 59, Nacogdoches, TX 75964", lat: 31.67445, lon: -94.67077 },
    { name: "DPS — New Boston", addr: "710 James Bowie Dr, New Boston, TX 75570", lat: 33.47271, lon: -94.40576 },
    { name: "DPS — New Braunfels", addr: "119 Conrads Lane, New Braunfels, TX 78130", lat: 29.75493, lon: -98.06643 },
    { name: "DPS — New Caney", addr: "22354 Justice Dr, New Caney, TX 77357", lat: 30.13976, lon: -95.22719 },
    { name: "DPS — Odessa", addr: "2800 Wright Drive, Midland, TX 79706", lat: 31.93372, lon: -102.21607 },
    { name: "DPS — Orange", addr: "711 Highway 87, Orange, TX 77630", lat: 30.09505, lon: -93.76493 },
    { name: "DPS — Palestine", addr: "1900 Spring, Palestine, TX 75803", lat: 31.77087, lon: -95.65911 },
    { name: "DPS — Pampa", addr: "2909 Perryton Parkway, Pampa, TX 79065", lat: 35.57060, lon: -100.96500 },
    { name: "DPS — Panhandle", addr: "501 Main Street, Panhandle, TX 79068", lat: 35.34567, lon: -101.38162 },
    { name: "DPS — Paris", addr: "4255 Bonham Street, Paris, TX 75460", lat: 33.66034, lon: -95.60474 },
    { name: "DPS — Pearsall", addr: "650 E San Antonio St, Pearsall, TX 78061", lat: 28.88834, lon: -99.09221 },
    { name: "DPS — Pecos", addr: "148 North Frontage Road, Pecos, TX 79772", lat: 31.39975, lon: -103.51807 },
    { name: "DPS — Perryton", addr: "101 Southwest 4th Street, Perryton, TX 79070", lat: 36.39102, lon: -100.80590 },
    { name: "DPS — Pierce", addr: "19692 US Hwy 59, Pierce, TX 77467", lat: 29.23851, lon: -96.20037 },
    { name: "DPS — Plainview", addr: "1108 S Columbia, Plainview, TX 79072", lat: 34.17038, lon: -101.70654 },
    { name: "DPS — Plano", addr: "825 Ohio Drive, Plano, TX 75093", lat: 33.00951, lon: -96.78453 },
    { name: "DPS — Port Arthur", addr: "900 4th Street, Port Arthur, TX 77640", lat: 29.87364, lon: -93.93110 },
    { name: "DPS — Port Lavaca", addr: "201 W Austin St, Port Lavaca, TX 77979", lat: 28.61208, lon: -96.62531 },
    { name: "DPS — Post", addr: "300 West Main Street, Post, TX 79356", lat: 33.19091, lon: -101.38161 },
    { name: "DPS — Presidio", addr: "800 W Cassell, Presidio, TX 79845", lat: 29.56356, lon: -104.37155 },
    { name: "DPS — Quanah", addr: "314 Mercer Street, Quanah, TX 79252", lat: 34.29771, lon: -99.74084 },
    { name: "DPS — Quitman", addr: "211 West Bermuda, Quitman, TX 75783", lat: 32.79537, lon: -95.45263 },
    { name: "DPS — Rio Grande City", addr: "515 N FM 3167, Rio Grande City, TX 78582", lat: 26.39226, lon: -98.85398 },
    { name: "DPS — Roby", addr: "112 North Concho, Roby, TX 79543", lat: 32.74572, lon: -100.37724 },
    { name: "DPS — Rockwall", addr: "915 Whitmore, Rockwall, TX 75087", lat: 32.92186, lon: -96.45073 },
    { name: "DPS — Rosenberg Mega Center", addr: "27750 Southwest Freeway, Rosenberg, TX 77471", lat: 29.53474, lon: -95.80643 },
    { name: "DPS — San Angelo", addr: "1600 West Loop 306, San Angelo, TX 76904", lat: 31.41309, lon: -100.46517 },
    { name: "DPS — San Antonio General McMullen", addr: "1803 South General McMullen, San Antonio, TX 78226", lat: 29.39875, lon: -98.55787 },
    { name: "DPS — San Antonio Leon Valley", addr: "7410 Huebner Road, Leon Valley, TX 78240", lat: 29.50531, lon: -98.61710 },
    { name: "DPS — San Antonio Southeast", addr: "6502 South New Braunfels Ave, San Antonio, TX 78223", lat: 29.36209, lon: -98.45177 },
    { name: "DPS — San Marcos", addr: "1400 Interstate 35 North, San Marcos, TX 78666", lat: 29.88108, lon: -97.92269 },
    { name: "DPS — Seguin", addr: "1440 East Kingsbury, Seguin, TX 78155", lat: 29.58710, lon: -97.94215 },
    { name: "DPS — Seminole", addr: "101 South Main, Seminole, TX 79360", lat: 32.71852, lon: -102.64431 },
    { name: "DPS — Seymour", addr: "101 South Washington, Seymour, TX 76380", lat: 33.58744, lon: -99.26091 },
    { name: "DPS — Sherman", addr: "1413 Texoma Parkway, Sherman, TX 75090", lat: 33.64893, lon: -96.61043 },
    { name: "DPS — Sinton", addr: "1146 E Market St, Sinton, TX 78387", lat: 28.03767, lon: -97.49581 },
    { name: "DPS — Snyder", addr: "501 East 37th St, Snyder, TX 79549", lat: 32.70449, lon: -100.88853 },
    { name: "DPS — Sonora", addr: "102 N Walter Ave, Sonora, TX 76950", lat: 30.56673, lon: -100.64286 },
    { name: "DPS — Stanton", addr: "301 North Peter St, Stanton, TX 79782", lat: 32.13425, lon: -101.79201 },
    { name: "DPS — Stephenville", addr: "850 East Road, Stephenville, TX 76401", lat: 32.23658, lon: -98.20064 },
    { name: "DPS — Sulphur Springs", addr: "1528 East Shannon Road, Sulphur Springs, TX 75482", lat: 33.14150, lon: -95.56753 },
    { name: "DPS — Sweetwater", addr: "600 NW Georgia, Sweetwater, TX 79556", lat: 32.45034, lon: -100.39966 },
    { name: "DPS — Taylor", addr: "301 W 5th St, Taylor, TX 76574", lat: 30.57132, lon: -97.41219 },
    { name: "DPS — Temple", addr: "6612 South General Bruce, Temple, TX 76502", lat: 31.07114, lon: -97.42392 },
    { name: "DPS — Terrell", addr: "111 Tejas Drive, Terrell, TX 75160", lat: 32.72504, lon: -96.31590 },
    { name: "DPS — Texarkana", addr: "1516 Hampton Road, Texarkana, TX 75503", lat: 33.46940, lon: -94.06031 },
    { name: "DPS — Texas City", addr: "1325 Amburn Road, Texas City, TX 77591", lat: 29.39585, lon: -95.00346 },
    { name: "DPS — Tolar", addr: "105 Pine Lane, Tolar, TX 76476", lat: 32.38935, lon: -97.91977 },
    { name: "DPS — Tulia", addr: "310 West Broadway, Tulia, TX 79088", lat: 34.53726, lon: -101.76739 },
    { name: "DPS — Tyler", addr: "4700 University Blvd, Tyler, TX 75707", lat: 32.31439, lon: -95.23857 },
    { name: "DPS — Universal City", addr: "1633 Pat Booker Road, Universal City, TX 78148", lat: 29.55234, lon: -98.30519 },
    { name: "DPS — Uvalde", addr: "2901 E Main St, Uvalde, TX 78801", lat: 29.21051, lon: -99.78323 },
    { name: "DPS — Van Horn", addr: "1300 Northwest Frontage Road, Van Horn, TX 79855", lat: 31.03663, lon: -104.84590 },
    { name: "DPS — Vega", addr: "100 S Main Street, Vega, TX 79092", lat: 35.24705, lon: -102.42866 },
    { name: "DPS — Vernon", addr: "1700 Wilbarger Street, Vernon, TX 76384", lat: 34.15321, lon: -99.28389 },
    { name: "DPS — Victoria", addr: "8802 North Navarro, Victoria, TX 77904", lat: 28.87567, lon: -96.99753 },
    { name: "DPS — Waco", addr: "1617 East Crest Drive, Waco, TX 76705", lat: 31.64027, lon: -97.09432 },
    { name: "DPS — Wallisville", addr: "20906 Interstate 10, Wallisville, TX 77597", lat: 29.83550, lon: -94.74186 },
    { name: "DPS — Waxahachie", addr: "1720 E Main St, Waxahachie, TX 75165", lat: 32.38514, lon: -96.84618 },
    { name: "DPS — Weatherford", addr: "1309 South Bowie Drive, Weatherford, TX 76086", lat: 32.74503, lon: -97.81439 },
    { name: "DPS — Weslaco", addr: "2525 N International Blvd, Weslaco, TX 78599", lat: 26.18550, lon: -97.95949 },
    { name: "DPS — Wichita Falls", addr: "5505 North Central Freeway, Wichita Falls, TX 76306", lat: 33.90046, lon: -98.50208 },
    { name: "DPS — Woodville", addr: "1001 West Bluff Street, Woodville, TX 75979", lat: 30.77522, lon: -94.42640 },
    { name: "DPS — Zapata", addr: "607 North US Highway 83, Zapata, TX 78076", lat: 26.86639, lon: -99.18589 },
  ],
  NC: [
    { name: "NCDMV — Aberdeen", addr: "521 South Sandhills Boulevard, Aberdeen, NC 28315", lat: 35.12820, lon: -79.43186 },
    { name: "NCDMV — Ahoskie", addr: "242 NC 42 West, Ahoskie, NC 27910", lat: 36.28552, lon: -76.98577 },
    { name: "NCDMV — Albemarle", addr: "611 Concord Road, Albemarle, NC 28001", lat: 35.35542, lon: -80.21728 },
    { name: "NCDMV — Asheboro", addr: "2754 US Highway 220, Asheboro, NC 27203", lat: 35.70791, lon: -79.81364 },
    { name: "NCDMV — Asheville (Patton Avenue)", addr: "1624 Patton Avenue, Asheville, NC 28806", lat: 35.57153, lon: -82.61825 },
    { name: "NCDMV — Asheville (Tunnel Road)", addr: "600 Tunnel Road, Asheville, NC 28805", lat: 35.58684, lon: -82.51055 },
    { name: "NCDMV — Bayboro", addr: "13451 NC Highway 55, Bayboro, NC 28515", lat: 35.14379, lon: -76.78415 },
    { name: "NCDMV — Belhaven", addr: "215 East Main Street, Belhaven, NC 27810", lat: 35.53907, lon: -76.62159 },
    { name: "NCDMV — Boone", addr: "4469 Bamboo Rd, Boone, NC 28607", lat: 36.20549, lon: -81.62316 },
    { name: "NCDMV — Brevard", addr: "304 South Broad St, Brevard, NC 28712", lat: 35.22920, lon: -82.73744 },
    { name: "NCDMV — Bryson City", addr: "2650 Governors Island Road, Bryson City, NC 28713", lat: 35.43113, lon: -83.41811 },
    { name: "NCDMV — Burgaw", addr: "805 South Walker St, Burgaw, NC 28425", lat: 34.54452, lon: -77.91606 },
    { name: "NCDMV — Burnsville", addr: "116 North Main Street, Burnsville, NC 28714", lat: 35.92264, lon: -82.29935 },
    { name: "NCDMV — Carrboro", addr: "104 Carrboro Plaza, Carrboro, NC 27510", lat: 35.91733, lon: -79.09598 },
    { name: "NCDMV — Cary", addr: "211 North Academy Street, Cary, NC 27512", lat: 35.78844, lon: -78.78233 },
    { name: "NCDMV — Charlotte (Arrowood)", addr: "201-A West Arrowood Road, Charlotte, NC 28217", lat: 35.14523, lon: -80.92265 },
    { name: "NCDMV — Charlotte (Brookshire Boulevard)", addr: "6016 Brookshire Boulevard, Charlotte, NC 28216", lat: 35.28801, lon: -80.90905 },
    { name: "NCDMV — Charlotte (Executive Circle)", addr: "6635 Executive Circle, Charlotte, NC 28227", lat: 35.20465, lon: -80.73104 },
    { name: "NCDMV — Charlotte (North Tryon)", addr: "8446 North Tryon Street, Charlotte, NC 28213", lat: 35.30325, lon: -80.75128 },
    { name: "NCDMV — Clayton", addr: "208 Butternut Lane, Clayton, NC 27520", lat: 35.63698, lon: -78.48703 },
    { name: "NCDMV — Clinton", addr: "305 North Boulevard, Clinton, NC 28328", lat: 35.01634, lon: -78.33260 },
    { name: "NCDMV — Clyde", addr: "290 Lee Road, Clyde, NC 28721", lat: 35.53344, lon: -82.91069 },
    { name: "NCDMV — Columbia", addr: "403 Main Street, Columbia, NC 27925", lat: 35.91756, lon: -76.25194 },
    { name: "NCDMV — Columbus", addr: "130 Ward Street, Columbus, NC 28722", lat: 35.25069, lon: -82.19828 },
    { name: "NCDMV — Concord", addr: "2192 Kannapolis Highway, Concord, NC 28027", lat: 35.44519, lon: -80.61381 },
    { name: "NCDMV — Creedmoor", addr: "108 Wilton Avenue, Creedmoor, NC 27522", lat: 36.12205, lon: -78.68322 },
    { name: "NCDMV — Currituck", addr: "2826 Caratoke Highway, Currituck, NC 27929", lat: 36.45274, lon: -76.02435 },
    { name: "NCDMV — Denton", addr: "201 W Salisbury Street, Denton, NC 27239", lat: 35.63336, lon: -80.11694 },
    { name: "NCDMV — Dunn", addr: "110 North Orange Street, Dunn, NC 28334", lat: 35.30769, lon: -78.60933 },
    { name: "NCDMV — Durham (South Miami)", addr: "101 South Miami Boulevard, Durham, NC 27703", lat: 35.98704, lon: -78.86252 },
    { name: "NCDMV — Durham (South Roxboro)", addr: "3825 South Roxboro Street, Durham, NC 27713", lat: 35.94754, lon: -78.92181 },
    { name: "NCDMV — Edenton", addr: "705 North Broad Street, Edenton, NC 27932", lat: 36.06971, lon: -76.60492 },
    { name: "NCDMV — Elizabeth City", addr: "1164 US 17 S, Elizabeth City, NC 27909", lat: 36.28985, lon: -76.25215 },
    { name: "NCDMV — Elizabethtown", addr: "107 North Gillespie Street, Elizabethtown, NC 28337", lat: 34.63231, lon: -78.61683 },
    { name: "NCDMV — Elkin", addr: "1687 North Bridge Street, Elkin, NC 28621", lat: 36.27629, lon: -80.85287 },
    { name: "NCDMV — Fairmont", addr: "103 Cottage Street, Fairmont, NC 28340", lat: 34.49431, lon: -79.11406 },
    { name: "NCDMV — Farmville", addr: "3672 N Main Street, Farmville, NC 27828", lat: 35.59868, lon: -77.58393 },
    { name: "NCDMV — Fayetteville (Elm St)", addr: "841 Elm St, Fayetteville, NC 28303", lat: 35.07524, lon: -78.92588 },
    { name: "NCDMV — Fayetteville (Gillespie Street)", addr: "2435 Gillespie Street, Fayetteville, NC 28303", lat: 35.01493, lon: -78.89739 },
    { name: "NCDMV — Forest City", addr: "596 Withrow Road, Forest City, NC 28043", lat: 35.34305, lon: -81.89935 },
    { name: "NCDMV — Fort Bragg", addr: "Knox Street, Fort Bragg, NC 28307", lat: 35.14031, lon: -79.15415 },
    { name: "NCDMV — Franklin", addr: "185 Industrial Park Road, Franklin, NC 28734", lat: 35.18232, lon: -83.38154 },
    { name: "NCDMV — Fuquay-Varina", addr: "131 South Fuquay Ave, Fuquay-Varina, NC 27526", lat: 35.58380, lon: -78.79818 },
    { name: "NCDMV — Garner", addr: "222 Forest Hills Drive, Garner, NC 27529", lat: 35.70761, lon: -78.62283 },
    { name: "NCDMV — Gastonia", addr: "2560 West Franklin Avenue, Gastonia, NC 28052", lat: 35.26227, lon: -81.18382 },
    { name: "NCDMV — Gatesville", addr: "130 US Highway 158 West, Gatesville, NC 27938", lat: 36.40349, lon: -76.75301 },
    { name: "NCDMV — Goldsboro", addr: "701 West Grantham St, Goldsboro, NC 27530", lat: 35.39857, lon: -78.00068 },
    { name: "NCDMV — Graham", addr: "111 East Crescent Square, Graham, NC 27253", lat: 36.06903, lon: -79.40058 },
    { name: "NCDMV — Greensboro (Coliseum Blvd)", addr: "2391 Coliseum Blvd, Greensboro, NC 27403", lat: 36.04289, lon: -79.81695 },
    { name: "NCDMV — Greensboro (East Market)", addr: "2527 East Market Street, Greensboro, NC 27401", lat: 36.07784, lon: -79.75413 },
    { name: "NCDMV — Greenville", addr: "3400 South Memorial Dr, Greenville, NC 27834", lat: 35.57133, lon: -77.39999 },
    { name: "NCDMV — Hamlet", addr: "200 Richmond Tech Inst Road, Hamlet, NC 28345", lat: 34.88637, lon: -79.69721 },
    { name: "NCDMV — Hatteras", addr: "1498 NC Highway 12, Hatteras, NC 27943", lat: 35.21946, lon: -75.69034 },
    { name: "NCDMV — Havelock", addr: "300 Miller Boulevard, Havelock, NC 28532", lat: 34.88285, lon: -76.91585 },
    { name: "NCDMV — Hayesville", addr: "1 Riverside Circle, Hayesville, NC 28904", lat: 35.04690, lon: -83.81637 },
    { name: "NCDMV — Henderson", addr: "1080 Eastern Boulevard, Henderson, NC 27536", lat: 36.32559, lon: -78.38182 },
    { name: "NCDMV — Hendersonville", addr: "125 Baystone Drive, Hendersonville, NC 28791", lat: 35.31873, lon: -82.46095 },
    { name: "NCDMV — Hertford", addr: "114 Grub Street, Hertford, NC 27944", lat: 36.19016, lon: -76.46605 },
    { name: "NCDMV — Hickory", addr: "1158 Lenoir-Rhyne Blvd SE, Hickory, NC 28602", lat: 35.71711, lon: -81.31411 },
    { name: "NCDMV — High Point", addr: "650 Francis Street, High Point, NC 27263", lat: 35.93806, lon: -79.98196 },
    { name: "NCDMV — Hillsborough", addr: "1201 Highway 70 West, Hillsborough, NC 27278", lat: 36.07538, lon: -79.09940 },
    { name: "NCDMV — Hudson", addr: "309 Pine Mountain Road, Hudson, NC 28638", lat: 35.84683, lon: -81.47647 },
    { name: "NCDMV — Jackson", addr: "Church Street, Jackson, NC 27845", lat: 36.39599, lon: -77.41858 },
    { name: "NCDMV — Jacksonville", addr: "229 Wilmington Highway, Jacksonville, NC 28540", lat: 34.75081, lon: -77.45264 },
    { name: "NCDMV — Jefferson", addr: "303 Court Street, Jefferson, NC 28640", lat: 36.42167, lon: -81.47041 },
    { name: "NCDMV — Kenansville", addr: "133 Routledge Street, Kenansville, NC 28349", lat: 34.96239, lon: -77.96221 },
    { name: "NCDMV — Kernersville", addr: "810A North Main St, Kernersville, NC 27284", lat: 36.12502, lon: -80.07031 },
    { name: "NCDMV — Kill Devil Hills", addr: "1632 N Croatan Highway, Kill Devil Hills, NC 27948", lat: 36.03002, lon: -75.67085 },
    { name: "NCDMV — Kinston", addr: "2214 West Vernon Avenue, Kinston, NC 28501", lat: 35.26932, lon: -77.61404 },
    { name: "NCDMV — Laurinburg", addr: "1421 West Boulevard, Laurinburg, NC 28352", lat: 34.76594, lon: -79.47655 },
    { name: "NCDMV — Lexington", addr: "2314 South Main Street, Lexington, NC 27292", lat: 35.80427, lon: -80.28048 },
    { name: "NCDMV — Lillington", addr: "1005 Edwards Drive, Lillington, NC 27546", lat: 35.39228, lon: -78.80333 },
    { name: "NCDMV — Lincolnton", addr: "1450 North Aspen Street, Lincolnton, NC 28092", lat: 35.49023, lon: -81.24940 },
    { name: "NCDMV — Louisburg", addr: "86 Tanglewood Dr, Louisburg, NC 27549", lat: 36.09736, lon: -78.29400 },
    { name: "NCDMV — Lumberton", addr: "4650 Kahn Drive, Lumberton, NC 28358", lat: 34.66018, lon: -79.00835 },
    { name: "NCDMV — Manteo", addr: "517 Budleigh Street, Manteo, NC 27954", lat: 35.90834, lon: -75.67511 },
    { name: "NCDMV — Marion", addr: "3975 NC 226 S, Marion, NC 28752", lat: 35.65291, lon: -81.95554 },
    { name: "NCDMV — Marshall", addr: "164 North Main Street, Marshall, NC 28753", lat: 35.79789, lon: -82.68616 },
    { name: "NCDMV — Mocksville", addr: "1378 Salisbury Road, Mocksville, NC 27028", lat: 35.86804, lon: -80.55173 },
    { name: "NCDMV — Monroe", addr: "3122 US 74 W, Monroe, NC 28110", lat: 35.02545, lon: -80.60444 },
    { name: "NCDMV — Mooresville", addr: "533 Patterson Ave, Mooresville, NC 28115", lat: 35.59223, lon: -80.80638 },
    { name: "NCDMV — Morehead City", addr: "5347 US 70 W, Morehead City, NC 28557", lat: 34.72294, lon: -76.72604 },
    { name: "NCDMV — Morganton", addr: "260 Enola Road, Morganton, NC 28655", lat: 35.71915, lon: -81.67306 },
    { name: "NCDMV — Mount Airy", addr: "155 Patrol Station Rd, Mount Airy, NC 27030", lat: 36.52869, lon: -80.62952 },
    { name: "NCDMV — Mount Holly", addr: "785 West Charlotte Avenue, Mount Holly, NC 28120", lat: 35.30339, lon: -81.02712 },
    { name: "NCDMV — Mount Olive", addr: "110 North Chestnut St, Mount Olive, NC 28365", lat: 35.20000, lon: -78.06476 },
    { name: "NCDMV — Murphy", addr: "17 Peachtree Street, Murphy, NC 28906", lat: 35.08763, lon: -84.03395 },
    { name: "NCDMV — New Bern", addr: "2106 Neuse Boulevard, New Bern, NC 28560", lat: 35.11408, lon: -77.07042 },
    { name: "NCDMV — Newland", addr: "301 Cranberry Street, Newland, NC 28657", lat: 36.08876, lon: -81.92802 },
    { name: "NCDMV — Newton", addr: "1033 Smyre Farm Road, Newton, NC 28658", lat: 35.63090, lon: -81.22018 },
    { name: "NCDMV — Ocracoke", addr: "Highway 12, Ocracoke, NC 27960", lat: 35.11515, lon: -75.98446 },
    { name: "NCDMV — Oxford", addr: "100 Providence Road, Oxford, NC 27565", lat: 36.30413, lon: -78.60812 },
    { name: "NCDMV — Pembroke", addr: "100 South Union Chapel Road, Pembroke, NC 28372", lat: 34.68007, lon: -79.19335 },
    { name: "NCDMV — Plymouth", addr: "302 Waters Street, Plymouth, NC 27962", lat: 35.86683, lon: -76.74856 },
    { name: "NCDMV — Polkton", addr: "US 74 W, Polkton, NC 28135", lat: 35.00209, lon: -80.21093 },
    { name: "NCDMV — Raeford", addr: "520 West Donaldson St, Raeford, NC 28376", lat: 34.98100, lon: -79.22420 },
    { name: "NCDMV — Raleigh (Avent Ferry)", addr: "3231 Avent Ferry Rd, Raleigh, NC 27606", lat: 35.76646, lon: -78.69589 },
    { name: "NCDMV — Raleigh (Lane Street)", addr: "100 Lane Street, Raleigh, NC 27601", lat: 35.78374, lon: -78.63779 },
    { name: "NCDMV — Raleigh (Spring Forest)", addr: "2431 Spring Forest Road, Raleigh, NC 27615", lat: 35.86104, lon: -78.60016 },
    { name: "NCDMV — Red Springs", addr: "218 S Main Street, Red Springs, NC 28377", lat: 34.81475, lon: -79.18289 },
    { name: "NCDMV — Roanoke Rapids", addr: "26 Three Bridges Rd, Roanoke Rapids, NC 27870", lat: 36.45580, lon: -77.65735 },
    { name: "NCDMV — Robbins", addr: "100 S Middleton Street, Robbins, NC 27325", lat: 35.43371, lon: -79.58712 },
    { name: "NCDMV — Robbinsville", addr: "196 Knight Street, Robbinsville, NC 28771", lat: 35.32822, lon: -83.80992 },
    { name: "NCDMV — Rocky Mount", addr: "2617 North Wesleyan Blvd, Rocky Mount, NC 27801", lat: 35.99967, lon: -77.77633 },
    { name: "NCDMV — Roxboro", addr: "3434 Burlington Road, Roxboro, NC 27573", lat: 36.35437, lon: -79.04302 },
    { name: "NCDMV — Saint Pauls", addr: "210 West Blue Street, Saint Pauls, NC 28384", lat: 34.80585, lon: -78.97295 },
    { name: "NCDMV — Salisbury", addr: "5780 South Main St, Salisbury, NC 28144", lat: 35.60252, lon: -80.54279 },
    { name: "NCDMV — Sanford", addr: "2210 Carthage St, Sanford, NC 27330", lat: 35.47955, lon: -79.18131 },
    { name: "NCDMV — Scotland Neck", addr: "1310 Main Street, Scotland Neck, NC 27874", lat: 36.13349, lon: -77.42133 },
    { name: "NCDMV — Shallotte", addr: "5298-3 South Main St, Shallotte, NC 28459", lat: 33.97323, lon: -78.38584 },
    { name: "NCDMV — Shelby", addr: "1914 East Dixon Blvd, Shelby, NC 28152", lat: 35.26874, lon: -81.48722 },
    { name: "NCDMV — Siler City", addr: "2nd Avenue, Siler City, NC 27344", lat: 35.71957, lon: -79.45791 },
    { name: "NCDMV — Smithfield", addr: "3783 US 301 S, Smithfield, NC 27577", lat: 35.46832, lon: -78.38440 },
    { name: "NCDMV — Snow Hill", addr: "229 Kingold Blvd, Snow Hill, NC 28580", lat: 35.45259, lon: -77.68396 },
    { name: "NCDMV — Southport", addr: "215 North Atlantic Ave, Southport, NC 28461", lat: 33.92040, lon: -78.01740 },
    { name: "NCDMV — Sparta", addr: "40 Alleghany Street, Sparta, NC 28675", lat: 36.50669, lon: -81.12040 },
    { name: "NCDMV — Spruce Pine", addr: "106 Highland Avenue, Spruce Pine, NC 28777", lat: 35.91132, lon: -82.07253 },
    { name: "NCDMV — Statesville", addr: "905 Carolina Avenue N, Statesville, NC 28677", lat: 35.80616, lon: -80.87856 },
    { name: "NCDMV — Swan Quarter", addr: "11 Main Street, Swan Quarter, NC 27885", lat: 35.40694, lon: -76.32840 },
    { name: "NCDMV — Sylva", addr: "338 Keener Street, Sylva, NC 28779", lat: 35.37375, lon: -83.22812 },
    { name: "NCDMV — Tabor City", addr: "119 Lynwood Norris Road, Tabor City, NC 28463", lat: 34.15868, lon: -78.85985 },
    { name: "NCDMV — Tarboro", addr: "120 Granville Street, Tarboro, NC 27886", lat: 35.89572, lon: -77.53326 },
    { name: "NCDMV — Taylorsville", addr: "2390 NC Highway 90 E, Taylorsville, NC 28681", lat: 35.92194, lon: -81.17634 },
    { name: "NCDMV — Thomasville", addr: "1033 Randolph Street, Thomasville, NC 27360", lat: 35.86512, lon: -80.06985 },
    { name: "NCDMV — Troy", addr: "168 Glenn Road, Troy, NC 27371", lat: 35.37922, lon: -79.88097 },
    { name: "NCDMV — Wallace", addr: "320 East Murray Street, Wallace, NC 28466", lat: 34.73811, lon: -77.99358 },
    { name: "NCDMV — Walnut Cove", addr: "111 West 6th Street, Walnut Cove, NC 27052", lat: 36.30039, lon: -80.14667 },
    { name: "NCDMV — Washington", addr: "1821 Carolina Avenue, Washington, NC 27889", lat: 35.55037, lon: -77.05772 },
    { name: "NCDMV — Wendell", addr: "2851 Wendell Blvd, Wendell, NC 27591", lat: 35.79461, lon: -78.38000 },
    { name: "NCDMV — Wentworth", addr: "7792 NC Hwy 87, Wentworth, NC 27320", lat: 36.40014, lon: -79.77448 },
    { name: "NCDMV — Whiteville", addr: "917 Washington Street, Whiteville, NC 28472", lat: 34.33697, lon: -78.72141 },
    { name: "NCDMV — Wilkesboro", addr: "1230 School Street, Wilkesboro, NC 28697", lat: 36.13664, lon: -81.17702 },
    { name: "NCDMV — Williamston", addr: "305 East Main Street, Williamston, NC 27892", lat: 35.85634, lon: -77.05179 },
    { name: "NCDMV — Wilmington (Carolina Beach)", addr: "2390 Carolina Beach Road, Wilmington, NC 28401", lat: 34.19522, lon: -77.93660 },
    { name: "NCDMV — Wilmington (One Station)", addr: "One Station Road, Wilmington, NC 28405", lat: 34.25654, lon: -77.83071 },
    { name: "NCDMV — Wilson", addr: "1822 Goldsboro Street SW, Wilson, NC 27893", lat: 35.70730, lon: -77.92647 },
    { name: "NCDMV — Windsor", addr: "111 South York Street, Windsor, NC 27983", lat: 35.99881, lon: -76.94495 },
    { name: "NCDMV — Winston-Salem (North Patterson)", addr: "3637 North Patterson Avenue, Winston-Salem, NC 27105", lat: 36.13937, lon: -80.24321 },
    { name: "NCDMV — Winston-Salem (Silas Creek)", addr: "2001 Silas Creek Parkway, Winston-Salem, NC 27103", lat: 36.06997, lon: -80.26817 },
    { name: "NCDMV — Yadkinville", addr: "225 Ash St, Yadkinville, NC 27055", lat: 36.11711, lon: -80.65697 },
    { name: "NCDMV — Yanceyville", addr: "958 Fire Tower Road, Yanceyville, NC 27379", lat: 36.41442, lon: -79.33436 },
  ],
  TN: [
    { name: "Driver Services — Alcoa", addr: "244 South Calderwood Street, Alcoa, TN 37701", lat: 35.76059, lon: -83.97636 },
    { name: "Driver Services — Athens", addr: "150 Plaza Circle, Athens, TN 37303", lat: 35.44289, lon: -84.59301 },
    { name: "Driver Services — Bartlett Express", addr: "6340 Summer Avenue, Bartlett, TN 38134", lat: 35.19497, lon: -89.84514 },
    { name: "Driver Services — Blountville", addr: "3769 Highway 11-W, Blountville, TN 37617", lat: 36.53316, lon: -82.32681 },
    { name: "Driver Services — Bonny Oaks (Chattanooga)", addr: "6502 Bonny Oaks Drive, Chattanooga, TN 37416", lat: 35.07361, lon: -85.16359 },
    { name: "Driver Services — Clarksville (Dunbar Cave)", addr: "220 West Dunbar Cave Road, Clarksville, TN 37040", lat: 36.55750, lon: -87.33140 },
    { name: "Driver Services — Clarksville (Hornbuckle)", addr: "635 Hornbuckle Road, Clarksville, TN 37040", lat: 36.52673, lon: -87.21776 },
    { name: "Driver Services — Cleveland", addr: "301 James Asbury Drive NW, Cleveland, TN 37312", lat: 35.21055, lon: -84.87200 },
    { name: "Driver Services — Columbia", addr: "1701 Hampshire Pike, Columbia, TN 38401", lat: 35.61849, lon: -87.10171 },
    { name: "Driver Services — Cookeville", addr: "4600 S Jefferson Ave, Cookeville, TN 38506", lat: 36.10001, lon: -85.50273 },
    { name: "Driver Services — Covington", addr: "220 Highway 51 North, Covington, TN 38019", lat: 35.56429, lon: -89.64651 },
    { name: "Driver Services — Crossville", addr: "136 Dooley Street, Crossville, TN 38555", lat: 35.96036, lon: -85.03165 },
    { name: "Driver Services — Downtown Express (Nashville)", addr: "312 Rosa L Parks Blvd, Nashville, TN 37203", lat: 36.15995, lon: -86.78277 },
    { name: "Driver Services — Dyersburg", addr: "180 Highway 51 Bypass, Dyersburg, TN 38024", lat: 36.03252, lon: -89.38664 },
    { name: "Driver Services — East Shelby (Memphis)", addr: "3200 E Shelby Drive, Memphis, TN 38118", lat: 35.02089, lon: -89.96005 },
    { name: "Driver Services — Elizabethton", addr: "1741 Highway 19 E Bypass, Elizabethton, TN 37643", lat: 36.34878, lon: -82.21076 },
    { name: "Driver Services — Fayetteville", addr: "4110 Thornton Taylor Parkway, Fayetteville, TN 37334", lat: 35.14392, lon: -86.56824 },
    { name: "Driver Services — Franklin", addr: "3830 Carothers Parkway, Franklin, TN 37067", lat: 35.90886, lon: -86.82302 },
    { name: "Driver Services — Gallatin", addr: "855 N Bluejay Way, Gallatin, TN 37066", lat: 36.38830, lon: -86.44759 },
    { name: "Driver Services — Greeneville", addr: "1210 Hal Henard Road, Greeneville, TN 37743", lat: 36.15484, lon: -82.88309 },
    { name: "Driver Services — Hart Lane (Nashville)", addr: "624 Hart Lane, Nashville, TN 37216", lat: 36.21720, lon: -86.74206 },
    { name: "Driver Services — Hickory Hollow (Antioch)", addr: "2460 Morris Gentry Blvd, Antioch, TN 37013", lat: 36.06006, lon: -86.67222 },
    { name: "Driver Services — Jackson", addr: "100 Benchmark Circle, Jackson, TN 38301", lat: 35.63630, lon: -88.91950 },
    { name: "Driver Services — Jasper", addr: "4950 Main Street, Jasper, TN 37347", lat: 35.07322, lon: -85.61615 },
    { name: "Driver Services — Johnson City", addr: "4717 Lake Park Dr, Johnson City, TN 37615", lat: 36.38316, lon: -82.43086 },
    { name: "Driver Services — Lebanon", addr: "204 Maddox Simpson Parkway, Lebanon, TN 37090", lat: 36.17334, lon: -86.29817 },
    { name: "Driver Services — McMinnville", addr: "594 Vervilla Road, McMinnville, TN 37110", lat: 35.63282, lon: -85.82070 },
    { name: "Driver Services — Millington", addr: "5019 W Union Road, Millington, TN 38053", lat: 35.36312, lon: -89.89659 },
    { name: "Driver Services — Morristown", addr: "1551 East Morris Blvd, Morristown, TN 37813", lat: 36.21823, lon: -83.27459 },
    { name: "Driver Services — Murfreesboro", addr: "1035 Samsonite Blvd, Murfreesboro, TN 37129", lat: 35.82923, lon: -86.40899 },
    { name: "Driver Services — Murfreesboro Express", addr: "3906 Blaze Drive, Murfreesboro, TN 37129", lat: 35.85685, lon: -86.47272 },
    { name: "Driver Services — Oak Ridge", addr: "475 Oak Ridge Tpke, Oak Ridge, TN 37830", lat: 36.03679, lon: -84.22241 },
    { name: "Driver Services — Oakland", addr: "160 Beau Tisdale Drive, Oakland, TN 38060", lat: 35.22741, lon: -89.49796 },
    { name: "Driver Services — Paris", addr: "1120 Tyson Avenue, Paris, TN 38242", lat: 36.28805, lon: -88.32177 },
    { name: "Driver Services — Red Bank (Chattanooga)", addr: "4873 Dayton Blvd, Chattanooga, TN 37415", lat: 35.13986, lon: -85.27808 },
    { name: "Driver Services — Rockwood", addr: "1070 N Gateway Avenue, Rockwood, TN 37854", lat: 35.88314, lon: -84.65855 },
    { name: "Driver Services — Savannah", addr: "1016 Pickwick Street, Savannah, TN 38372", lat: 35.22593, lon: -88.24621 },
    { name: "Driver Services — Sevierville", addr: "1220 Graduate Drive, Sevierville, TN 37862", lat: 35.86729, lon: -83.56572 },
    { name: "Driver Services — Shelbyville", addr: "200 Dover Street, Shelbyville, TN 37160", lat: 35.49177, lon: -86.47193 },
    { name: "Driver Services — Springfield", addr: "4676 Highway 41 North, Springfield, TN 37172", lat: 36.50921, lon: -86.88500 },
    { name: "Driver Services — Strawberry Plains (Knoxville)", addr: "7320 Region Lane, Knoxville, TN 37914", lat: 36.00157, lon: -83.77260 },
    { name: "Driver Services — Summer Avenue (Memphis)", addr: "5266 Summer Avenue, Memphis, TN 38134", lat: 35.15701, lon: -89.88659 },
    { name: "Driver Services — Trenton", addr: "2211 Highway 45 South Bypass, Trenton, TN 38382", lat: 35.98081, lon: -88.94168 },
    { name: "Driver Services — Tullahoma", addr: "307 Industrial Blvd, Tullahoma, TN 37388", lat: 35.36436, lon: -86.17967 },
    { name: "Driver Services — Union City", addr: "1604 B West Reelfoot Avenue, Union City, TN 38261", lat: 36.40247, lon: -89.08864 },
    { name: "Driver Services — West Knoxville", addr: "209 Gore Road, Knoxville, TN 37919", lat: 35.93231, lon: -83.99784 },
  ],
  LA: [
    { name: "OMV — Abbeville", addr: "112 Rue Centre, Abbeville, LA 70510", lat: 29.97113, lon: -92.09105 },
    { name: "OMV — Alexandria", addr: "5602 Coliseum Blvd, Alexandria, LA 71303", lat: 31.29707, lon: -92.48840 },
    { name: "OMV — Amite", addr: "112 Mulberry St East, Amite, LA 70422", lat: 30.72796, lon: -90.50805 },
    { name: "OMV — Arcadia", addr: "2428 Second St, Arcadia, LA 71001", lat: 32.54897, lon: -92.92178 },
    { name: "OMV — Baker", addr: "2250 Main Street, Baker, LA 70714", lat: 30.59945, lon: -91.16543 },
    { name: "OMV — Bastrop", addr: "510 N Washington St, Bastrop, LA 71220", lat: 32.78231, lon: -91.91412 },
    { name: "OMV — Baton Rouge", addr: "7701 Independence Blvd, Baton Rouge, LA 70806", lat: 30.44531, lon: -91.10912 },
    { name: "OMV — Bogalusa", addr: "62041 Benjamin Rd, Bogalusa, LA 70427", lat: 30.79102, lon: -89.84869 },
    { name: "OMV — Bossier City", addr: "3802 Kilpatrick Blvd, Bossier City, LA 71112", lat: 32.51589, lon: -93.73365 },
    { name: "OMV — Breaux Bridge", addr: "101 Berard Street, Breaux Bridge, LA 70517", lat: 30.27269, lon: -91.90035 },
    { name: "OMV — Bunkie", addr: "1136 Shirley Rd, Bunkie, LA 71322", lat: 30.95938, lon: -92.19615 },
    { name: "OMV — Clinton", addr: "11086 Bank Street, Clinton, LA 70722", lat: 30.86358, lon: -91.01907 },
    { name: "OMV — Colfax", addr: "306 8th St, Colfax, LA 71417", lat: 31.51728, lon: -92.70582 },
    { name: "OMV — Columbia", addr: "232 Riser Street, Columbia, LA 71418", lat: 32.10436, lon: -92.07734 },
    { name: "OMV — Coushatta", addr: "1213 E Carroll, Coushatta, LA 71019", lat: 32.01640, lon: -93.32945 },
    { name: "OMV — Crowley", addr: "1710 West Second Street, Crowley, LA 70526", lat: 30.21409, lon: -92.37458 },
    { name: "OMV — DeQuincy", addr: "101 S Pine Street, DeQuincy, LA 70633", lat: 30.44980, lon: -93.43527 },
    { name: "OMV — DeRidder", addr: "2366 Hwy 190 West, DeRidder, LA 70634", lat: 30.84620, lon: -93.28928 },
    { name: "OMV — Denham Springs", addr: "527 Florida Blvd, Denham Springs, LA 70726", lat: 30.46416, lon: -90.98708 },
    { name: "OMV — Donaldsonville", addr: "413 Williams St, Donaldsonville, LA 70346", lat: 30.10047, lon: -90.99054 },
    { name: "OMV — Eunice", addr: "251 West Park, Eunice, LA 70535", lat: 30.49437, lon: -92.41763 },
    { name: "OMV — Farmerville", addr: "303 C East Waters St, Farmerville, LA 71241", lat: 32.77473, lon: -92.40467 },
    { name: "OMV — Franklinton", addr: "301 11th Avenue, Franklinton, LA 70438", lat: 30.85453, lon: -90.15801 },
    { name: "OMV — Golden Meadow", addr: "500 N Alex Plaisance, Golden Meadow, LA 70357", lat: 29.37911, lon: -90.26008 },
    { name: "OMV — Gonzales", addr: "1056 E Worthey St, Gonzales, LA 70737", lat: 30.23853, lon: -90.92010 },
    { name: "OMV — Gramercy", addr: "827 N Pine St, Gramercy, LA 70052", lat: 30.06027, lon: -90.70044 },
    { name: "OMV — Greensburg", addr: "38 South Main, Greensburg, LA 70441", lat: 30.82908, lon: -90.66969 },
    { name: "OMV — Hahnville", addr: "15045 River Road, Hahnville, LA 70057", lat: 29.96379, lon: -90.40664 },
    { name: "OMV — Hammond", addr: "1320 N Morrison, Hammond, LA 70401", lat: 30.50436, lon: -90.46120 },
    { name: "OMV — Hammond (Robert St)", addr: "219 E Robert Street, Hammond, LA 70401", lat: 30.50663, lon: -90.45970 },
    { name: "OMV — Harvey", addr: "2150 Westbank Expwy, Harvey, LA 70058", lat: 29.90057, lon: -90.07257 },
    { name: "OMV — Homer", addr: "822-1 West Main St, Homer, LA 71040", lat: 32.79181, lon: -93.05572 },
    { name: "OMV — Houma", addr: "108 Capital Blvd, Houma, LA 70360", lat: 29.59577, lon: -90.71953 },
    { name: "OMV — Jena", addr: "First & Catahoula St, Jena, LA 71342", lat: 31.68323, lon: -92.13374 },
    { name: "OMV — Jennings", addr: "210 South State Street, Jennings, LA 70546", lat: 30.22031, lon: -92.65690 },
    { name: "OMV — Jonesboro", addr: "524 Pershing Hwy, Jonesboro, LA 71251", lat: 32.25064, lon: -92.72020 },
    { name: "OMV — Jonesville", addr: "1104 Fourth St, Jonesville, LA 71343", lat: 31.62614, lon: -91.81359 },
    { name: "OMV — Kinder", addr: "333 8th Street, Kinder, LA 70648", lat: 30.48631, lon: -92.85025 },
    { name: "OMV — Lafayette", addr: "3241 NW Evangeline Thruway, Lafayette, LA 70508", lat: 30.29355, lon: -92.02528 },
    { name: "OMV — Lake Charles", addr: "951 Main Street, Lake Charles, LA 70615", lat: 30.22621, lon: -93.16318 },
    { name: "OMV — Lake Providence", addr: "400 First Street, Lake Providence, LA 71254", lat: 32.80430, lon: -91.17011 },
    { name: "OMV — Leesville", addr: "9219 Shreveport Hwy, Leesville, LA 71446", lat: 31.16130, lon: -93.26738 },
    { name: "OMV — Mandeville", addr: "1715 N Causeway Blvd, Mandeville, LA 70448", lat: 30.37817, lon: -90.09116 },
    { name: "OMV — Mansfield", addr: "619 Franklin St, Mansfield, LA 71052", lat: 32.03915, lon: -93.70650 },
    { name: "OMV — Many", addr: "109 North Highland, Many, LA 71449", lat: 31.56112, lon: -93.47393 },
    { name: "OMV — Marksville", addr: "311 North Monroe, Marksville, LA 71351", lat: 31.12804, lon: -92.06657 },
    { name: "OMV — Metairie", addr: "6701 Airline Hwy, Metairie, LA 70003", lat: 29.98999, lon: -90.15054 },
    { name: "OMV — Minden", addr: "301 Morris Drive, Minden, LA 71055", lat: 32.62227, lon: -93.26140 },
    { name: "OMV — Monroe", addr: "5171 Northeast Road, Monroe, LA 71203", lat: 32.51249, lon: -92.04748 },
    { name: "OMV — Morgan City", addr: "1200 Victor II Boulevard, Morgan City, LA 70380", lat: 29.70405, lon: -91.19852 },
    { name: "OMV — Napoleonville", addr: "205 Martin Luther King, Napoleonville, LA 70390", lat: 29.94106, lon: -91.02547 },
    { name: "OMV — Natchitoches", addr: "10 Bienville Square, Natchitoches, LA 71457", lat: 31.76067, lon: -93.08602 },
    { name: "OMV — New Iberia", addr: "1613 East Main Street, New Iberia, LA 70560", lat: 29.99406, lon: -91.79512 },
    { name: "OMV — New Roads", addr: "424 Hospital Road, New Roads, LA 70760", lat: 30.68557, lon: -91.46479 },
    { name: "OMV — Oak Grove", addr: "706 East Main St, Oak Grove, LA 71263", lat: 32.86110, lon: -91.38067 },
    { name: "OMV — Oakdale", addr: "229 S 10th Street, Oakdale, LA 71463", lat: 30.81033, lon: -92.66235 },
    { name: "OMV — Opelousas", addr: "5537 I-49 S Service Road, Opelousas, LA 70570", lat: 30.49537, lon: -92.07310 },
    { name: "OMV — Pineville", addr: "831 Main Street, Pineville, LA 71360", lat: 31.32268, lon: -92.43411 },
    { name: "OMV — Plaquemine", addr: "57815 Fort Street, Plaquemine, LA 70764", lat: 30.28563, lon: -91.23052 },
    { name: "OMV — Port Allen", addr: "782 Louisiana Ave, Port Allen, LA 70767", lat: 30.46133, lon: -91.20957 },
    { name: "OMV — Rayville", addr: "6 Lynn Gayle Robertson Rd, Rayville, LA 71269", lat: 32.47469, lon: -91.75683 },
    { name: "OMV — Reserve", addr: "4034 W Airline Hwy, Reserve, LA 70084", lat: 30.08240, lon: -90.55852 },
    { name: "OMV — Ruston", addr: "2025 Farmerville Hwy, Ruston, LA 71270", lat: 32.54738, lon: -92.61173 },
    { name: "OMV — Shreveport", addr: "9310 Normandie Drive, Shreveport, LA 71118", lat: 32.39612, lon: -93.80676 },
    { name: "OMV — Slidell", addr: "1514 W Lindberg, Slidell, LA 70458", lat: 30.27519, lon: -89.78117 },
    { name: "OMV — Springhill", addr: "235 North Main Street, Springhill, LA 71075", lat: 33.00552, lon: -93.46118 },
    { name: "OMV — St. Francisville", addr: "5932 Commerce Street, St Francisville, LA 70775", lat: 30.78509, lon: -91.37967 },
    { name: "OMV — St. Joseph", addr: "203 Hancock St, St Joseph, LA 71366", lat: 31.91459, lon: -91.23695 },
    { name: "OMV — Sulphur", addr: "940 Beglis Parkway, Sulphur, LA 70663", lat: 30.23028, lon: -93.35930 },
    { name: "OMV — Tallulah", addr: "1703 Felicia Drive, Tallulah, LA 71282", lat: 32.39275, lon: -91.19097 },
    { name: "OMV — Thibodaux", addr: "1424 Tiger Drive, Thibodaux, LA 70301", lat: 29.77472, lon: -90.84184 },
    { name: "OMV — Vidalia", addr: "2009 Billy Deal Lane, Vidalia, LA 71373", lat: 31.56544, lon: -91.42595 },
    { name: "OMV — Ville Platte", addr: "1004 W LaSalle Street, Ville Platte, LA 70586", lat: 30.69403, lon: -92.28388 },
    { name: "OMV — Vivian", addr: "102-A East Georgia, Vivian, LA 71082", lat: 32.87047, lon: -93.98701 },
    { name: "OMV — West Monroe", addr: "501 Natchitoches, West Monroe, LA 71291", lat: 32.50026, lon: -92.12588 },
    { name: "OMV — Westwego", addr: "418 Avenue B, Westwego, LA 70094", lat: 29.91116, lon: -90.14254 },
    { name: "OMV — Winnfield", addr: "100 West Main St, Winnfield, LA 71483", lat: 31.92679, lon: -92.63872 },
    { name: "OMV — Winnsboro", addr: "2601 Loop Rd, Winnsboro, LA 71295", lat: 32.15273, lon: -91.70508 },
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
    { name: "SCDMV — Abbeville", addr: "1331 Haigler Street, Abbeville, SC 29260", lat: 34.17729, lon: -82.39202 },
    { name: "SCDMV — Aiken", addr: "1755 Richland Avenue East, Aiken, SC 29801", lat: 33.55397, lon: -81.69888 },
    { name: "SCDMV — Anderson", addr: "331 29 By-Pass North, Anderson, SC 29621", lat: 34.52583, lon: -82.65296 },
    { name: "SCDMV — Bamberg", addr: "341 Lacey Street, Bamberg, SC 29003", lat: 33.31112, lon: -81.03409 },
    { name: "SCDMV — Barnwell", addr: "1270 Main Street, Barnwell, SC 29812", lat: 33.24828, lon: -81.34714 },
    { name: "SCDMV — Batesburg", addr: "509 Liberty Street, Batesburg, SC 29006", lat: 33.90026, lon: -81.54238 },
    { name: "SCDMV — Beaufort", addr: "28 Munch Drive, Beaufort, SC 29906", lat: 32.41805, lon: -80.73803 },
    { name: "SCDMV — Belton", addr: "306B Anderson Street, Belton, SC 29627", lat: 34.52058, lon: -82.50456 },
    { name: "SCDMV — Bennettsville", addr: "337 Highway 9 West, Bennettsville, SC 29512", lat: 34.61735, lon: -79.68477 },
    { name: "SCDMV — Bishopville", addr: "508 South Lee Street, Bishopville, SC 29010", lat: 34.20839, lon: -80.25411 },
    { name: "SCDMV — Bluffton", addr: "15 Sheridan Park, Bluffton, SC 29910", lat: 32.26235, lon: -80.85968 },
    { name: "SCDMV — Blythewood", addr: "10311 Wilson Boulevard, Blythewood, SC 29016", lat: 34.19474, lon: -80.96885 },
    { name: "SCDMV — Camden", addr: "1056 Ehrenclou Drive, Camden, SC 29020", lat: 34.23812, lon: -80.61695 },
    { name: "SCDMV — Charleston (Lockwood)", addr: "180 Lockwood Boulevard, Charleston, SC 29403", lat: 32.78844, lon: -79.93993 },
    { name: "SCDMV — Charleston (Wappoo Rd)", addr: "1119-G Wappoo Road, Charleston, SC 29407", lat: 32.80205, lon: -80.01477 },
    { name: "SCDMV — Chester", addr: "508 Belt Road, Chester, SC 29706", lat: 34.69508, lon: -81.19226 },
    { name: "SCDMV — Chesterfield", addr: "100 Laney Street, Chesterfield, SC 29709", lat: 34.73239, lon: -80.07676 },
    { name: "SCDMV — Columbia (Decker)", addr: "2500 Decker Boulevard, Columbia, SC 29206", lat: 33.99316, lon: -80.97524 },
    { name: "SCDMV — Columbia (Dutch Square)", addr: "800 Dutch Square Boulevard, Columbia, SC 29210", lat: 34.03278, lon: -81.09544 },
    { name: "SCDMV — Columbia (Shop Rd)", addr: "1630 Shop Road, Columbia, SC 29201", lat: 33.96898, lon: -81.00226 },
    { name: "SCDMV — Conway", addr: "4103 Highway 701 North, Conway, SC 29526", lat: 33.83600, lon: -79.04781 },
    { name: "SCDMV — Dillon", addr: "1705 Highway 301 South, Dillon, SC 29536", lat: 34.43449, lon: -79.35759 },
    { name: "SCDMV — Edgefield", addr: "849 Highway 25 North, Edgefield, SC 29824", lat: 33.76359, lon: -81.97591 },
    { name: "SCDMV — Fairfax", addr: "3657 Allendale Fairfax Road, Fairfax, SC 29827", lat: 32.95854, lon: -81.23721 },
    { name: "SCDMV — Florence", addr: "3102 East Palmetto Street, Florence, SC 29506", lat: 34.19686, lon: -79.70621 },
    { name: "SCDMV — Fountain Inn", addr: "1310 North Main Street, Fountain Inn, SC 29644", lat: 34.70738, lon: -82.23002 },
    { name: "SCDMV — Gaffney", addr: "451 Hyatt Street, Gaffney, SC 29341", lat: 35.07113, lon: -81.67940 },
    { name: "SCDMV — Georgetown", addr: "214 Ridge Street, Georgetown, SC 29440", lat: 33.38420, lon: -79.31431 },
    { name: "SCDMV — Greenville (Laurens Rd)", addr: "1439 Laurens Road, Greenville, SC 29607", lat: 34.84419, lon: -82.36428 },
    { name: "SCDMV — Greenville (Saluda Dam)", addr: "15 Saluda Dam Road, Greenville, SC 29611", lat: 34.85702, lon: -82.46305 },
    { name: "SCDMV — Greenwood", addr: "510 West Alexander Ext, Greenwood, SC 29646", lat: 34.19540, lon: -82.16179 },
    { name: "SCDMV — Greer", addr: "610 Arlington Road, Greer, SC 29651", lat: 34.94987, lon: -82.21207 },
    { name: "SCDMV — Hartsville", addr: "2200 East Bobo Newsome Highway, Hartsville, SC 29550", lat: 34.37404, lon: -80.07340 },
    { name: "SCDMV — Irmo", addr: "1016 Broadstone Road, Irmo, SC 29063", lat: 34.08847, lon: -81.18021 },
    { name: "SCDMV — Kingstree", addr: "785 Eastland Avenue, Kingstree, SC 29556", lat: 33.67790, lon: -79.81434 },
    { name: "SCDMV — Ladson", addr: "135 Wimberly Drive, Ladson, SC 29456", lat: 32.99348, lon: -80.09512 },
    { name: "SCDMV — Lake City", addr: "728 South Ron McNair Boulevard, Lake City, SC 29560", lat: 33.85100, lon: -79.76372 },
    { name: "SCDMV — Lancaster", addr: "1694 Pageland Highway, Lancaster, SC 29720", lat: 34.72582, lon: -80.73320 },
    { name: "SCDMV — Laurens", addr: "390 Fairgrounds Road, Laurens, SC 29360", lat: 34.49627, lon: -81.97860 },
    { name: "SCDMV — Lexington", addr: "122 Park Road, Lexington, SC 29072", lat: 33.98796, lon: -81.25024 },
    { name: "SCDMV — Little River", addr: "107 Highway 57 North, Little River, SC 29566", lat: 33.87270, lon: -78.62326 },
    { name: "SCDMV — Manning", addr: "3721 Alex Harvin Highway, Manning, SC 29102", lat: 33.69523, lon: -80.21078 },
    { name: "SCDMV — McCormick", addr: "504 Airport Road, McCormick, SC 29835", lat: 33.90963, lon: -82.26895 },
    { name: "SCDMV — Moncks Corner", addr: "438 North Highway 52, Moncks Corner, SC 29461", lat: 33.19600, lon: -80.01314 },
    { name: "SCDMV — Mt. Pleasant", addr: "1189 Iron Bridge Road, Mount Pleasant, SC 29466", lat: 32.79407, lon: -79.86259 },
    { name: "SCDMV — Mullins", addr: "2757 East Highway 76, Mullins, SC 29574", lat: 34.19934, lon: -79.23884 },
    { name: "SCDMV — Myrtle Beach", addr: "1200 21st Avenue North, Myrtle Beach, SC 29577", lat: 33.70228, lon: -78.87212 },
    { name: "SCDMV — Newberry", addr: "275 Mt Bethel-Garmany Road, Newberry, SC 29108", lat: 34.29156, lon: -81.59626 },
    { name: "SCDMV — North Augusta", addr: "1913 Ascauga Lake Road, North Augusta, SC 29841", lat: 33.55688, lon: -81.93125 },
    { name: "SCDMV — North Charleston (Leeds Ave)", addr: "3790 Leeds Avenue, North Charleston, SC 29405", lat: 32.84982, lon: -80.01256 },
    { name: "SCDMV — North Charleston (North Park)", addr: "8740 North Park Boulevard, North Charleston, SC 29406", lat: 32.85462, lon: -79.97481 },
    { name: "SCDMV — Orangeburg", addr: "1720 Charleston Highway, Orangeburg, SC 29115", lat: 33.47096, lon: -80.84630 },
    { name: "SCDMV — Pickens", addr: "2133 Gentry Memorial Highway, Pickens, SC 29671", lat: 34.85858, lon: -82.67301 },
    { name: "SCDMV — Ridgeland", addr: "407 Live Oak Drive, Ridgeland, SC 29936", lat: 32.48074, lon: -80.98039 },
    { name: "SCDMV — Rock Hill (Hands Mill)", addr: "305 Hands Mill Road, Rock Hill, SC 29732", lat: 34.92487, lon: -81.02508 },
    { name: "SCDMV — Rock Hill (Heckle Blvd)", addr: "1070 Heckle Boulevard, Rock Hill, SC 29732", lat: 34.93760, lon: -81.06001 },
    { name: "SCDMV — Saluda", addr: "400 West Wheeler Circle, Saluda, SC 29138", lat: 34.01109, lon: -81.77918 },
    { name: "SCDMV — Santee", addr: "117 Dazzy Circle, Santee, SC 29142", lat: 33.47412, lon: -80.48541 },
    { name: "SCDMV — Seneca", addr: "13009 South Radio Station Road, Seneca, SC 29678", lat: 34.67898, lon: -82.99025 },
    { name: "SCDMV — Spartanburg (Fairforest)", addr: "8794 Fairforest Road, Spartanburg, SC 29303", lat: 34.97329, lon: -81.99758 },
    { name: "SCDMV — Spartanburg (Southport)", addr: "1625 Southport Road, Spartanburg, SC 29306", lat: 34.91421, lon: -81.90662 },
    { name: "SCDMV — St. George", addr: "5315 East Jim Bilton Boulevard, St George, SC 29477", lat: 33.18115, lon: -80.56128 },
    { name: "SCDMV — St. Matthews", addr: "415 Chestnut Street, St Matthews, SC 29135", lat: 33.66411, lon: -80.78546 },
    { name: "SCDMV — Sumter", addr: "430 South Pike Street, Sumter, SC 29150", lat: 33.92044, lon: -80.34147 },
    { name: "SCDMV — Union", addr: "1000 North Pinckney Street, Union, SC 29379", lat: 34.72676, lon: -81.62842 },
    { name: "SCDMV — Varnville", addr: "115 Cemetery Road, Varnville, SC 29944", lat: 32.86039, lon: -81.09328 },
    { name: "SCDMV — Walterboro", addr: "102 Mable T Willis Boulevard, Walterboro, SC 29488", lat: 32.88472, lon: -80.69795 },
    { name: "SCDMV — Winnsboro", addr: "1161 Kincaid Bridge Road, Winnsboro, SC 29180", lat: 34.38070, lon: -81.08648 },
    { name: "SCDMV — Woodruff", addr: "351 South Main Street, Woodruff, SC 29388", lat: 34.73722, lon: -82.03402 },
  ],
  MS: [
    { name: "DPS — Aberdeen", addr: "125 West Commerce Street, Aberdeen, MS", lat: 33.82547, lon: -88.54420 },
    { name: "DPS — Amory", addr: "County Building, Amory, MS", lat: 33.98699, lon: -88.48561 },
    { name: "DPS — Batesville", addr: "22000 A Highway 35 North, Batesville, MS", lat: 34.31649, lon: -89.95271 },
    { name: "DPS — Belzoni", addr: "417 Silver City Road, Belzoni, MS", lat: 33.17001, lon: -90.49340 },
    { name: "DPS — Booneville", addr: "200 Dallison Drive, Booneville, MS", lat: 34.66544, lon: -88.56996 },
    { name: "DPS — Brookhaven", addr: "160 Highway 84 East, Brookhaven, MS", lat: 31.57907, lon: -90.44071 },
    { name: "DPS — Canton", addr: "226 East Peace Street, Canton, MS", lat: 32.61252, lon: -90.03111 },
    { name: "DPS — Clarksdale", addr: "144 Ritchie Avenue, Clarksdale, MS", lat: 34.20122, lon: -90.55455 },
    { name: "DPS — Cleveland", addr: "406 N Martin Luther King Dr, Cleveland, MS", lat: 33.74897, lon: -90.71074 },
    { name: "DPS — Collins", addr: "101 Dogwood Ave, Collins, MS", lat: 31.64477, lon: -89.55716 },
    { name: "DPS — Columbia", addr: "201 Second Street, Columbia, MS", lat: 31.25186, lon: -89.83531 },
    { name: "DPS — Columbus", addr: "17 Airline Road, Columbus, MS", lat: 33.49257, lon: -88.39843 },
    { name: "DPS — Corinth", addr: "305 South Fulton Drive, Corinth, MS", lat: 34.93044, lon: -88.52538 },
    { name: "DPS — Crystal Springs", addr: "108 West RR Ave S, Crystal Springs, MS", lat: 31.98718, lon: -90.35618 },
    { name: "DPS — D'Iberville", addr: "10470 Lamey Bridge Rd, D'Iberville, MS", lat: 30.44067, lon: -88.89116 },
    { name: "DPS — Eupora", addr: "114 Highway 9 North, Eupora, MS", lat: 33.54068, lon: -89.26701 },
    { name: "DPS — Forest", addr: "477 West 3rd Street, Forest, MS", lat: 32.36429, lon: -89.47662 },
    { name: "DPS — Fulton", addr: "201 West Main Street, Fulton, MS", lat: 34.27349, lon: -88.40835 },
    { name: "DPS — Greenville", addr: "420 Highway 82 West, Greenville, MS", lat: 33.41111, lon: -91.06359 },
    { name: "DPS — Greenwood", addr: "701 Highway 82 West, Greenwood, MS", lat: 33.51623, lon: -90.17953 },
    { name: "DPS — Grenada", addr: "2140 South Commerce, Grenada, MS", lat: 33.77240, lon: -89.76749 },
    { name: "DPS — Gulfport", addr: "15070 County Barn Rd, Gulfport, MS", lat: 30.43146, lon: -89.08925 },
    { name: "DPS — Hattiesburg", addr: "35 Tatum Drive, Hattiesburg, MS", lat: 31.26585, lon: -89.28078 },
    { name: "DPS — Holly Springs", addr: "136 Alderson Street, Holly Springs, MS", lat: 34.76995, lon: -89.44986 },
    { name: "DPS — Houston", addr: "Fire Department, Houston, MS", lat: 33.89845, lon: -88.99923 },
    { name: "DPS — Indianola", addr: "202 Main Street, Indianola, MS", lat: 33.45131, lon: -90.64972 },
    { name: "DPS — Iuka", addr: "1109 Maria Lane, Iuka, MS", lat: 34.80579, lon: -88.20327 },
    { name: "DPS — Jackson (Appleridge)", addr: "2565 McFadden Road, Jackson, MS", lat: 32.26930, lon: -90.23509 },
    { name: "DPS — Jackson (Headquarters)", addr: "1900 East Woodrow Wilson Avenue, Jackson, MS", lat: 32.32663, lon: -90.16517 },
    { name: "DPS — Kosciusko", addr: "550 Highway 12 East, Kosciusko, MS", lat: 33.05763, lon: -89.58758 },
    { name: "DPS — Laurel", addr: "130 N 12th Ave, Laurel, MS", lat: 31.68975, lon: -89.14124 },
    { name: "DPS — Leakesville", addr: "301 A Lafayette, Leakesville, MS", lat: 31.15147, lon: -88.55297 },
    { name: "DPS — Lexington", addr: "113 China Street, Lexington, MS", lat: 33.11231, lon: -90.05223 },
    { name: "DPS — Louisville", addr: "115 South Court Street, Louisville, MS", lat: 33.12349, lon: -89.05324 },
    { name: "DPS — Lucedale", addr: "Senior Citizen Building, Lucedale, MS", lat: 30.92489, lon: -88.58794 },
    { name: "DPS — McComb", addr: "1722 Smithdale Rd, McComb, MS", lat: 31.26048, lon: -90.47569 },
    { name: "DPS — Mendenhall", addr: "167 West Maud Avenue, Mendenhall, MS", lat: 31.96197, lon: -89.87039 },
    { name: "DPS — Meridian", addr: "841 Highway 19 North, Meridian, MS", lat: 32.36431, lon: -88.70366 },
    { name: "DPS — Natchez", addr: "724 Highway 61 North, Natchez, MS", lat: 31.56041, lon: -91.40317 },
    { name: "DPS — Nesbit", addr: "159 License Drive, Nesbit, MS", lat: 34.88176, lon: -90.00870 },
    { name: "DPS — New Albany", addr: "416 Highway 15 South, New Albany, MS", lat: 34.49427, lon: -89.00784 },
    { name: "DPS — Newton", addr: "523 Coliseum Drive, Newton, MS", lat: 32.38828, lon: -89.13175 },
    { name: "DPS — Okolona", addr: "Main Street, Okolona, MS", lat: 34.00534, lon: -88.75568 },
    { name: "DPS — Olive Branch", addr: "6569 Cockrum Street, Olive Branch, MS", lat: 34.96176, lon: -89.82953 },
    { name: "DPS — Oxford", addr: "Highway 7 South, Oxford, MS", lat: 34.36638, lon: -89.51877 },
    { name: "DPS — Pascagoula", addr: "2914 Shortcut Road, Pascagoula, MS", lat: 30.38093, lon: -88.53091 },
    { name: "DPS — Philadelphia", addr: "920 Chestnut Street, Philadelphia, MS", lat: 32.78047, lon: -89.12548 },
    { name: "DPS — Picayune", addr: "6509 Highway 11 North, Picayune, MS", lat: 30.52547, lon: -89.67951 },
    { name: "DPS — Prentiss", addr: "2229 Pearl Street, Prentiss, MS", lat: 34.62225, lon: -88.51533 },
    { name: "DPS — Richland", addr: "442 Highway 49 South, Richland, MS 39218", lat: 32.18655, lon: -90.13800 },
    { name: "DPS — Ripley", addr: "752 West Section Line Street, Ripley, MS", lat: 34.73070, lon: -88.94883 },
    { name: "DPS — Saucier", addr: "20214 Highway 49, Saucier, MS", lat: 30.62537, lon: -89.13590 },
    { name: "DPS — Senatobia", addr: "111 Court Street, Senatobia, MS", lat: 34.61705, lon: -89.96733 },
    { name: "DPS — Starkville", addr: "987 Highway 82 East, Starkville, MS", lat: 33.46387, lon: -88.81521 },
    { name: "DPS — Tupelo", addr: "1879 Coley Road, Tupelo, MS", lat: 34.29513, lon: -88.77360 },
    { name: "DPS — Tylertown", addr: "707 Union Road, Tylertown, MS", lat: 31.12533, lon: -90.14015 },
    { name: "DPS — Vicksburg", addr: "1100 Grove St, Vicksburg, MS", lat: 32.35138, lon: -90.87692 },
    { name: "DPS — Walnut Grove", addr: "102 Park Street, Walnut Grove, MS", lat: 32.59019, lon: -89.45879 },
    { name: "DPS — Waynesboro", addr: "1100 Cedar Street, Waynesboro, MS", lat: 31.68338, lon: -88.64531 },
    { name: "DPS — West Point", addr: "339 West Broad Street, West Point, MS", lat: 33.60490, lon: -88.65353 },
    { name: "DPS — Winona", addr: "115 North Quitman Street, Winona, MS", lat: 33.48306, lon: -89.72900 },
    { name: "DPS — Woodville", addr: "982 Second South Street, Woodville, MS", lat: 31.10121, lon: -91.30274 },
    { name: "DPS — Yazoo City", addr: "1220 Jackson Avenue, Yazoo City, MS", lat: 32.86221, lon: -90.39964 },
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
