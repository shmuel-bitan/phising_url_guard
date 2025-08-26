// --- Détection basique homographe / unicode ---

const SCRIPTS = {
  latin: /[A-Za-z\u00C0-\u024F]/,               // Latin étendu
  cyrillic: /[\u0400-\u04FF]/,
  greek: /[\u0370-\u03FF]/
};

function hasNonASCII(str) { return /[^\x00-\x7F]/.test(str); }
function isPunycodeLabel(label) { return label.startsWith("xn--"); }
function hostnameHasPunycode(hn) { return hn.split(".").some(isPunycodeLabel); }

function detectMixedScripts(hn) {
  const s = hn.normalize("NFC");
  const present = [];
  for (const [name, rx] of Object.entries(SCRIPTS)) {
    if (rx.test(s)) present.push(name);
  }
  return present.length >= 2; // mélange de familles (ex: latin + cyrillique)
}

function needsWarning(urlObj) {
  const hn = urlObj.hostname;
  return (
    hasNonASCII(hn) ||
    hostnameHasPunycode(hn) ||
    detectMixedScripts(hn)
  );
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

// --- Check au chargement + avant saisie mot de passe ---

(async function main() {
  const urlObj = new URL(location.href);
  const wl = await sendBG("UG_GET_WHITELIST");
  if (wl.includes(currentHost)) return;

  let reason = [];
  if (hasNonASCII(urlObj.hostname)) reason.push("caractères non-ASCII");
  if (hostnameHasPunycode(urlObj.hostname)) reason.push("punycode (xn--)");
  if (detectMixedScripts(urlObj.hostname)) reason.push("mélange d’alphabets");

  const suspicious = reason.length > 0;
  if (suspicious) injectBanner(reason.join(", "));

  // Hook avant soumission de mot de passe
  const onBeforePassword = (ev) => {
    if (!bannerEl && suspicious) {
      injectBanner(reason.join(", "));
      // Empêche la soumission immédiate pour laisser l’utilisateur décider
      const form = ev.target.closest("form");
      if (form) ev.preventDefault();
    }
  };

  // Pour les champs déjà présents…
  document.addEventListener("input", (e) => {
    if (e.target && e.target.matches && e.target.matches('input[type="password"]')) {
      onBeforePassword(e);
    }
  }, { capture: true });

  // Et la soumission de formulaires
  document.addEventListener("submit", (e) => {
    if (e.target && e.target.querySelector && e.target.querySelector('input[type="password"]')) {
      if (!bannerEl && suspicious) {
        injectBanner(reason.join(", "));
        e.preventDefault();
      }
    }
  }, { capture: true });

})();
