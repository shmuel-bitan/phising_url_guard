// Pour l’instant, on garde léger : la logique est dans content.js.
// Ici on expose juste un petit pont pour gérer la whitelist depuis le popup.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "UG_GET_WHITELIST") {
    chrome.storage.sync.get({ whitelist: [] }, d => sendResponse(d.whitelist));
    return true;
  }
  if (msg.type === "UG_SET_WHITELIST") {
    chrome.storage.sync.set({ whitelist: msg.whitelist }, () => sendResponse(true));
    return true;
  }
});
