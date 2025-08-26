function getDomainFromUrl(u) { try { return new URL(u).hostname; } catch { return ""; } }

async function getWhitelist() {
  return new Promise(res => chrome.runtime.sendMessage({ type: "UG_GET_WHITELIST" }, res));
}
async function setWhitelist(wl) {
  return new Promise(res => chrome.runtime.sendMessage({ type: "UG_SET_WHITELIST", whitelist: wl }, res));
}

(async function () {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = getDomainFromUrl(tab?.url || "");
  document.getElementById("host").textContent = host ? `Domaine: ${host}` : "—";

  const wl = await getWhitelist();
  const whitelisted = host && wl.includes(host);
  const btn = document.getElementById("toggle");
  btn.textContent = whitelisted ? "Retirer de la liste sûre" : "Ajouter à la liste sûre";

  btn.onclick = async () => {
    const current = await getWhitelist();
    const idx = current.indexOf(host);
    if (idx >= 0) current.splice(idx, 1); else current.push(host);
    await setWhitelist(current);
    btn.textContent = current.includes(host) ? "Retirer de la liste sûre" : "Ajouter à la liste sûre";
  };
})();
