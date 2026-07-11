/* Story illustrations — a small scene engine.
   Every page of every story gets its own picture: shared primitives (sun,
   clouds, rain…) + per-story actors (horse, blob family…) composed by a
   per-page scene script.

   API:
     DIANDU_ART_PAGE(storyId, page, totalPages) -> svg string (null if unknown)
     DIANDU_ART[storyId]                        -> cover svg (library cards)   */

(function () {
  /* ================= shared primitives ================= */
  const S = (body, sky = "#CDE9F5") =>
    `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" role="img">
       <rect width="400" height="240" fill="${sky}"/>${body}</svg>`;

  const sun = (x = 340, y = 45, r = 24, c = "#FFCB47") =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>
     <circle cx="${x}" cy="${y}" r="${r + 9}" fill="${c}" opacity=".25"/>`;

  const moon = (x = 320, y = 52, r = 30) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#F6E7B2"/>
     <circle cx="${x}" cy="${y}" r="${r + 10}" fill="#F6E7B2" opacity=".2"/>`;

  const stars = () => `<g fill="#F5F2E8"><circle cx="60" cy="40" r="2"/><circle cx="120" cy="26" r="1.6"/>
     <circle cx="180" cy="48" r="2"/><circle cx="250" cy="24" r="1.6"/><circle cx="40" cy="90" r="1.6"/>
     <circle cx="380" cy="100" r="2"/></g>`;

  const cloud = (x, y, s = 1, c = "#FFFFFF") =>
    `<g transform="translate(${x},${y}) scale(${s})" fill="${c}">
       <ellipse cx="0" cy="0" rx="26" ry="14"/><ellipse cx="20" cy="-6" rx="20" ry="12"/>
       <ellipse cx="38" cy="2" rx="22" ry="11"/></g>`;

  const rain = (x, y) =>
    `<g stroke="#7FA8BC" stroke-width="4" stroke-linecap="round" transform="translate(${x},${y})">
       <path d="M0 0 l-5 14 M22 -2 l-5 14 M44 0 l-5 14"/></g>`;

  const rainbow = (x = 200, y = 200, r = 150) =>
    `<g fill="none" stroke-width="10" opacity=".8">
       <path d="M${x - r} ${y} a${r} ${r} 0 0 1 ${2 * r} 0" stroke="#E8637C"/>
       <path d="M${x - r + 12} ${y} a${r - 12} ${r - 12} 0 0 1 ${2 * (r - 12)} 0" stroke="#F0B429"/>
       <path d="M${x - r + 24} ${y} a${r - 24} ${r - 24} 0 0 1 ${2 * (r - 24)} 0" stroke="#7FAE6F"/></g>`;

  const eye = (x, y, r = 3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2B2722"/>`;

  const grass = (c = "#9CCB86", y = 185) => `<rect y="${y}" width="400" height="${240 - y}" fill="${c}"/>`;

  const riverBand = () =>
    `<path d="M0 168 Q100 150 200 168 T400 168 V240 H0 Z" fill="#63B4D1"/>
     <path d="M40 190 q14 -7 28 0 M110 205 q14 -7 28 0 M250 195 q14 -7 28 0 M330 212 q14 -7 28 0"
           stroke="#EAF6FB" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  const tree = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <rect x="-8" y="30" width="16" height="52" rx="7" fill="#8A5A34"/>
       <circle cx="0" cy="8" r="42" fill="#5C9E52"/><circle cx="-32" cy="26" r="24" fill="#6FB061"/>
       <circle cx="32" cy="26" r="24" fill="#6FB061"/></g>`;

  const house = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <rect x="-34" y="0" width="68" height="46" rx="4" fill="#F0E3C8"/>
       <path d="M-42 2 L0 -32 L42 2 Z" fill="#C4685B"/>
       <rect x="-10" y="18" width="20" height="28" rx="3" fill="#8A5A34"/>
       <rect x="-28" y="12" width="14" height="13" rx="2" fill="#9CD3E4"/></g>`;

  const bubble = (x, y, txt, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="0" rx="34" ry="22" fill="#fff" stroke="#E7E0D2" stroke-width="2"/>
       <path d="M-10 18 l-8 14 l20 -12 Z" fill="#fff"/>
       <text x="0" y="9" text-anchor="middle" font-size="24" font-family="Kaiti SC,STKaiti,serif" fill="#B93A28">${txt}</text></g>`;

  const zzz = (x, y) => `<text x="${x}" y="${y}" font-size="15" fill="#8C8375" font-family="Avenir Next,sans-serif">z z z</text>`;

  const sparkles = (x, y, c = "#F0B429") =>
    `<g transform="translate(${x},${y})" fill="${c}">
       <path d="M0 -10 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/>
       <path d="M22 2 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"/></g>`;

  const person = (x, y, shirt, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${o.s || 1})${o.flip ? " scale(-1,1)" : ""}">
       <circle cx="0" cy="-24" r="10" fill="#F2C9A0"/>
       ${o.hair ? `<path d="M-11 -28 a11 11 0 0 1 22 0 Z" fill="${o.hair}"/>` : ""}
       ${o.beard ? `<path d="M-5 -17 q5 6 10 0 q1 10 -5 13 q-6 -3 -5 -13" fill="#E8E2D4"/>` : ""}
       <rect x="-9" y="-14" width="18" height="27" rx="7" fill="${shirt}"/>
       <rect x="-8" y="13" width="7" height="11" rx="3" fill="#6E5A44"/>
       <rect x="1" y="13" width="7" height="11" rx="3" fill="#6E5A44"/>
       ${o.arms || `<path d="M-9 -8 q-8 6 -6 14 M9 -8 q8 6 6 14" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>`}
       ${eye(3, -25, 2)}
       ${o.blush ? `<circle cx="-4" cy="-20" r="3" fill="#F2A0B4" opacity=".8"/>` : ""}
     </g>`;

  /* ================= story actors ================= */

  /* --- horses & river friends (小马过河) --- */
  const horse = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})">
       <ellipse cx="0" cy="30" rx="44" ry="26" fill="${o.c || "#C88A5A"}"/>
       <rect x="-34" y="42" width="10" height="34" rx="5" fill="${o.c || "#C88A5A"}"/>
       <rect x="22" y="42" width="10" height="34" rx="5" fill="${o.c || "#C88A5A"}"/>
       <rect x="-14" y="46" width="10" height="32" rx="5" fill="${o.c2 || "#B4784C"}"/>
       <rect x="8" y="46" width="10" height="32" rx="5" fill="${o.c2 || "#B4784C"}"/>
       ${o.sack ? `<ellipse cx="-4" cy="4" rx="20" ry="13" fill="#E9DFA8"/><path d="M-14 -4 q10 -8 20 0" stroke="#C7A05C" stroke-width="3" fill="none"/>` : ""}
       <g transform="translate(36,-4) ${o.flip ? "" : ""}">
         <ellipse cx="8" cy="0" rx="20" ry="15" fill="${o.c || "#C88A5A"}"/>
         <ellipse cx="22" cy="6" rx="10" ry="7" fill="#E8B98A"/>
         <path d="M-2 -12 l6 -12 6 10" fill="${o.c2 || "#8A5A34"}"/>
         ${eye(10, -3)}
       </g>
       <path d="M-6 6 q-16 4 -22 22" stroke="${o.c2 || "#8A5A34"}" stroke-width="8" fill="none" stroke-linecap="round"/>
       <path d="M-44 34 q-12 8 -8 24" stroke="${o.c2 || "#8A5A34"}" stroke-width="7" fill="none" stroke-linecap="round"/>
     </g>`;

  const squirrel = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="8" rx="12" ry="10" fill="#B4693B"/>
       <circle cx="8" cy="-4" r="8" fill="#B4693B"/>${eye(10, -5, 2)}
       <path d="M-8 4 q-18 -4 -12 -20 q10 -8 16 8" fill="#8A4A28"/></g>`;

  const cow = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="26" rx="46" ry="27" fill="#E8E2D4"/>
       <ellipse cx="-14" cy="16" rx="14" ry="10" fill="#5A4632"/><ellipse cx="16" cy="34" rx="11" ry="8" fill="#5A4632"/>
       <rect x="-36" y="40" width="11" height="32" rx="5" fill="#E8E2D4"/><rect x="24" y="40" width="11" height="32" rx="5" fill="#E8E2D4"/>
       <g transform="translate(-46,-2)">
         <ellipse cx="0" cy="0" rx="17" ry="14" fill="#E8E2D4"/>
         <path d="M-8 -12 q-10 -12 -2 -18 M8 -12 q10 -12 2 -18" stroke="#C8B49A" stroke-width="5" fill="none" stroke-linecap="round"/>
         <ellipse cx="-6" cy="8" rx="9" ry="6" fill="#F2C4CE"/>${eye(-2, -4)}
       </g></g>`;

  /* --- 拔萝卜 cast --- */
  const turnip = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${s}) rotate(${o.rot || 0})">
       <path d="M0 40 q-30 -5 -30 -35 q0 -28 30 -28 q30 0 30 28 q0 30 -30 35 Z" fill="#E8637C"/>
       <path d="M0 40 l0 14" stroke="#E8637C" stroke-width="6" stroke-linecap="round"/>
       <path d="M-9 -22 q-4 -22 7 -30 M2 -21 q5 -19 19 -21 M-18 -16 q-16 -12 -12 -25"
             stroke="#4E9A51" stroke-width="8" fill="none" stroke-linecap="round"/></g>`;

  const dogA = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="6" rx="13" ry="9" fill="#E9DFA8"/><circle cx="11" cy="-2" r="7" fill="#E9DFA8"/>
       <path d="M6 -8 l3 -6 4 5 M14 -8 l3 -6 4 5" fill="#D9C878"/>${eye(13, -3, 2)}
       <path d="M-12 2 q-8 -6 -4 -12" stroke="#D9C878" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;

  const catA = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})">
       <ellipse cx="0" cy="6" rx="11" ry="8" fill="${o.c || "#9E9E9E"}"/><circle cx="9" cy="-3" r="6" fill="${o.c || "#9E9E9E"}"/>
       <path d="M5 -8 l2 -5 4 4 M11 -9 l3 -5 3 5" fill="${o.c2 || "#7C7C7C"}"/>${eye(11, -4, 2)}
       <path d="M-10 2 q-8 -4 -5 -12" stroke="${o.c2 || "#7C7C7C"}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;

  /* --- 小蝌蚪 cast --- */
  const lilyPad = (x, y, rx = 50) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.3}" fill="#5CA648"/>
     <path d="M${x} ${y} L${x + rx * 0.7} ${y - rx * 0.22} A${rx} ${rx * 0.3} 0 0 0 ${x} ${y - rx * 0.3} Z" fill="#6FBFD8"/>`;

  const frogA = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="10" rx="26" ry="18" fill="#57A05A"/>
       <circle cx="-11" cy="-8" r="9" fill="#57A05A"/><circle cx="11" cy="-8" r="9" fill="#57A05A"/>
       <circle cx="-11" cy="-9" r="4.5" fill="#fff"/><circle cx="11" cy="-9" r="4.5" fill="#fff"/>
       ${eye(-10, -9, 2.5)}${eye(12, -9, 2.5)}
       ${o.blush ? `<circle cx="-16" cy="0" r="4" fill="#E8919E"/><circle cx="16" cy="0" r="4" fill="#E8919E"/>` : ""}
       <path d="M-10 8 q10 ${o.sad ? -6 : 8} 20 0" stroke="#2E5B33" stroke-width="3" fill="none" stroke-linecap="round"/>
       <ellipse cx="0" cy="16" rx="14" ry="9" fill="#CDE9A8"/>
       ${o.arms ? `<path d="M-20 6 q-14 -10 -10 -20 M20 6 q14 -10 10 -20" stroke="#4A8A4E" stroke-width="5" fill="none" stroke-linecap="round"/>` : ""}
     </g>`;

  const tadpole = (x, y, rot = 0, s = 1) =>
    `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})" fill="#3A3A3A">
       <circle r="9"/><path d="M7 0 q16 4 28 -3 q-13 11 -28 9 Z"/></g>`;

  const duck = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="0" rx="24" ry="16" fill="#F5EDD8"/>
       <path d="M-22 -4 q-8 6 -2 12" stroke="#E8DCC0" stroke-width="4" fill="none"/>
       <circle cx="20" cy="-14" r="11" fill="#F5EDD8"/>
       <path d="M29 -14 q12 -2 12 4 q-6 4 -12 2 Z" fill="#F0A03B"/>${eye(22, -16, 2)}</g>`;

  const turtleA = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="0" rx="30" ry="19" fill="#5C8A52"/>
       <path d="M-18 -9 h36 M-23 2 h46 M-9 -16 v32 M9 -16 v32" stroke="#4A7242" stroke-width="3"/>
       <circle cx="34" cy="2" r="9" fill="#7FAE6F"/>${eye(37, 0, 2)}
       <rect x="-24" y="14" width="11" height="8" rx="4" fill="#7FAE6F"/><rect x="12" y="14" width="11" height="8" rx="4" fill="#7FAE6F"/></g>`;

  /* --- 龟兔 cast --- */
  const rabbit = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})">
       <ellipse cx="0" cy="6" rx="20" ry="13" fill="#EDEDED"/>
       <circle cx="16" cy="-2" r="10" fill="#EDEDED"/>
       <path d="M10 -10 q-2 -16 6 -18 q4 12 0 18 M18 -11 q2 -16 10 -16 q2 12 -4 17" fill="#DCDCDC"/>
       ${o.sleep
         ? `<path d="M20 -5 q3 -2 5 0" stroke="#666" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M13 -2 q4 2 7 0" stroke="#999" stroke-width="2" fill="none"/>`
         : `${eye(20, -4, 2)}`}
       ${o.blush ? `<circle cx="14" cy="2" r="4" fill="#F2A0B4" opacity=".9"/>` : ""}
     </g>`;

  const flag = (x, y) =>
    `<g transform="translate(${x},${y})">
       <rect x="0" y="0" width="5" height="76" rx="2" fill="#8A5A34"/>
       <path d="M5 4 L44 14 L5 26 Z" fill="#D94F3D"/></g>`;

  /* --- 蝴蝶 cast --- */
  const butterfly = (x, y, c1, c2, rot = 0, s = 1) =>
    `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">
       <ellipse cx="-9" cy="0" rx="11" ry="15" fill="${c1}"/><ellipse cx="9" cy="0" rx="11" ry="15" fill="${c1}"/>
       <ellipse cx="-7" cy="4" rx="5" ry="7" fill="${c2}"/><ellipse cx="7" cy="4" rx="5" ry="7" fill="${c2}"/>
       <rect x="-2.5" y="-12" width="5" height="26" rx="2.5" fill="#5A4632"/>
       <path d="M-2 -12 q-6 -8 -10 -6 M2 -12 q6 -8 10 -6" stroke="#5A4632" stroke-width="2" fill="none"/></g>`;

  const flower = (x, y, c, c2, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <path d="M0 40 v-28" stroke="#4E8A44" stroke-width="4" stroke-linecap="round"/>
       <circle r="12" fill="${c}"/><circle r="5" fill="${c2}"/>
       <circle cx="-11" cy="-5" r="6" fill="${c}" opacity=".75"/><circle cx="11" cy="-5" r="6" fill="${c}" opacity=".75"/>
       <circle cx="-7" cy="9" r="6" fill="${c}" opacity=".75"/><circle cx="7" cy="9" r="6" fill="${c}" opacity=".75"/></g>`;

  const BF = { red: ["#E8637C", "#FFD9E0"], yellow: ["#F0B429", "#FFF0C4"], white: ["#F7F4EC", "#D8D2BE"] };

  /* --- 守株待兔 cast --- */
  const stump = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <path d="M-24 18 q-4 -34 8 -44 q4 -6 32 -6 q12 12 8 50 Z" fill="#9A6B3F"/>
       <ellipse cx="0" cy="-32" rx="24" ry="9" fill="#C89B66"/>
       <ellipse cx="0" cy="-32" rx="16" ry="5.5" fill="#A87C48"/>
       <ellipse cx="0" cy="-32" rx="8" ry="3" fill="#C89B66"/></g>`;

  const crops = (y = 168, dead = false) => {
    const c = dead ? "#C2A46A" : "#7BAD5C";
    return `<g stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round">
       <path d="M40 ${y} q-4 -18 4 -26 M52 ${y} q6 -14 -2 -24"/>
       <path d="M110 ${y} q-4 -16 4 -24 M122 ${y} q6 -14 -2 -22"/>
       <path d="M330 ${y} q-4 -18 4 -26 M344 ${y} q6 -14 -2 -24"/></g>`;
  };

  /* --- 井 (well) --- */
  const wellTop = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <ellipse cx="0" cy="14" rx="46" ry="14" fill="#9AA3AD"/>
       <rect x="-46" y="-8" width="92" height="24" rx="10" fill="#B8BFC8"/>
       <g fill="#9AA3AD"><rect x="-40" y="-6" width="18" height="9" rx="3"/><rect x="-18" y="-6" width="18" height="9" rx="3"/>
       <rect x="4" y="-6" width="18" height="9" rx="3"/><rect x="26" y="-6" width="16" height="9" rx="3"/></g>
       <ellipse cx="0" cy="-8" rx="40" ry="9" fill="#3D4854"/>
       ${o.moon ? `<circle cx="0" cy="-6" r="12" fill="#F6E7B2" opacity="${o.broken ? .45 : .85}"/>` : ""}
       ${o.broken ? `<path d="M-14 -8 q7 4 14 0 t14 0" stroke="#F6E7B2" stroke-width="2.5" fill="none" opacity=".8"/>` : ""}
     </g>`;

  const wellSection = (frogY = 150, o = {}) =>
    `<rect x="130" y="70" width="140" height="170" fill="#5A6A78"/>
     <rect x="150" y="90" width="100" height="150" fill="#8FA6B8"/>
     <g fill="#7C93A5"><rect x="155" y="100" width="40" height="16" rx="4"/><rect x="200" y="100" width="44" height="16" rx="4"/>
       <rect x="155" y="122" width="60" height="16" rx="4"/><rect x="220" y="122" width="24" height="16" rx="4"/>
       <rect x="155" y="144" width="30" height="16" rx="4"/><rect x="190" y="144" width="54" height="16" rx="4"/></g>
     <rect x="150" y="196" width="100" height="44" fill="#63B4D1"/>
     <path d="M150 196 q25 -8 50 0 t50 0" stroke="#9CD8E8" stroke-width="4" fill="none"/>
     <ellipse cx="200" cy="48" rx="52" ry="20" fill="${o.skyBright ? "#9CD8E8" : "#CDE9F5"}"/>
     ${o.bird ? `<g transform="translate(200,44)"><path d="M-12 0 q6 -10 12 0 q6 -10 12 0" stroke="#5F7A8A" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>` : ""}
     ${frogY != null ? frogA(200, frogY, 0.85, o.frog || {}) : ""}`;

  /* --- 山 (mountains) --- */
  const mountains = (o = {}) =>
    `<path d="M-20 210 L120 60 L260 210 Z" fill="#7290B4" ${o.lift ? `transform="translate(-40,-90) rotate(-8 120 130)"` : ""}/>
     <path d="M160 210 L290 84 L410 210 Z" fill="#8FA8C8" ${o.lift ? `transform="translate(60,-70) rotate(6 290 150)"` : ""}/>
     ${o.lift ? "" : `<path d="M104 78 L120 60 L136 78 L120 88 Z" fill="#EFF5F8"/>
     <path d="M274 100 L290 84 L306 100 L290 110 Z" fill="#EFF5F8"/>`}`;

  const basketMan = (x, y, shirt) => person(x, y, shirt, {
    arms: `<path d="M-9 -6 l-14 6 M9 -6 l14 6" stroke="#F2C9A0" stroke-width="4.5" stroke-linecap="round"/>
           <path d="M-30 2 a8 6 0 0 0 14 4 Z" fill="#C7A05C"/><path d="M16 2 a8 6 0 0 0 14 4 Z" fill="#C7A05C"/>`,
  });

  /* --- 猴 (monkeys) --- */
  const monkey = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <circle r="11" fill="#B4784C"/>
       <circle cx="9" cy="-5" r="7.5" fill="#C88A5A"/>
       <circle cx="5" cy="-7" r="5" fill="#E8C8A8"/>${eye(11, -6, 1.8)}
       ${o.tailUp ? `<path d="M-7 8 q-10 -12 -2 -20" stroke="#B4784C" stroke-width="5" fill="none" stroke-linecap="round"/>`
                  : `<path d="M-6 9 q-6 14 3 22" stroke="#B4784C" stroke-width="5" fill="none" stroke-linecap="round"/>`}
       ${o.arm ? `<path d="M4 10 q10 8 4 18" stroke="#B4784C" stroke-width="5" fill="none" stroke-linecap="round"/>` : ""}
     </g>`;

  /* --- 塞翁 cast --- */
  const steppe = () =>
    `<path d="M0 170 Q120 140 240 166 T400 160 V240 H0 Z" fill="#C2B26A"/>
     <path d="M0 196 Q140 172 400 196 V240 H0 Z" fill="#A8985A" opacity=".7"/>`;

  const horse2 = (x, y, s = 1, c = "#7A6A5A", c2 = "#54463A", o = {}) =>
    `<g transform="translate(${x},${y}) scale(${o.flip ? -s : s},${s})">
       <ellipse cx="0" cy="20" rx="32" ry="18" fill="${c}"/>
       <rect x="-25" y="29" width="7" height="25" rx="3.5" fill="${c}"/><rect x="16" y="29" width="7" height="25" rx="3.5" fill="${c}"/>
       <rect x="-10" y="32" width="7" height="24" rx="3.5" fill="${c2}"/><rect x="4" y="32" width="7" height="24" rx="3.5" fill="${c2}"/>
       <g transform="translate(26,-2)"><ellipse cx="6" cy="0" rx="14" ry="10" fill="${c}"/>
         <path d="M-2 -8 l4 -9 5 7" fill="${c2}"/>${eye(8, -2, 2)}</g>
       <path d="M-30 22 q-9 7 -5 19" stroke="${c2}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;

  const oldMan = (x, y, o = {}) => person(x, y, o.shirt || "#8A7A9E", {
    beard: true, s: o.s || 1, blush: o.blush,
    arms: `<path d="M12 -8 q9 9 7 24" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>
           <rect x="16" y="12" width="4.5" height="34" rx="2" fill="#8A5A34"/>`,
  });

  /* --- 船 (boat) --- */
  const boat = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <path d="M-90 0 q10 26 40 26 h100 q30 0 40 -26 Z" fill="#8A5A34"/>
       <path d="M-90 0 h180" stroke="#6E4526" stroke-width="4"/>
       ${o.mark ? `<path d="M34 2 l10 8 M44 2 l10 8" stroke="#E8B84C" stroke-width="4" stroke-linecap="round"/>` : ""}
       <rect x="60" y="-58" width="6" height="58" rx="3" fill="#6E4526"/>
       <path d="M66 -58 L104 -48 L66 -36 Z" fill="#E8DFC8"/></g>`;

  const sword = (x, y, rot = 24, s = 1) =>
    `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})">
       <rect x="-4" y="-26" width="8" height="44" rx="3" fill="#C8D2DC"/>
       <rect x="-13" y="16" width="26" height="7" rx="3.5" fill="#E8B84C"/>
       <rect x="-4" y="23" width="8" height="14" rx="3" fill="#8A5A34"/></g>`;

  const waterBg = () =>
    `<rect y="120" width="400" height="120" fill="#4E7A9E"/>
     <path d="M0 120 Q100 112 200 120 T400 120" stroke="#7FA8C4" stroke-width="5" fill="none"/>
     <path d="M60 170 q10 -6 20 0 M310 190 q10 -6 20 0 M100 210 q10 -6 20 0" stroke="#7FA8C4" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;

  /* --- 画蛇 cast --- */
  const scrollBg = () =>
    `<rect width="400" height="240" fill="#EAE2CE"/>
     <rect x="34" y="30" width="250" height="180" rx="6" fill="#F8F4E8"/>
     <rect x="34" y="30" width="250" height="180" rx="6" fill="none" stroke="#C8B88A" stroke-width="3"/>
     <rect x="24" y="22" width="10" height="196" rx="5" fill="#8A5A34"/>
     <rect x="284" y="22" width="10" height="196" rx="5" fill="#8A5A34"/>`;

  const snakeBody = (partial = false) =>
    `<path d="M70 150 q30 -60 70 -30 q40 30 70 -20 q14 -22 34 -14"
           stroke="#5C8A52" stroke-width="16" fill="none" stroke-linecap="round"
           ${partial ? `stroke-dasharray="150 400"` : ""}/>
     ${partial ? "" : `<g transform="translate(246,84)"><circle r="14" fill="#5C8A52"/>
       <circle cx="5" cy="-4" r="3" fill="#fff"/>${eye(6, -4, 1.8)}
       <path d="M13 4 q10 2 12 8 l-6 1 q4 3 3 7 q-8 0 -12 -8" fill="#C4384B"/></g>`}`;

  const snakeLegs = () =>
    `<g stroke="#D94F3D" stroke-width="5" fill="none" stroke-linecap="round">
       <path d="M104 132 l-6 22 M126 138 l-2 22 M172 122 l6 22 M196 112 l10 20"/></g>`;

  const winePot = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <path d="M-22 8 q-6 -30 10 -38 q-8 -8 -2 -14 h28 q6 6 -2 14 q16 8 10 38 q-2 12 -22 12 t-22 -12 Z" fill="#7290B4"/>
       <path d="M-24 -18 q-14 2 -14 14" stroke="#5F7A9E" stroke-width="6" fill="none" stroke-linecap="round"/>
       <ellipse cx="0" cy="-46" rx="7" ry="4" fill="#5F7A9E"/>
       <rect x="-3" y="-44" width="6" height="12" fill="#5F7A9E"/>
       <path d="M-12 -6 q12 8 24 0" stroke="#EAF0F6" stroke-width="3" fill="none" opacity=".7"/></g>`;

  /* --- 变变一家 blob family --- */
  const blobKid = (x, y, kind, s = 1) => kind === "round"
    ? `<g transform="translate(${x},${y}) scale(${s})">
         <path d="M0 -22 q22 0 22 22 q0 20 -22 20 q-22 0 -22 -20 q0 -22 22 -22 Z" fill="#F2A0B4"/>
         ${eye(-7, -4, 2.5)}${eye(7, -4, 2.5)}
         <path d="M-7 6 q7 6 14 0" stroke="#B4536E" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`
    : `<g transform="translate(${x},${y}) scale(${s})">
         <path d="M-18 -20 h36 q6 0 6 8 v26 q0 8 -6 8 h-36 q-6 0 -6 -8 v-26 q0 -8 6 -8 Z" fill="#7FA8D9"/>
         ${eye(-7, -4, 2.5)}${eye(7, -4, 2.5)}
         <path d="M-7 8 q7 5 14 0" stroke="#3E6296" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;

  const papaFace = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       ${eye(-9, 0, 3)}${eye(9, 0, 3)}
       <path d="M-9 10 q9 8 18 0" stroke="#B4552A" stroke-width="3" fill="none" stroke-linecap="round"/>
       <circle cx="-16" cy="8" r="4" fill="#F6C4A0" opacity=".8"/><circle cx="16" cy="8" r="4" fill="#F6C4A0" opacity=".8"/></g>`;

  const papaBlob = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <path d="M0 -46 q40 0 44 38 q4 34 -18 44 q-12 6 -26 6 t-26 -6 q-22 -10 -18 -44 q4 -38 44 -38 Z" fill="#F08A4B"/>
       ${papaFace(0, -8, 1)}</g>`;

  const mamaBlob = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <path d="M0 -26 q24 0 24 24 q0 18 -14 22 q4 -22 -10 -22 t-10 22 q-14 -4 -14 -22 q0 -24 24 -24 Z" fill="#4FA3A0"/>
       ${eye(-7, -8, 2.5)}${eye(7, -8, 2.5)}
       <path d="M-6 0 q6 5 12 0" stroke="#2E6360" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;

  const papaSlide = () =>
    `<path d="M110 60 q60 0 78 52 q16 48 78 48 l64 0 q10 0 10 12 t-10 12 l-70 0 q-80 0 -100 -62 q-12 -40 -50 -40 q-24 0 -24 -11 t24 -11 Z" fill="#F08A4B"/>
     <path d="M96 82 q-14 0 -14 55 t14 55 q10 0 10 -12 l0 -86 q0 -12 -10 -12 Z" fill="#E07838"/>
     ${papaFace(120, 92, 1)}`;

  const papaLadder = (x = 206, y = 120, rot = 18) =>
    `<g transform="translate(${x},${y}) rotate(${rot})">
       <rect x="-26" y="-78" width="13" height="160" rx="6.5" fill="#F08A4B"/>
       <rect x="14" y="-78" width="13" height="160" rx="6.5" fill="#F08A4B"/>
       <g stroke="#E07838" stroke-width="9" stroke-linecap="round">
         <path d="M-14 -56 h28 M-14 -22 h28 M-14 12 h28 M-14 46 h28"/></g>
       <circle cx="0" cy="-92" r="22" fill="#F08A4B"/>
       ${papaFace(0, -94, .8)}</g>`;

  const papaUmbrella = (x = 200, y = 78) =>
    `<path d="M${x} ${y} q92 0 100 66 q-25 -14 -50 0 q-25 -14 -50 0 q-25 -14 -50 0 q-25 -14 -50 0 q8 -66 100 -66 Z" fill="#F08A4B"/>
     <path d="M${x} ${y} q-10 -14 6 -22" stroke="#E07838" stroke-width="6" fill="none" stroke-linecap="round"/>
     ${papaFace(x, y + 34, 1.1)}
     <rect x="${x - 5}" y="${y + 66}" width="10" height="52" rx="5" fill="#E07838"/>`;

  const papaBoat = (x = 200, y = 168) =>
    `<g transform="translate(${x},${y})">
       <path d="M-96 0 q6 30 46 30 h100 q40 0 46 -30 Z" fill="#F08A4B"/>
       <path d="M-96 0 h192" stroke="#E07838" stroke-width="6" stroke-linecap="round"/>
       ${papaFace(-64, 16, .8)}</g>`;

  const papaHeart = (x = 208, y = 96) =>
    `<path d="M${x - 58} ${y} q0 -34 32 -34 q22 0 26 18 q4 -18 26 -18 q32 0 32 34 q0 30 -58 64 q-58 -34 -58 -64 Z" fill="#F08A4B"/>
     ${papaFace(x, y, 1)}`;

  const cake = (x, y, s = 1, o = {}) =>
    `<g transform="translate(${x},${y}) scale(${s})">
       <rect x="-34" y="-6" width="68" height="30" rx="8" fill="#F7E3EA"/>
       <rect x="-28" y="-24" width="56" height="20" rx="7" fill="#F2A0B4"/>
       <path d="M-28 -14 q7 8 14 0 q7 8 14 0 q7 8 14 0 q7 8 14 0 l0 10 h-56 Z" fill="#F7E3EA"/>
       <g stroke="#B93A28" stroke-width="3.5" stroke-linecap="round">
         <path d="M-16 -26 v-10 M0 -28 v-10 M16 -26 v-10"/></g>
       ${o.out ? `<g stroke="#8C8375" stroke-width="2" fill="none"><path d="M-16 -40 q3 -5 0 -9 M0 -42 q3 -5 0 -9 M16 -40 q3 -5 0 -9"/></g>`
               : `<g fill="#F0B429"><ellipse cx="-16" cy="-40" rx="3.5" ry="5"/><ellipse cx="0" cy="-42" rx="3.5" ry="5"/><ellipse cx="16" cy="-40" rx="3.5" ry="5"/></g>`}
     </g>`;

  const confetti = () =>
    `<g><circle cx="60" cy="50" r="4" fill="#F2A0B4"/><circle cx="340" cy="40" r="4" fill="#7FA8D9"/>
      <rect x="120" y="30" width="7" height="7" rx="1" fill="#F0B429" transform="rotate(20 123 33)"/>
      <rect x="280" y="66" width="7" height="7" rx="1" fill="#4FA3A0" transform="rotate(-15 283 69)"/>
      <circle cx="200" cy="24" r="3.5" fill="#E8637C"/><rect x="40" y="96" width="6" height="6" rx="1" fill="#7FA8D9" transform="rotate(30 43 99)"/></g>`;

  /* ================= per-story scene scripts ================= */
  const SKY_NIGHT = "#1E3048", SKY_RAIN = "#C2D8E2", SKY_WARM = "#FBEFD7", SKY_DUSK = "#E8DFC8";

  const SCENES = {

    xiaoma(p) {
      const base = riverBand();
      if (p === 0) return S(`${sun()}${cloud(60, 46, .9)}${grass("#9CCB86", 150)}${base}
        ${house(70, 92, .9)}${horse(160, 105, .8)}${horse(272, 92, 1, { c: "#B4784C", c2: "#8A5A34" })}`);
      if (p === 1) return S(`${sun()}${grass("#9CCB86", 150)}${house(60, 96, .85)}
        ${horse(280, 100, .95, { c: "#B4784C", c2: "#8A5A34", flip: true })}${horse(150, 112, .8, { sack: true })}
        ${bubble(268, 40, "去磨坊", 1.1)}`);
      if (p === 2) return S(`${sun()}${cloud(60, 50, .9)}${grass("#9CCB86", 150)}${base}${horse(120, 105, .9, { sack: true })}
        <path d="M210 178 q16 -9 32 0 M260 192 q16 -9 32 0" stroke="#EAF6FB" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      if (p === 3 || p === 4) return S(`${sun()}${grass("#9CCB86", 150)}${base}
        ${horse(110, 110, .85, { sack: true })}${cow(300, 118, .95)}
        ${bubble(206, 52, p === 3 ? "深吗？" : "不深！", 1)}`);
      if (p === 5) return S(`${cloud(320, 40, .9)}${grass("#9CCB86", 150)}${base}${tree(56, 80, .8)}
        ${horse(180, 108, .85, { sack: true })}${squirrel(84, 52, 1.1)}
        ${bubble(140, 34, "别过河！", 1)}`);
      if (p === 6) return S(`${cloud(90, 44, .9)}${cloud(280, 60, .7)}${grass("#9CCB86", 150)}
        ${house(330, 96, .85)}${horse(150, 112, .9, { sack: true, flip: true })}
        <text x="230" y="70" font-size="34" fill="#8C8375" font-family="Kaiti SC,serif">？</text>`);
      if (p === 7) return S(`${sun(60, 46)}${grass("#9CCB86", 150)}${house(80, 96, .9)}
        ${horse(300, 96, 1, { c: "#B4784C", c2: "#8A5A34", flip: true })}${horse(190, 112, .78, { sack: true })}
        ${bubble(300, 34, "试一试", 1)}`);
      if (p === 8) return S(`${sun()}${grass("#9CCB86", 150)}${base}
        ${horse(200, 118, .9, { sack: true })}
        <path d="M150 200 q20 -10 40 0 M230 200 q20 -10 40 0" stroke="#EAF6FB" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      if (p === 9) return S(`${sun()}${grass("#9CCB86", 150)}${base}
        ${horse(200, 112, .9, { sack: true })}${cow(60, 130, .7)}${squirrel(340, 150, 1)}
        <path d="M160 196 q20 -10 40 0 M240 188 q20 -10 40 0" stroke="#EAF6FB" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      return S(`${sun()}${rainbow(200, 240, 170)}${grass("#9CCB86", 168)}
        ${horse(290, 120, 1, { sack: true })}${sparkles(210, 90)}
        ${bubble(120, 60, "过河啦！", 1.1)}`);
    },

    luobo(p) {
      const dirt = `<rect y="170" width="400" height="70" fill="#A5793F"/><rect y="160" width="400" height="14" rx="7" fill="#8FBF6F"/>`;
      const gpa = (x, pull) => person(x, 148, "#5B84C4", { hair: "#DDD", beard: true, arms: pull ? `<path d="M9 -6 l26 8" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/>` : undefined });
      const gma = (x) => person(x, 150, "#C4685B", { hair: "#DDD", arms: `<path d="M9 -6 l24 8" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/>` });
      const girl = (x) => person(x, 154, "#E9A23B", { hair: "#5A3A1E", s: .85, arms: `<path d="M8 -5 l22 8" stroke="#F2C9A0" stroke-width="4.5" stroke-linecap="round"/>` });
      if (p === 0) return S(`${sun(52, 46)}${dirt}${gpa(140)}${turnip(260, 158, .45)}
        ${sparkles(300, 110, "#7BAD5C")}`);
      if (p === 1) return S(`${sun(52, 46)}${cloud(250, 42)}${dirt}${turnip(280, 126, 1.05)}
        ${gpa(120)}<text x="180" y="70" font-size="30" fill="#8C8375" font-family="Kaiti SC,serif">哇！</text>`);
      if (p === 2) return S(`${sun(52, 46)}${dirt}${turnip(300, 130, 1, { rot: -6 })}${gpa(216, true)}
        <path d="M240 120 q8 -10 4 -18 M252 126 q8 -8 6 -16" stroke="#8C8375" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      if (p === 3) return S(`${sun(52, 46)}${dirt}${turnip(310, 130, 1, { rot: -6 })}${gpa(230, true)}
        ${gma(120)}${bubble(120, 76, "来帮忙!", .95)}`);
      if (p === 4) return S(`${sun(52, 46)}${dirt}${turnip(320, 128, 1, { rot: -8 })}${gpa(240, true)}${gma(184)}
        <path d="M193 142 l22 4" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/>`);
      if (p === 5) return S(`${sun(52, 46)}${dirt}${turnip(330, 128, 1, { rot: -8 })}
        ${girl(100)}${dogA(150, 168, 1)}${catA(196, 170, 1)}
        <path d="M60 130 q10 -14 24 -10" stroke="#8C8375" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      if (p === 6) return S(`${sun(52, 46)}${dirt}${turnip(330, 124, 1.05, { rot: -10 })}
        ${gpa(250, true)}${gma(196)}${girl(150)}${dogA(106, 168)}${catA(64, 170)}
        <path d="M205 142 l22 4 M158 146 l22 4 M116 158 l18 2 M74 162 l16 2" stroke="#F2C9A0" stroke-width="4.5" stroke-linecap="round"/>`);
      if (p === 7) return S(`${sun(52, 46)}${dirt}${turnip(280, 70, 1.05, { rot: 24 })}${sparkles(210, 50)}${sparkles(340, 100, "#E8637C")}
        ${gpa(230)}${gma(180)}${girl(136)}${dogA(96, 168)}${catA(56, 170)}
        ${bubble(100, 60, "三！", 1)}`);
      if (p === 8) return S(`${sun(52, 46)}${dirt}${turnip(320, 140, .9, { rot: 80 })}
        ${person(100, 158, "#5B84C4", { hair: "#DDD", beard: true })}${person(160, 160, "#C4685B", { hair: "#DDD" })}${person(216, 162, "#E9A23B", { hair: "#5A3A1E", s: .85 })}
        <text x="150" y="80" font-size="26" fill="#B93A28" font-family="Kaiti SC,serif">哈哈哈！</text>`);
      return S(`${moon(330, 46, 24)}${stars()}<rect y="160" width="400" height="80" fill="#4E5A46"/>
        <g transform="translate(190,150)"><ellipse cx="0" cy="10" rx="52" ry="18" fill="#E8DFC8"/>
        <ellipse cx="0" cy="4" rx="46" ry="14" fill="#F2A0B4" opacity=".7"/>
        <path d="M-20 -8 q3 -10 -3 -16 M2 -10 q3 -10 -3 -16 M24 -8 q3 -10 -3 -16" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/></g>
        ${person(90, 156, "#5B84C4", { hair: "#DDD", beard: true, s: .9 })}${person(300, 158, "#C4685B", { hair: "#DDD", s: .9 })}`, SKY_NIGHT);
    },

    kedou(p) {
      const pond = `<rect y="90" width="400" height="150" fill="#6FBFD8"/>
        <path d="M0 90 Q100 80 200 90 T400 90" stroke="#9CD8E8" stroke-width="6" fill="none"/>`;
      const tads = (x, y) => `${tadpole(x, y)}${tadpole(x + 60, y + 26, -15)}${tadpole(x + 120, y + 8, 10)}${tadpole(x + 66, y - 24, -8, .85)}`;
      if (p === 0) return S(`${sun(56, 44, 20)}${pond}${lilyPad(90, 108, 40)}${tads(120, 170)}
        <circle cx="320" cy="150" r="5" fill="#BEE7F2"/><circle cx="60" cy="180" r="4" fill="#BEE7F2"/>`);
      if (p === 1) return S(`${sun(56, 44, 20)}${pond}${tads(80, 160)}
        <path d="M240 150 q40 -10 80 6" stroke="#BEE7F2" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="2 10"/>
        <text x="300" y="130" font-size="24" fill="#EAF6FB" font-family="Kaiti SC,serif">妈妈？</text>`);
      if (p === 2 || p === 3) return S(`${sun(56, 44, 20)}${pond}${duck(280, 130, 1.15)}${duck(340, 156, .6)}
        ${tads(90, 180)}${p === 2 ? bubble(180, 60, "您是妈妈吗？", .9) : bubble(240, 60, "不是哦", .9)}`);
      if (p === 4 || p === 5) return S(`${sun(56, 44, 20)}${pond}${turtleA(280, 160, 1.1)}${tads(70, 170)}
        ${p === 5 ? bubble(180, 60, "妈妈！", 1) : `<text x="180" y="70" font-size="30" fill="#8C8375" font-family="Kaiti SC,serif">四条腿！</text>`}`);
      if (p === 6) return S(`${sun(56, 44, 20)}${pond}${turtleA(270, 158, 1.1)}${tads(80, 190)}
        ${bubble(170, 56, "穿绿衣服", .95)}`);
      if (p === 7) return S(`${sun(56, 44, 20)}${pond}${lilyPad(270, 128, 62)}${frogA(268, 100, .95)}
        ${tads(70, 180)}
        <path d="M150 170 q50 -20 90 -40" stroke="#BEE7F2" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="2 10"/>`);
      if (p === 8) return S(`${sun(56, 44, 20)}${pond}${lilyPad(230, 130, 66)}${frogA(228, 102, 1, { arms: true })}
        ${tadpole(150, 160, -20)}${tadpole(190, 172, -30)}${tadpole(260, 170, -150)}${tadpole(300, 158, -160)}
        ${bubble(110, 56, "妈妈！", 1.05)}`);
      return S(`${sun(56, 44, 20)}${pond}${lilyPad(200, 130, 70)}${frogA(200, 100, 1.05, { arms: true })}
        ${tadpole(140, 168, -40)}${tadpole(200, 178, -90)}${tadpole(260, 166, -140)}
        ${sparkles(300, 80)}${sparkles(90, 70, "#E8637C")}`);
    },

    guitu(p) {
      const hill = `<path d="M0 190 Q200 130 400 190 V240 H0 Z" fill="#8FBF6F"/>
        <path d="M0 205 Q200 160 400 205 V240 H0 Z" fill="#7BAD5C" opacity=".6"/>`;
      if (p === 0) return S(`${sun()}${cloud(150, 40, .8)}${hill}
        ${rabbit(120, 176, 1.1)}${turtleA(290, 186, 1)}
        <path d="M60 168 q10 -6 18 0 M84 160 q8 -5 14 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>`);
      if (p === 1 || p === 2) return S(`${sun()}${hill}
        ${rabbit(150, 178, 1.1)}${turtleA(260, 186, 1)}
        ${p === 1 ? bubble(140, 90, "赛跑吧！", 1) : bubble(280, 90, "比一比！", 1)}`);
      if (p === 3) return S(`${sun()}${cloud(90, 40, .8)}${hill}${flag(352, 120)}
        ${rabbit(230, 172, 1.05)}${turtleA(70, 190, .9)}
        <path d="M170 180 q12 -8 22 0 M144 186 q10 -7 18 0" stroke="#C2B29A" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`);
      if (p === 4) return S(`${sun()}${hill}${flag(352, 120)}
        ${rabbit(250, 172, 1.05, { flip: true })}${turtleA(70, 192, .85)}
        <text x="150" y="120" font-size="26" fill="#8C8375" font-family="Kaiti SC,serif">还很远…</text>`);
      if (p === 5) return S(`${sun()}${hill}${tree(110, 84, .9)}${flag(352, 120)}
        ${rabbit(120, 190, 1.05, { sleep: true })}${zzz(160, 140)}${turtleA(230, 192, .9)}`);
      if (p === 6) return S(`${cloud(60, 44, .8)}${hill}${tree(110, 84, .9)}${flag(352, 120)}
        ${rabbit(120, 190, 1.05, { sleep: true })}${zzz(160, 140)}${turtleA(292, 188, .95)}
        <path d="M236 196 q10 -6 18 0" stroke="#7BAD5C" stroke-width="4" fill="none" stroke-linecap="round"/>`);
      if (p === 7) return S(`${sun()}${hill}${tree(90, 84, .85)}${flag(340, 116)}
        ${turtleA(320, 184, 1)}${sparkles(300, 120)}
        ${rabbit(140, 186, 1.05)}<text x="120" y="120" font-size="30" fill="#8C8375" font-family="Kaiti SC,serif">！</text>`);
      if (p === 8) return S(`${sun()}${hill}${flag(340, 116)}
        ${rabbit(180, 182, 1.15, { blush: true })}${turtleA(300, 186, .95)}
        ${bubble(150, 100, "不该睡觉", .9)}`);
      return S(`${sun()}${rainbow(200, 240, 170)}${hill}${flag(340, 116)}
        ${turtleA(280, 186, 1.05)}${rabbit(160, 184, 1)}${sparkles(320, 130)}
        ${bubble(280, 90, "不放弃！", .95)}`);
    },

    hudie(p) {
      const garden = `${grass("#8FBF6F", 185)}`;
      const flowers = `${flower(70, 165, "#E8637C", "#FFD9E0")}${flower(180, 171, "#F0B429", "#FFF0C4")}${flower(300, 165, "#F5F2E8", "#D8D2BE")}`;
      const trio = (y = 84, spread = 76) =>
        `${butterfly(200 - spread, y + 12, ...BF.red, -12)}${butterfly(200, y - 10, ...BF.yellow, 8, .9)}${butterfly(200 + spread, y + 8, ...BF.white, -6, .9)}`;
      if (p === 0) return S(`${sun(330, 48, 26)}${garden}${flowers}${trio()}`);
      if (p === 1) return S(`${sun(330, 48, 26)}${garden}${flowers}${trio(70, 50)}
        <path d="M120 120 q40 -30 80 0 t80 0" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="3 8" opacity=".8"/>`);
      if (p === 2) return S(`${cloud(40, 46, 1.2, "#AFC6D2")}${cloud(200, 34, 1, "#AFC6D2")}${rain(60, 70)}${rain(220, 58)}
        ${garden}${flowers}${trio(110, 60)}`, SKY_RAIN);
      if (p === 3 || p === 4) return S(`${cloud(60, 40, 1.1, "#AFC6D2")}${rain(90, 62)}${rain(280, 54)}
        ${garden}${flower(140, 160, "#E8637C", "#FFD9E0", 1.3)}${flower(300, 170, "#F0B429", "#FFF0C4", .9)}
        ${butterfly(110, 100, ...BF.red, -10)}${butterfly(170, 92, ...BF.yellow, 6, .85)}${butterfly(220, 106, ...BF.white, -4, .85)}
        ${p === 3 ? bubble(300, 70, "躲躲雨", .9) : bubble(80, 60, "只让红的", .85)}`, SKY_RAIN);
      if (p === 5) return S(`${cloud(300, 40, 1.1, "#AFC6D2")}${rain(320, 62)}${rain(120, 50)}
        ${garden}${flower(90, 165, "#E8637C", "#FFD9E0")}
        ${butterfly(200, 96, ...BF.red, 0)}${butterfly(168, 118, ...BF.yellow, -10, .85)}${butterfly(232, 118, ...BF.white, 10, .85)}
        ${bubble(300, 100, "在一起！", .95)}`, SKY_RAIN);
      if (p === 6) return S(`${cloud(60, 38, 1.2, "#AFC6D2")}${cloud(240, 30, 1, "#AFC6D2")}${rain(80, 60)}${rain(250, 52)}${rain(170, 70)}
        ${garden}${flower(140, 168, "#F0B429", "#FFF0C4", 1.15)}${flower(280, 168, "#F5F2E8", "#D8D2BE", 1.15)}
        ${butterfly(90, 108, ...BF.red, -12, .85)}${butterfly(200, 96, ...BF.yellow, 4, .85)}${butterfly(330, 108, ...BF.white, 8, .85)}`, SKY_RAIN);
      if (p === 7) return S(`${cloud(320, 36, 1, "#AFC6D2")}${rain(340, 58)}
        ${garden}${flowers}
        ${butterfly(180, 100, ...BF.red, -6)}${butterfly(214, 88, ...BF.yellow, 6, .85)}${butterfly(240, 108, ...BF.white, -4, .85)}
        ${bubble(110, 70, "不分开！", 1)}`, SKY_RAIN);
      if (p === 8) return S(`${sun(200, 60, 30)}${cloud(60, 40, .9, "#C8D8E0")}${cloud(340, 50, .8, "#C8D8E0")}
        ${garden}${flowers}${trio(110, 70)}
        <path d="M158 40 l10 10 M242 40 l-10 10 M200 26 v14" stroke="#FFCB47" stroke-width="4" stroke-linecap="round"/>`);
      return S(`${sun(340, 44, 22)}${rainbow(200, 240, 175)}${garden}${flowers}
        ${trio(96, 66)}${sparkles(90, 60, "#E8637C")}`);
    },

    shouzhu(p) {
      const field = `<rect y="168" width="400" height="72" fill="#C7A05C"/>`;
      const farmer = (x, y, o = {}) => person(x, y, "#5B84C4", Object.assign({ hair: "#E9B84C" }, o));
      if (p === 0) return S(`${sun(60, 48)}${cloud(240, 44, .9)}${field}${crops()}
        ${farmer(180, 146, { arms: `<path d="M9 -8 l18 -14" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/><path d="M25 -24 l10 -8" stroke="#4A4A4A" stroke-width="5" stroke-linecap="round"/>` })}`);
      if (p === 1) return S(`${sun(60, 48)}${field}${crops()}${stump(250, 150)}
        ${rabbit(196, 130, 1, { sleep: true })}
        <path d="M120 150 q26 -24 60 -16" stroke="#C2B29A" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="3 8"/>
        <path d="M226 96 l6 10 M242 90 l0 12 M258 96 l-6 10" stroke="#F0B429" stroke-width="3.5" stroke-linecap="round"/>`);
      if (p === 2) return S(`${sun(60, 48)}${field}${crops()}${stump(280, 152)}
        ${farmer(160, 146, { arms: `<path d="M-9 -8 q-10 -8 -6 -18 M9 -8 q10 -8 6 -18" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>` })}
        ${rabbit(210, 152, .8, { sleep: true })}${bubble(120, 70, "真幸运！", .95)}`);
      if (p === 3) return S(`${moon(330, 46, 22)}${stars()}<rect y="168" width="400" height="72" fill="#7A6A4A"/>
        ${house(120, 110, 1)}
        <path d="M150 66 q6 -12 0 -22 q8 6 8 22" fill="#C8C2B4" opacity=".7"/>
        ${person(250, 150, "#5B84C4", { hair: "#E9B84C" })}
        <ellipse cx="310" cy="164" rx="20" ry="8" fill="#E9DFA8"/>`, SKY_NIGHT);
      if (p === 4) return S(`${sun(60, 48)}${field}${crops()}
        <path d="M120 168 l24 -34 M144 134 l12 -6" stroke="#4A4A4A" stroke-width="5" stroke-linecap="round"/>
        ${farmer(240, 148)}<text x="290" y="90" font-size="30" fill="#8C8375" font-family="Kaiti SC,serif">不干了</text>`);
      if (p === 5 || p === 6) return S(`${sun(60, 48)}${p === 6 ? cloud(120, 40, .9) : ""}${field}${crops(168, p === 6)}${stump(250, 150)}
        <g transform="translate(150,132)"><circle cx="0" cy="-16" r="13" fill="#F2C9A0"/>
        <path d="M-15 -22 a15 15 0 0 1 30 0 Z" fill="#E9B84C"/>
        <path d="M-13 6 q0 -18 13 -18 q13 0 13 18 l-4 34 h-18 Z" fill="#5B84C4"/>
        <path d="M13 -4 q16 6 22 20" stroke="#F2C9A0" stroke-width="7" fill="none" stroke-linecap="round"/>
        <rect x="-14" y="38" width="13" height="8" rx="4" fill="#8A5A34"/><rect x="2" y="38" width="13" height="8" rx="4" fill="#8A5A34"/>
        ${eye(5, -18, 2)}</g>
        ${p === 6 ? `<text x="60" y="80" font-size="24" fill="#8C8375" font-family="Kaiti SC,serif">十天过去了…</text>` : ""}`);
      if (p === 7) return S(`${cloud(80, 44, 1, "#C8D8E0")}${field}${stump(250, 150)}
        <g stroke="#8A9A5A" stroke-width="4" fill="none" stroke-linecap="round">
          <path d="M40 168 q-8 -30 6 -44 M60 168 q10 -26 -4 -40 M100 168 q-8 -26 4 -38 M130 168 q8 -22 -4 -34
                   M300 168 q-8 -28 6 -40 M330 168 q10 -24 -4 -36 M360 168 q-6 -22 4 -32"/></g>
        ${crops(168, true)}`);
      return S(`${sun(60, 48)}${field}${crops(168, true)}${stump(270, 152)}
        ${person(120, 148, "#C4685B", { hair: "#5A3A1E" })}${person(70, 152, "#7290B4", { hair: "#3D4854", s: .9 })}
        <path d="M100 100 q10 8 24 6 M60 108 q8 8 18 6" stroke="#8C8375" stroke-width="3" fill="none" stroke-linecap="round"/>
        <text x="150" y="76" font-size="24" fill="#B93A28" font-family="Kaiti SC,serif">哈哈</text>`);
    },

    jingwa(p) {
      if (p === 0) return S(`${sun(340, 40, 20)}${wellSection(150)}`);
      if (p === 1 || p === 2) return S(`${sun(340, 40, 20)}${wellSection(150, { bird: true })}
        ${p === 1 ? bubble(80, 120, "我多快乐", .9) : bubble(80, 120, "天就井口大", .82)}`);
      if (p === 3) return S(`${sun(340, 40, 20)}${wellSection(154, { bird: true })}
        ${bubble(320, 120, "大得很！", .9)}`);
      if (p === 4) return S(`${sun(340, 40, 20)}${wellSection(150, { frog: { sad: true } })}
        ${bubble(80, 120, "你骗人", .9)}`);
      if (p === 5) return S(`${sun(340, 40, 20)}${wellSection(150, { bird: true })}
        ${bubble(320, 120, "跳出来看", .85)}`);
      if (p === 6) return S(`${sun(330, 44, 24)}${cloud(70, 40, .9)}${grass("#8FBF6F", 186)}
        ${wellTop(200, 196, 1)}
        ${frogA(214, 130, .9)}
        <path d="M190 186 q-4 -30 16 -50" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 8" stroke-linecap="round"/>`);
      if (p === 7) return S(`${sun(330, 44, 24)}${cloud(60, 40, .9)}${cloud(180, 60, .7)}
        <path d="M0 190 L70 130 L140 190 Z" fill="#8FA8C8" opacity=".8"/>
        <path d="M90 190 L180 110 L280 190 Z" fill="#7290B4"/>
        <path d="M240 190 q80 -30 160 0 V240 H240 Z" fill="#63B4D1"/>
        ${grass("#8FBF6F", 190)}
        <path d="M290 205 q12 -7 24 0 M330 214 q12 -7 24 0" stroke="#EAF6FB" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${frogA(80, 210, .9, { arms: true })}
        <path d="M60 84 q6 -8 14 0 q6 -8 14 0 M280 70 q5 -7 12 0 q5 -7 12 0" stroke="#5F7A8A" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      return S(`${sun(330, 44, 24)}${grass("#8FBF6F", 186)}${wellTop(300, 196, .8)}
        ${frogA(140, 196, 1.15, { blush: true })}
        ${bubble(240, 80, "世界真大", .95)}`);
    },

    yugong(p) {
      const ground = grass("#9CCB86", 200);
      if (p === 0) return S(`${sun(348, 40, 22)}${mountains()}${ground}${house(60, 168, .7)}`);
      if (p === 1) return S(`${sun(348, 40, 22)}${mountains()}${ground}
        ${oldMan(120, 190, { s: .95 })}${person(170, 194, "#C4685B", { hair: "#3D4854", s: .85 })}${person(210, 196, "#5B84C4", { hair: "#5A3A1E", s: .8 })}
        ${bubble(120, 110, "移山！", 1)}`);
      if (p === 2) return S(`${sun(348, 40, 22)}${mountains()}${ground}
        ${person(190, 190, "#C4685B", { hair: "#3D4854", arms: `<path d="M9 -8 l16 -12" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/><path d="M23 -20 l8 -6" stroke="#4A4A4A" stroke-width="6" stroke-linecap="round"/>` })}
        ${basketMan(140, 204, "#5B84C4")}
        <path d="M310 214 q30 -10 60 0" stroke="#63B4D1" stroke-width="12" fill="none" stroke-linecap="round"/>
        <g fill="#8C8375"><circle cx="238" cy="206" r="5"/><circle cx="250" cy="210" r="4"/></g>`);
      if (p === 3) return S(`${sun(348, 40, 22)}${mountains()}${ground}
        ${oldMan(150, 192, { s: .95 })}${oldMan(250, 190, { shirt: "#7A8A6A" })}
        ${bubble(290, 110, "不可能！", .95)}`);
      if (p === 4 || p === 5) return S(`${sun(348, 40, 22)}${mountains()}${ground}
        ${oldMan(90, 192, { s: .95 })}
        ${person(150, 196, "#C4685B", { hair: "#3D4854", s: .85 })}${person(190, 198, "#5B84C4", { hair: "#5A3A1E", s: .75 })}${person(224, 200, "#E9A23B", { hair: "#5A3A1E", s: .65 })}${person(252, 202, "#7290B4", { hair: "#5A3A1E", s: .55 })}
        ${p === 4 ? bubble(320, 100, "子子孙孙", .9) : bubble(320, 100, "挖一点少一点", .78)}`);
      if (p === 6) return S(`${sun(348, 40, 22)}${mountains()}${ground}
        ${oldMan(150, 192, { s: .95 })}${oldMan(250, 190, { shirt: "#7A8A6A", blush: true })}
        <text x="290" y="110" font-size="34" fill="#8C8375" font-family="Kaiti SC,serif">…</text>`);
      if (p === 7) return S(`${cloud(90, 60, 1)}${cloud(280, 40, .9)}${mountains({ lift: true })}${ground}
        <g transform="translate(200,70)"><circle r="20" fill="#F6E7B2"/><path d="M-14 -14 l-8 -8 M14 -14 l8 -8 M0 -20 v-12" stroke="#F6E7B2" stroke-width="4" stroke-linecap="round"/></g>
        ${oldMan(190, 200, { s: .9 })}${sparkles(120, 120)}${sparkles(300, 100)}`);
      return S(`${sun(200, 54, 26)}${grass("#9CCB86", 170)}
        <path d="M0 200 h400" stroke="#C7A05C" stroke-width="26"/>
        ${house(70, 138, .8)}${oldMan(180, 176, { s: .95 })}${person(240, 180, "#C4685B", { hair: "#3D4854", s: .8 })}
        ${rainbow(200, 240, 180)}`);
    },

    houzi(p) {
      const night = (body) => S(`${moon(320, 52, 30)}${stars()}${body}`, SKY_NIGHT);
      const hillN = `<rect y="196" width="400" height="44" fill="#3E5A46"/>`;
      const treeN = `<path d="M20 200 q0 -60 26 -92 q10 -12 30 -14" stroke="#5A4632" stroke-width="14" fill="none" stroke-linecap="round"/>
        <path d="M64 96 q60 -18 128 -6" stroke="#5A4632" stroke-width="10" fill="none" stroke-linecap="round"/>
        <circle cx="60" cy="70" r="34" fill="#4E7A50"/><circle cx="110" cy="66" r="26" fill="#5C8A5E"/>`;
      const wellN = (o) => `<g transform="translate(150,210)">
        <ellipse cx="0" cy="8" rx="40" ry="12" fill="#7C8894"/>
        <rect x="-40" y="-10" width="80" height="20" rx="9" fill="#98A4B0"/>
        <ellipse cx="0" cy="-10" rx="34" ry="8" fill="#26303C"/>
        ${o && o.noMoon ? "" : `<circle cx="0" cy="-8" r="12" fill="#F6E7B2" opacity="${o && o.broken ? .4 : .85}"/>`}
        ${o && o.broken ? `<path d="M-16 -8 q8 4 16 0 t16 0" stroke="#F6E7B2" stroke-width="2.5" fill="none" opacity=".8"/>` : ""}</g>`;
      if (p === 0) return night(`${hillN}${treeN}
        ${monkey(240, 180, 1.1, { tailUp: true })}${monkey(300, 186, 1)}${monkey(346, 178, .9, { tailUp: true })}`);
      if (p === 1) return night(`${hillN}${wellN()}
        ${monkey(220, 176, 1.1)}
        <path d="M206 186 l-30 16" stroke="#B4784C" stroke-width="5" stroke-linecap="round"/>
        ${bubble(290, 110, "月亮掉啦！", .95)}`);
      if (p === 2) return night(`${hillN}${wellN()}
        ${monkey(210, 178, 1.15)}${monkey(260, 184, 1)}${monkey(304, 176, .9)}
        ${bubble(310, 110, "捞上来！", .95)}`);
      if (p === 3) return night(`${hillN}${treeN}${wellN()}
        ${monkey(186, 102, 1, { arm: true })}${monkey(176, 140, 1, { arm: true })}${monkey(164, 176, 1, { arm: true })}`);
      if (p === 4) return night(`${hillN}${treeN}${wellN({ broken: true })}
        ${monkey(186, 102, 1, { arm: true })}${monkey(176, 140, 1, { arm: true })}${monkey(160, 172, 1, { arm: true })}
        <path d="M136 196 q6 -4 12 0" stroke="#F6E7B2" stroke-width="2.5" fill="none"/>`);
      if (p === 5) return night(`${hillN}${treeN}${wellN()}
        ${monkey(186, 102, 1, { arm: true })}${monkey(176, 140, 1, { arm: true })}
        <text x="230" y="140" font-size="26" fill="#F6E7B2" font-family="Kaiti SC,serif">？</text>`);
      if (p === 6) return night(`${hillN}${wellN()}
        ${monkey(250, 180, 1.2)}${monkey(300, 186, 1)}
        <path d="M262 164 q6 -10 16 -12" stroke="#B4784C" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${bubble(310, 100, "在天上呢", .9)}`);
      if (p === 7) return night(`${hillN}
        ${monkey(160, 186, 1.1)}${monkey(220, 190, 1)}${monkey(280, 184, .95)}${monkey(336, 190, .9)}
        <path d="M170 168 q40 -20 130 -80" stroke="#F6E7B2" stroke-width="2" fill="none" stroke-dasharray="2 8" opacity=".7"/>`);
      return night(`${hillN}${wellN()}
        ${monkey(260, 184, 1.05)}
        <path d="M290 60 q-60 60 -130 132" stroke="#F6E7B2" stroke-width="2" fill="none" stroke-dasharray="2 8" opacity=".6"/>
        <text x="200" y="60" font-size="22" fill="#F6E7B2" font-family="Kaiti SC,serif">影子</text>`);
    },

    saiweng(p) {
      const base = `${steppe()}`;
      const fence = `<g stroke="#8A7A5A" stroke-width="5" stroke-linecap="round">
        <path d="M300 200 v-30 M340 202 v-30 M380 200 v-30 M292 182 h96 M292 194 h96"/></g>`;
      if (p === 0) return S(`${sun(60, 46, 22, "#F6C453")}${cloud(200, 40, .8)}${base}${fence}
        ${oldMan(100, 176)}${horse2(320, 150, .9)}`, SKY_DUSK);
      if (p === 1) return S(`${cloud(100, 44, .9)}${base}${fence}
        ${oldMan(240, 180)}${person(140, 184, "#C4685B", { hair: "#3D4854" })}${person(90, 188, "#7290B4", { hair: "#5A3A1E", s: .9 })}
        <path d="M320 130 q30 -16 60 -10" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 8" stroke-linecap="round"/>`, SKY_DUSK);
      if (p === 2) return S(`${sun(60, 46, 22, "#F6C453")}${base}${fence}
        ${oldMan(200, 180)}${bubble(150, 90, "未必是坏事", .9)}`, SKY_DUSK);
      if (p === 3) return S(`${sun(60, 46, 22, "#F6C453")}${base}
        ${horse2(240, 150, .95)}${horse2(330, 146, 1, "#C8B49A", "#A8937A")}
        ${oldMan(90, 178)}${sparkles(300, 90)}`, SKY_DUSK);
      if (p === 4) return S(`${sun(60, 46, 22, "#F6C453")}${base}${fence}
        ${oldMan(230, 180)}${person(130, 184, "#C4685B", { hair: "#3D4854" })}
        ${bubble(300, 90, "未必是好事", .88)}`, SKY_DUSK);
      if (p === 5) return S(`${cloud(80, 40, .9)}${base}
        ${horse2(250, 148, 1, "#C8B49A", "#A8937A")}
        ${person(180, 120, "#5B84C4", { hair: "#3D4854", s: .9 })}
        <path d="M180 150 q-6 24 -18 34" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 7" stroke-linecap="round"/>
        <text x="120" y="80" font-size="28" fill="#8C8375" font-family="Kaiti SC,serif">啊！</text>`, SKY_DUSK);
      if (p === 6) return S(`${cloud(300, 40, .9)}${base}
        ${person(220, 182, "#5B84C4", { hair: "#3D4854", arms: `<path d="M9 -6 q10 4 8 16" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="14" y="8" width="5" height="30" rx="2.5" fill="#8A5A34"/>` })}
        <rect x="212" y="196" width="16" height="8" rx="4" fill="#E8E2D4"/>
        ${oldMan(120, 180)}${bubble(90, 96, "未必是坏事", .85)}`, SKY_DUSK);
      if (p === 7) return S(`<rect width="400" height="240" fill="#C8B49A" opacity=".3"/>${base}
        <g fill="#6E5A44" opacity=".85">
          ${person(120, 176, "#6E5A44", { s: .9 })}${person(180, 180, "#6E5A44", { s: .85 })}${person(240, 176, "#6E5A44", { s: .9 })}
        </g>
        <g stroke="#54463A" stroke-width="4" stroke-linecap="round">
          <path d="M136 120 v46 M196 126 v44 M256 120 v46"/>
          <path d="M132 122 l8 -10 M192 128 l8 -10 M252 122 l8 -10"/></g>
        <path d="M320 100 q20 -14 40 -8" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 8"/>`, "#D8C8B0");
      if (p === 8) return S(`${sun(60, 46, 22, "#F6C453")}${base}${house(300, 150, .85)}
        ${person(220, 186, "#5B84C4", { hair: "#3D4854", arms: `<rect x="12" y="-4" width="5" height="34" rx="2.5" fill="#8A5A34"/>` })}
        ${oldMan(140, 182)}<path d="M258 176 q10 -8 22 -4" stroke="#F2C9A0" stroke-width="4" fill="none" stroke-linecap="round"/>`, SKY_DUSK);
      return S(`${sun(200, 70, 30, "#F6C453")}${base}
        <g transform="translate(200,150)" font-family="Kaiti SC,STKaiti,serif">
          <text x="-70" y="10" font-size="34" fill="#B93A28" text-anchor="middle">福</text>
          <text x="70" y="10" font-size="34" fill="#54463A" text-anchor="middle">祸</text>
          <path d="M-40 4 q40 -24 80 0" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 7" marker-end=""/>
          <path d="M40 14 q-40 24 -80 0" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 7"/></g>`, SKY_DUSK);
    },

    kezhou(p) {
      if (p === 0) return S(`${sun(52, 44, 20)}${cloud(150, 38, .8)}${waterBg()}
        ${boat(230, 108)}${person(220, 74, "#C4685B", { hair: "#3D4854" })}`);
      if (p === 1) return S(`${sun(52, 44, 20)}${waterBg()}${boat(230, 108)}
        ${person(220, 74, "#C4685B", { hair: "#3D4854", arms: `<path d="M-9 -6 q-12 2 -16 12" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>` })}
        ${sword(170, 150, 40, .9)}
        <g fill="#BEDAE8"><circle cx="180" cy="130" r="4"/><circle cx="172" cy="118" r="3"/></g>
        <text x="120" y="70" font-size="28" fill="#8C8375" font-family="Kaiti SC,serif">扑通！</text>`);
      if (p === 2) return S(`${sun(52, 44, 20)}${waterBg()}${boat(230, 108)}
        ${person(200, 74, "#C4685B", { hair: "#3D4854" })}${person(260, 74, "#7290B4", { hair: "#5A3A1E", s: .9 })}
        ${bubble(120, 60, "快捞吧！", .95)}`);
      if (p === 3) return S(`${sun(52, 44, 20)}${waterBg()}${boat(230, 108, 1, { mark: true })}
        ${person(250, 74, "#C4685B", { hair: "#3D4854", arms: `<path d="M9 -6 l18 14" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/><path d="M25 6 l8 6" stroke="#8C8375" stroke-width="4" stroke-linecap="round"/>` })}
        ${sparkles(290, 100, "#E8B84C")}`);
      if (p === 4) return S(`${sun(52, 44, 20)}${waterBg()}${boat(230, 108, 1, { mark: true })}
        ${person(220, 74, "#C4685B", { hair: "#3D4854", arms: `<path d="M9 -6 l22 10" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/>` })}
        ${bubble(110, 60, "从这里跳", .9)}`);
      if (p === 5) return S(`${sun(52, 44, 20)}${waterBg()}
        <path d="M300 120 q60 -14 100 0 V240 H300 Z" fill="#C7A05C"/>
        ${boat(220, 112, .95, { mark: true })}${person(210, 78, "#C4685B", { hair: "#3D4854", s: .95 })}`);
      if (p === 6) return S(`${sun(52, 44, 20)}${waterBg()}
        <path d="M300 120 q60 -14 100 0 V240 H300 Z" fill="#C7A05C"/>
        ${boat(230, 106, .9, { mark: true })}
        <g transform="translate(200,170)"><circle cx="0" cy="0" r="10" fill="#F2C9A0"/><path d="M-10 -4 a10 10 0 0 1 20 0 Z" fill="#3D4854"/>
          <path d="M-14 10 q14 12 28 0" stroke="#C4685B" stroke-width="6" fill="none"/></g>
        <g fill="#BEDAE8"><circle cx="230" cy="160" r="4"/><circle cx="180" cy="150" r="3"/></g>
        <text x="120" y="70" font-size="30" fill="#8C8375" font-family="Kaiti SC,serif">？</text>`);
      if (p === 7) return S(`${cloud(80, 40, .9)}${waterBg()}
        ${boat(300, 100, .8, { mark: true })}${sword(80, 205, 24, .9)}
        <path d="M120 200 q80 -60 150 -90" stroke="#EAF0F6" stroke-width="3" fill="none" stroke-dasharray="3 9" opacity=".8"/>
        <g fill="#BEDAE8"><circle cx="96" cy="180" r="3.5"/><circle cx="104" cy="168" r="2.5"/></g>`);
      return S(`${sun(320, 50, 26, "#F6C453")}${waterBg()}
        ${boat(140, 112, .85)}
        <text x="230" y="80" font-size="22" fill="#5F4A38" font-family="Kaiti SC,serif">世界在变化</text>`, SKY_DUSK);
    },

    huashe(p) {
      const men = (n, hl = -1) => {
        const xs = [70, 130, 190, 250, 320];
        const cs = ["#C4685B", "#7290B4", "#5B84C4", "#7A8A6A", "#E9A23B"];
        return xs.slice(0, n).map((x, i) =>
          person(x, 208, cs[i], { hair: "#3D4854", s: i === hl ? 1 : .9 })).join("");
      };
      if (p === 0) return S(`${scrollBg()}
        <rect x="60" y="150" width="200" height="14" rx="7" fill="#C8B88A"/>
        ${winePot(160, 130, .9)}${men(3)}
        <text x="316" y="70" font-size="17" font-family="Kaiti SC,serif" fill="#B93A28" writing-mode="tb">祭祀</text>`);
      if (p === 1) return S(`${scrollBg()}${winePot(250, 120, .8)}
        ${men(4)}${bubble(120, 80, "比赛画蛇", .95)}`);
      if (p === 2) return S(`${scrollBg()}${snakeBody()}
        ${person(90, 200, "#C4685B", { hair: "#3D4854", arms: `<path d="M9 -8 l16 -18" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/><path d="M23 -24 l6 -10" stroke="#5A4632" stroke-width="3.5" stroke-linecap="round"/>` })}
        ${sparkles(310, 60)}`);
      if (p === 3) return S(`${scrollBg()}${snakeBody()}${winePot(340, 168, .9)}
        ${person(90, 200, "#C4685B", { hair: "#3D4854", arms: `<path d="M9 -8 l16 -18" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/><path d="M23 -24 l6 -10" stroke="#5A4632" stroke-width="3.5" stroke-linecap="round"/>` })}
        ${bubble(120, 60, "添几只脚！", .9)}`);
      if (p === 4) return S(`${scrollBg()}${snakeBody()}${snakeLegs()}
        ${person(90, 200, "#C4685B", { hair: "#3D4854" })}
        ${person(330, 200, "#7290B4", { hair: "#5A3A1E", arms: `<path d="M-9 -8 q-10 -6 -8 -16" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>` })}
        ${sparkles(330, 120, "#7290B4")}`);
      if (p === 5) return S(`${scrollBg()}${snakeBody()}${snakeLegs()}${winePot(330, 150, .85)}
        ${person(260, 204, "#7290B4", { hair: "#5A3A1E", arms: `<path d="M9 -8 l20 -30" stroke="#F2C9A0" stroke-width="5" stroke-linecap="round"/>` })}
        ${bubble(120, 60, "不是蛇！", .95)}`);
      if (p === 6) return S(`${scrollBg()}
        ${person(200, 200, "#7290B4", { hair: "#5A3A1E", arms: `<path d="M9 -8 q12 -8 10 -22" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>` })}
        ${winePot(226, 150, .7)}
        <path d="M214 166 q6 -8 2 -14" stroke="#9CD3E4" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      if (p === 7) return S(`${scrollBg()}${snakeBody()}${snakeLegs()}
        <g transform="translate(90,206)"><circle cx="0" cy="-24" r="10" fill="#F2C9A0"/>
          <path d="M-11 -28 a11 11 0 0 1 22 0 Z" fill="#3D4854"/>
          <rect x="-9" y="-14" width="18" height="26" rx="7" fill="#C4685B"/>
          <path d="M-9 -10 q-10 2 -10 14 M9 -10 q10 2 10 14" stroke="#F2C9A0" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M-4 -20 q4 -4 8 0" stroke="#8A5A34" stroke-width="2" fill="none"/></g>
        <text x="150" y="70" font-size="24" fill="#8C8375" font-family="Kaiti SC,serif">唉……</text>`);
      return S(`${scrollBg()}
        <path d="M70 110 q26 -40 56 -20 q30 20 54 -12" stroke="#5C8A52" stroke-width="12" fill="none" stroke-linecap="round"/>
        <g transform="translate(190,72)"><circle r="10" fill="#5C8A52"/>${eye(4, -2, 1.5)}</g>
        <path d="M70 190 q26 -40 56 -20 q30 20 54 -12" stroke="#A8B49A" stroke-width="12" fill="none" stroke-linecap="round"/>
        <g stroke="#D94F3D" stroke-width="4" fill="none" stroke-linecap="round">
          <path d="M96 186 l-5 16 M120 192 l-2 16 M150 182 l5 16"/></g>
        <text x="248" y="100" font-size="20" font-family="Kaiti SC,serif" fill="#4E9A51">✓</text>
        <text x="248" y="180" font-size="20" font-family="Kaiti SC,serif" fill="#B93A28">✗</text>`);
    },

    bb1(p) {
      const g = grass("#9CCB86", 192);
      if (p === 0) return S(`${sun()}${cloud(60, 44, .9)}${g}
        ${papaBlob(200, 150, 1)}${blobKid(130, 172, "round")}${blobKid(276, 174, "square")}`);
      if (p === 1) return S(`${sun()}${cloud(300, 60, .8)}${g}
        ${papaBlob(200, 120, 1.1)}
        <path d="M150 60 q10 -10 20 0 M240 50 q10 -10 20 0" stroke="#F08A4B" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
        ${sparkles(120, 100, "#F2A0B4")}${sparkles(280, 90)}`);
      if (p === 2) return S(`${sun(56, 44)}${g}
        <path d="M120 160 q-20 -60 40 -60 q-10 -40 50 -30 q30 -30 60 0 q40 10 20 50 q30 30 -20 44 q-30 24 -70 6 q-50 14 -80 -10 Z" fill="#F08A4B"/>
        ${papaFace(210, 110, 1.1)}${bubble(90, 70, "变！", 1.2)}`);
      if (p === 3) return S(`${sun(340, 40, 20)}${cloud(70, 90, .8)}${cloud(280, 120, .7)}${g}
        <g transform="translate(190,80) rotate(-8)">
          <ellipse cx="0" cy="0" rx="60" ry="18" fill="#F08A4B"/>
          <ellipse cx="-6" cy="-14" rx="18" ry="10" fill="#E07838"/>
          <path d="M-20 6 l-16 22 h24 Z M20 6 l16 22 h-24 Z" fill="#E07838"/>
          ${papaFace(34, -2, .7)}</g>
        <g transform="translate(280,60)"><path d="M-12 0 q6 -10 12 0 q6 -10 12 0" stroke="#5F7A8A" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>
        ${blobKid(90, 178, "round")}${blobKid(140, 180, "square")}`);
      if (p === 4) return S(`${sun()}${g}${papaSlide()}
        ${blobKid(240, 128, "round")}${blobKid(348, 168, "square")}
        <path d="M258 108 q10 -10 20 -4" stroke="#F2A0B4" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`);
      if (p === 5) return S(`${moon(330, 46, 24)}${stars()}<rect y="192" width="400" height="48" fill="#4E5A66"/>
        <g transform="translate(200,166)">
          <path d="M-90 12 q-10 -34 24 -34 h132 q34 0 24 34 q-4 14 -24 14 h-132 q-20 0 -24 -14 Z" fill="#F08A4B"/>
          ${papaFace(-64, 0, .8)}</g>
        ${blobKid(220, 152, "round", .9)}${zzz(260, 120)}`, SKY_NIGHT);
      if (p === 6) return S(`${sun()}${g}
        ${papaBlob(200, 152, 1)}${mamaBlob(280, 176, 1)}${blobKid(130, 176, "round")}${blobKid(90, 182, "square", .9)}
        <g fill="#E8637C"><path d="M200 60 q6 -12 14 -4 q8 -8 14 4 q0 10 -14 18 q-14 -8 -14 -18 Z"/></g>`);
      return S(`${sun(56, 44)}${g}
        ${papaBlob(160, 152, 1)}
        <text x="270" y="120" font-size="60" fill="#B93A28" font-family="Kaiti SC,serif">？</text>
        ${blobKid(280, 176, "round")}${blobKid(330, 180, "square")}`);
    },

    bb2(p) {
      const g = grass("#9CCB86", 196);
      const bigTree = tree(300, 100, 1.15);
      const kitten = (x, y, s = 1, o = {}) => catA(x, y, s, Object.assign({ c: "#E9DFA8", c2: "#D9C878" }, o));
      if (p === 0) return S(`${sun(56, 44)}${g}${bigTree}
        ${kitten(298, 84, 1.1)}
        <path d="M260 190 q20 -40 34 -96" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 8" stroke-linecap="round"/>`);
      if (p === 1) return S(`${cloud(80, 40, .9)}${g}${bigTree}
        ${kitten(298, 82, 1.1)}
        <text x="230" y="60" font-size="24" fill="#8C8375" font-family="Kaiti SC,serif">喵呜——</text>
        <path d="M316 96 l4 8 M324 92 l6 7" stroke="#9CD3E4" stroke-width="3" stroke-linecap="round"/>`);
      if (p === 2) return S(`${sun(56, 44)}${g}${bigTree}${kitten(298, 82, 1.1)}
        ${blobKid(100, 180, "round")}${blobKid(150, 182, "square")}
        ${bubble(110, 100, "爸爸快来！", .95)}`);
      if (p === 3) return S(`${sun(56, 44)}${g}${bigTree}${kitten(298, 82, 1.1)}
        <g transform="translate(120,150)">
          <path d="M0 -46 q40 0 44 38 q4 34 -18 44 q-26 10 -52 0 q-22 -10 -18 -44 q4 -38 44 -38 Z" fill="#F08A4B" transform="skewX(-8)"/>
          ${papaFace(0, -8, 1)}</g>
        ${bubble(200, 60, "变！", 1.2)}
        <path d="M60 190 q14 -8 24 0 M40 200 q12 -7 20 0" stroke="#E07838" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`);
      if (p === 4) return S(`${sun(56, 44)}${g}${bigTree}${papaLadder()}
        ${kitten(228, 88, 1)}
        ${blobKid(84, 176, "round")}${blobKid(134, 178, "square")}`);
      if (p === 5) return S(`${sun(56, 44)}${g}${bigTree}${papaLadder()}
        ${kitten(206, 138, 1, { flip: true })}
        ${blobKid(84, 176, "round")}${blobKid(134, 178, "square")}
        <path d="M226 108 q-10 16 -16 22" stroke="#8C8375" stroke-width="3" fill="none" stroke-dasharray="3 7" stroke-linecap="round"/>`);
      if (p === 6) return S(`${sun(56, 44)}${g}
        ${papaBlob(220, 156, 1)}${kitten(140, 184, 1.15)}
        ${bubble(110, 100, "谢谢！", 1)}
        <g fill="#E8637C"><path d="M170 130 q4 -9 10 -3 q6 -6 10 3 q0 8 -10 13 q-10 -5 -10 -13 Z"/></g>`);
      return S(`${sun(56, 44)}${g}
        ${papaBlob(180, 152, 1)}${blobKid(260, 176, "round")}${blobKid(310, 180, "square")}${kitten(110, 186, 1)}
        ${bubble(300, 90, "小事一件！", .9)}`);
    },

    bb3(p) {
      const g = grass("#8FBF6F", 196);
      const picnic = `<ellipse cx="200" cy="210" rx="80" ry="16" fill="#F2C4CE"/>
        <rect x="168" y="192" width="26" height="16" rx="4" fill="#C7A05C"/>
        <circle cx="222" cy="198" r="9" fill="#E8637C"/><circle cx="240" cy="202" r="7" fill="#F0B429"/>`;
      if (p === 0) return S(`${sun(330, 44, 24)}${cloud(70, 40, .9)}${g}${picnic}
        ${papaBlob(110, 160, .9)}${mamaBlob(300, 182, 1)}${blobKid(160, 184, "round", .9)}${blobKid(260, 186, "square", .9)}`);
      if (p === 1) return S(`${cloud(80, 44, 1.2, "#8FA6B4")}${cloud(230, 30, 1.1, "#8FA6B4")}${cloud(330, 56, .9, "#8FA6B4")}
        ${rain(100, 66)}${rain(260, 54)}${rain(340, 76)}${g}${picnic}
        ${papaBlob(110, 164, .85)}${blobKid(170, 186, "round", .85)}${blobKid(250, 188, "square", .85)}
        <text x="150" y="110" font-size="24" fill="#5F7A8A" font-family="Kaiti SC,serif">哗啦啦！</text>`, SKY_RAIN);
      if (p === 2) return S(`${cloud(200, 36, 1.2, "#8FA6B4")}${rain(180, 58)}${rain(300, 50)}${g}
        ${blobKid(200, 180, "square", 1.1)}
        <rect x="170" y="196" width="24" height="14" rx="4" fill="#C7A05C" opacity=".8"/>
        <path d="M212 150 l3 9 M222 148 l3 9" stroke="#7FA8BC" stroke-width="3" stroke-linecap="round"/>
        ${bubble(120, 90, "面包湿了！", .9)}`, SKY_RAIN);
      if (p === 3) return S(`${cloud(90, 36, 1.1, "#8FA6B4")}${rain(110, 58)}${g}
        <path d="M170 170 q-16 -56 34 -56 q50 0 34 56 q24 -6 20 24 q-54 16 -108 0 q-4 -30 20 -24 Z" fill="#F08A4B"/>
        ${papaFace(204, 140, 1)}${bubble(300, 80, "变！", 1.2)}`, SKY_RAIN);
      if (p === 4) return S(`${cloud(50, 40, 1.1, "#AFC6D2")}${cloud(320, 48, .8, "#AFC6D2")}
        ${rain(60, 70)}${rain(300, 66)}${g}${papaUmbrella()}
        ${blobKid(158, 176, "round")}${blobKid(244, 178, "square")}${mamaBlob(316, 186, .95)}`, SKY_RAIN);
      if (p === 5) return S(`${cloud(60, 34, 1.2, "#8FA6B4")}${cloud(220, 26, 1.1, "#8FA6B4")}
        ${rain(80, 56)}${rain(240, 48)}${rain(160, 66)}${g}
        <path d="M0 216 q60 -12 120 0 t120 0 t120 0 q20 -2 40 0 V240 H0 Z" fill="#63B4D1"/>
        ${papaUmbrella(200, 86)}
        ${blobKid(160, 180, "round", .95)}${blobKid(242, 182, "square", .95)}`, SKY_RAIN);
      if (p === 6) return S(`${cloud(300, 36, 1, "#8FA6B4")}${rain(320, 58)}
        <rect y="196" width="400" height="44" fill="#63B4D1"/>
        <path d="M0 196 Q100 188 200 196 T400 196" stroke="#9CD8E8" stroke-width="4" fill="none"/>
        <path d="M150 130 q-20 -50 30 -50 q50 0 30 50 q26 0 18 26 q-48 12 -96 0 q-8 -26 18 -26 Z" fill="#F08A4B"/>
        ${papaFace(180, 106, .95)}${bubble(300, 90, "再变！", 1.1)}`, SKY_RAIN);
      if (p === 7) return S(`${cloud(70, 40, .9, "#AFC6D2")}
        <rect y="180" width="400" height="60" fill="#63B4D1"/>
        <path d="M0 180 Q100 172 200 180 T400 180" stroke="#9CD8E8" stroke-width="5" fill="none"/>
        ${papaBoat(200, 158)}
        ${blobKid(160, 146, "round", .9)}${blobKid(226, 148, "square", .9)}${mamaBlob(290, 152, .85)}
        <path d="M60 210 q12 -7 24 0 M320 216 q12 -7 24 0" stroke="#EAF6FB" stroke-width="4" fill="none" stroke-linecap="round"/>`, SKY_RAIN);
      if (p === 8) return S(`${sun(340, 44, 22)}${rainbow(200, 240, 175)}${g}
        ${papaBlob(150, 160, .95)}${blobKid(230, 182, "round", .95)}${blobKid(282, 184, "square", .95)}${mamaBlob(336, 186, .9)}`);
      return S(`${sun(330, 48, 26)}${g}${house(90, 140, .95)}
        ${blobKid(200, 178, "round", 1.05)}${blobKid(258, 180, "square", 1.05)}
        ${bubble(310, 100, "真好玩！", 1)}`);
    },

    bb4(p) {
      const g = `<rect y="192" width="400" height="48" fill="#F2A0B4" opacity=".35"/>`;
      const balloons = `<g><circle cx="50" cy="70" r="16" fill="#F2A0B4"/><circle cx="80" cy="52" r="14" fill="#7FA8D9"/>
        <path d="M50 86 q-2 20 4 34 M80 66 q2 20 -2 30" stroke="#8C8375" stroke-width="2" fill="none"/></g>`;
      if (p === 0) return S(`${sun(340, 44, 20)}${balloons}${g}
        ${blobKid(180, 176, "round", 1.05)}${blobKid(240, 178, "square", 1.05)}${sparkles(300, 80)}
        <text x="120" y="60" font-size="26" fill="#B93A28" font-family="Kaiti SC,serif">生日快乐！</text>`, SKY_WARM);
      if (p === 1) return S(`${confetti()}${g}
        ${papaBlob(200, 152, 1)}${blobKid(120, 178, "round")}${blobKid(286, 180, "square")}
        ${bubble(310, 80, "都可以！", 1)}`, SKY_WARM);
      if (p === 2) return S(`${sun(56, 44, 20)}${g}
        <g transform="translate(230,60)">
          <path d="M-60 -20 q60 -30 120 0" stroke="#F08A4B" stroke-width="12" fill="none" stroke-linecap="round"/>
          <path d="M-52 -22 v90 M52 -22 v90" stroke="#E07838" stroke-width="7" stroke-linecap="round"/>
          <rect x="-34" y="60" width="68" height="12" rx="6" fill="#F08A4B"/>
          ${papaFace(0, -34, .75)}</g>
        ${blobKid(230, 108, "round")}
        <path d="M160 140 q-20 30 -30 50" stroke="#F2A0B4" stroke-width="3" fill="none" stroke-dasharray="3 8" stroke-linecap="round"/>`, SKY_WARM);
      if (p === 3) return S(`${sun(340, 40, 18)}${g}
        <g transform="translate(190,160)">
          <rect x="-110" y="-24" width="90" height="44" rx="16" fill="#F08A4B"/>
          <rect x="-8" y="-16" width="70" height="36" rx="10" fill="#F2C4CE"/>
          <rect x="74" y="-16" width="70" height="36" rx="10" fill="#B8D8F0"/>
          <circle cx="-88" cy="26" r="10" fill="#5A4632"/><circle cx="-44" cy="26" r="10" fill="#5A4632"/>
          <circle cx="20" cy="26" r="9" fill="#5A4632"/><circle cx="106" cy="26" r="9" fill="#5A4632"/>
          ${papaFace(-66, -6, .8)}
          <path d="M-104 -34 q-2 -12 6 -18 M-96 -32 q0 -10 8 -14" stroke="#C8C2B4" stroke-width="4" fill="none" stroke-linecap="round"/></g>
        ${blobKid(226, 152, "round", .8)}${blobKid(310, 152, "square", .8)}
        <text x="70" y="70" font-size="24" fill="#8C8375" font-family="Kaiti SC,serif">呜呜——</text>`, SKY_WARM);
      if (p === 4) return S(`${g}${cake(200, 168, 1.2)}
        ${mamaBlob(110, 178, 1.05)}
        ${blobKid(280, 180, "round", .95)}${blobKid(330, 182, "square", .95)}${sparkles(300, 70)}`, SKY_WARM);
      if (p === 5) return S(`${confetti()}${g}${cake(200, 172, 1.1)}
        ${blobKid(120, 180, "round")}${blobKid(286, 182, "square")}
        <g font-family="Kaiti SC,serif" fill="#B93A28"><text x="60" y="70" font-size="20">♪ 祝你生日快乐 ♪</text></g>
        <path d="M186 128 q6 -8 2 -14 M214 126 q6 -8 2 -14" stroke="#8C8375" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, SKY_WARM);
      if (p === 6) return S(`${sun(340, 44, 20)}${g}
        ${papaBlob(260, 152, 1)}${blobKid(140, 178, "round", 1.05)}${blobKid(90, 182, "square", 1)}
        ${bubble(120, 90, "最好玩的爸爸", .8)}`, SKY_WARM);
      return S(`${confetti()}${g}${papaHeart()}
        ${blobKid(160, 186, "round", .95)}${blobKid(256, 188, "square", .95)}${mamaBlob(208, 194, .9)}
        ${sparkles(90, 80, "#E8637C")}${sparkles(300, 70)}`, SKY_WARM);
    },
  };

  /* generic scenes for imported stories — cycles so pages still vary */
  const importScenes = [
    () => S(`<rect x="90" y="50" width="220" height="150" rx="8" fill="#F8F4E8" stroke="#C8B88A" stroke-width="3"/>
      <g stroke="#C8B88A" stroke-width="4" stroke-linecap="round"><path d="M120 90 h160 M120 120 h160 M120 150 h110"/></g>
      <text x="250" y="188" font-size="38" font-family="Kaiti SC,STKaiti,serif" fill="#B93A28">读</text>`, "#EAE2CE"),
    () => S(`${sun(320, 50, 24)}${cloud(80, 46, 1)}
      <path d="M100 200 q100 -60 200 0 Z" fill="#F8F4E8" stroke="#C8B88A" stroke-width="3"/>
      <path d="M200 160 v-60" stroke="#C8B88A" stroke-width="3"/>
      <path d="M200 100 q30 -20 60 0 q-30 8 -60 0 Z" fill="#E8637C" opacity=".8"/>`, "#EAE2CE"),
    () => S(`${moon(310, 56, 26)}${stars()}
      <rect x="110" y="90" width="180" height="110" rx="8" fill="#F8F4E8"/>
      <path d="M200 90 v110" stroke="#C8B88A" stroke-width="3"/>
      <g stroke="#D8CCAA" stroke-width="3" stroke-linecap="round"><path d="M130 120 h50 M130 140 h50 M220 120 h50 M220 140 h34"/></g>`, "#3D4854"),
    () => S(`${sun(60, 50, 22)}
      <circle cx="260" cy="130" r="60" fill="#F8F4E8" stroke="#C8B88A" stroke-width="3"/>
      <text x="260" y="150" font-size="52" text-anchor="middle" font-family="Kaiti SC,STKaiti,serif" fill="#B93A28">书</text>
      ${flower(110, 180, "#E8637C", "#FFD9E0")}${flower(160, 190, "#F0B429", "#FFF0C4", .85)}`, "#EAE2CE"),
  ];

  function pageArt(id, page, total) {
    const fn = SCENES[id];
    if (fn) { try { return fn(page, total); } catch (e) { return null; } }
    return importScenes[page % importScenes.length]();
  }

  /* covers for library cards — a representative scene per story */
  const COVER = { xiaoma: 9, luobo: 6, kedou: 8, guitu: 5, hudie: 9, bb1: 4, bb2: 4, bb3: 4, bb4: 7,
                  shouzhu: 5, jingwa: 7, yugong: 7, houzi: 3, saiweng: 3, kezhou: 3, huashe: 4 };
  const ART = {};
  for (const id in SCENES) ART[id] = pageArt(id, COVER[id] || 0, 10);

  window.DIANDU_ART = ART;
  window.DIANDU_ART_PAGE = pageArt;
})();
