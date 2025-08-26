// --- Détection basique homographe / unicode + lookalike ---

// === Réglages rapides ===
const LOOKALIKE_ENABLED = true;
const LOOKALIKE_MAX_DISTANCE = 2;        // seuil Levenshtein
const LOOKALIKE_CHECK_TLD = true;        // alerte aussi si seul le TLD diffère
const BRANDS = [
  "google.com",
  "gmail.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "apple.com",
  "icloud.com",
  "microsoft.com",
  "live.com",
  "outlook.com",
  "paypal.com",
  "amazon.com",
  "bing.com",
  "netflix.com",
  // Ajoute tes banques / services pro :
  "banquepopulaire.fr",
  "credit-agricole.fr",
  "societegenerale.fr",
  "impots.gouv.fr"
];

// === Détecteurs unicode/homographes ===
const SCRIPTS = {
  latin: /[A-Za-z\u00C0-\u024F]/,
  cyrillic: /[\u0400-\u04FF]/,
  greek: /[\u0370-\u03FF]/
};
function hasNonASCII(str) { return /[^\x00-\x7F]/.test(str); }
function isPunycodeLabel(label) { return label.startsWith("xn--"); }
function hostnameHasPunycode(hn) { return hn.split(".").some(isPunycodeLabel); }
function detectMixedScripts(hn) {
  const s = hn.normalize("NFC");
  const present = [];
  for (const [name, rx] of Object.entries(SCRIPTS)) if (rx.test(s)) present.push(name);
  return present.length >= 2;
}

// === Normalisation "confusables" pour lookalike ===
// Mapping minimal efficace : chiffres → lettres, cyrillique/grec visuellement proches → latin
const CONFUSABLES = new Map(Object.entries({
  "0":"o", "1":"l", "3":"e", "5":"s", "7":"t",
  // cyrillique → latin
  "а":"a","А":"A","е":"e","Е":"E","о":"o","О":"O","р":"p","Р":"P","с":"s","С":"S","у":"y","У":"Y","х":"x","Х":"X","і":"i","І":"I",
  // grec → latin
  "ο":"o","Ο":"O","ν":"v","Ν":"N","ρ":"p","Ρ":"P","χ":"x","Χ":"X","μ":"m","Μ":"M",
  // variantes typographiques
  "ꓲ":"l","Ι":"I","ⅼ":"l","ȷ":"j","Ꮯ":"C","ᴏ":"o","ᥣ":"l"
}));
function normalizeConfusables(str){
  let out = "";
  for (const ch of str.normalize("NFKC")) out += CONFUSABLES.get(ch) ?? ch.toLowerCase();
  return out;
}

// === Outils domaines ===
function getHostLabels(host) {
  return host.split(".").filter(Boolean);
}
// approximation eTLD+1 (suffit pour l’heuristique MVP)
function getETLD1(host) {
  const labs = getHostLabels(host);
  if (labs.length <= 2) return host.toLowerCase();
  const last = labs.slice(-2).join(".");
  return last.toLowerCase();
}
function getSLD(host){ // second-level (sans TLD) pour comparer "google" vs "g00gle"
  const labs = getHostLabels(host.toLowerCase());
  if (labs.length < 2) return host.toLowerCase();
  return labs[labs.length - 2];
}
function getTLD(host){
  const labs = getHostLabels(host.toLowerCase());
  return labs[labs.length - 1] || "";
}

// === Levenshtein simple (non récursif) ===
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i < v0.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

// === Lookalike principal ===
function checkLookalike(host) {
  if (!LOOKALIKE_ENABLED) return null;

  const victimETLD1 = getETLD1(host);          // ex: "paypa1.com"
  const victimSLD = normalizeConfusables(getSLD(host)); // "paypa1" -> "paypal"
  const victimTLD = getTLD(host);              // "com"

  let best = {brand:null, dist:999, reason:null};

  for (const brand of BRANDS) {
    const bETLD1 = getETLD1(brand);
    const bSLD = normalizeConfusables(getSLD(brand));
    const bTLD = getTLD(brand);

    // 1) si seul le TLD diffère et le SLD normalisé est identique → suspect immédiat
    if (LOOKALIKE_CHECK_TLD && victimSLD === bSLD && victimTLD !== bTLD) {
      return { brand: bETLD1, dist: 0, reason: "TLD différent (ressemble à " + bETLD1 + ")" };
    }

    // 2) distance sur SLD normalisés
    const d = levenshtein(victimSLD, bSLD);
    if (d < best.dist) best = { brand: bETLD1, dist: d, reason: "similaire à " + bETLD1 };

    if (d <= LOOKALIKE_MAX_DISTANCE && victimETLD1 !== bETLD1) {
      return { brand: bETLD1, dist: d, reason: `proche de ${bETLD1} (distance ${d})` };
    }
  }
  return null;
}

function needsWarning(urlObj) {
  const hn = urlObj.hostname;
  return hasNonASCII(hn) || hostnameHasPunycode(hn) || detectMixedScripts(hn);
}

// --- UI bandeau ---

let bannerEl = null;
let currentHost = location.hostname;

function injectBanner(reasonText) {
  if (bannerEl) return;

  bannerEl = document.createElement("div");
  bannerEl.id = "ug-banner";
  bannerEl.style.position = "fixed";
  bannerEl.style.top = "0";
  bannerEl.style.left = "0";
  bannerEl.style.right = "0";
  bannerEl.style.zIndex = "2147483647";
  bannerEl.style.fontFamily = "system-ui, sans-serif";
  bannerEl.style.padding = "12px 16px";
  bannerEl.style.background = "#ffcc00";
  bannerEl.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)";
  bannerEl.style.display = "flex";
  bannerEl.style.gap = "12px";
  bannerEl.style.alignItems = "center";

  const txt = document.createElement("div");
  txt.style.flex = "1";
  txt.style.fontSize = "14px";
  txt.style.color = "#111";
  txt.textContent = `Alerte URL Guard: domaine suspect (${reasonText}).`;
  bannerEl.appendChild(txt);

  const btnLeave = document.createElement("button");
  btnLeave.textContent = "Quitter la page";
  btnLeave.style.padding = "8px 12px";
  btnLeave.style.border = "none";
  btnLeave.style.cursor = "pointer";
  btnLeave.style.fontWeight = "600";
  btnLeave.onclick = () => { location.href = "about:blank"; };
  bannerEl.appendChild(btnLeave);

  const btnProceed = document.createElement("button");
  btnProceed.textContent = "Continuer";
  btnProceed.style.padding = "8px 12px";
  btnProceed.style.border = "none";
  btnProceed.style.cursor = "pointer";
  btnProceed.onclick = () => { bannerEl.remove(); bannerEl = null; };
  bannerEl.appendChild(btnProceed);

  const btnWhitelist = document.createElement("button");
  btnWhitelist.textContent = `Toujours autoriser ${currentHost}`;
  btnWhitelist.style.padding = "8px 12px";
  btnWhitelist.style.border = "none";
  btnWhitelist.style.cursor = "pointer";
  btnWhitelist.onclick = async () => {
    const wl = await sendBG("UG_GET_WHITELIST");
    if (!wl.includes(currentHost)) wl.push(currentHost);
    await sendBG("UG_SET_WHITELIST", { whitelist: wl });
    bannerEl.remove(); bannerEl = null;
  };
  bannerEl.appendChild(btnWhitelist);

  document.documentElement.style.scrollMarginTop = "48px";
  document.body?.prepend(bannerEl);
}

// --- Bridge vers background pour whitelist ---
function sendBG(type, payload = {}) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

// --- Main ---
(async function main() {
  const urlObj = new URL(location.href);
  const wl = await sendBG("UG_GET_WHITELIST");
  if (wl.includes(currentHost)) return;

  // Raison Unicode/punycode/scripts
  const reasons = [];
  if (hasNonASCII(urlObj.hostname)) reasons.push("caractères non-ASCII");
  if (hostnameHasPunycode(urlObj.hostname)) reasons.push("punycode (xn--)");
  if (detectMixedScripts(urlObj.hostname)) reasons.push("mélange d’alphabets");

  // Raison lookalike
  const look = checkLookalike(urlObj.hostname);
  if (look) reasons.push(`lookalike: ${look.reason}`);

  const suspicious = reasons.length > 0;
  if (suspicious) injectBanner(reasons.join(", "));

  // Bloquer la 1re soumission si password détecté
  const onBeforePassword = (ev) => {
    if (!bannerEl && suspicious) {
      injectBanner(reasons.join(", "));
      const form = ev.target.closest("form");
      if (form) ev.preventDefault();
    }
  };
  document.addEventListener("input", (e) => {
    if (e.target && e.target.matches && e.target.matches('input[type="password"]')) {
      onBeforePassword(e);
    }
  }, { capture: true });

  document.addEventListener("submit", (e) => {
    if (e.target && e.target.querySelector && e.target.querySelector('input[type="password"]')) {
      if (!bannerEl && suspicious) {
        injectBanner(reasons.join(", "));
        e.preventDefault();
      }
    }
  }, { capture: true });

})();
