# 🛡️ URL Guard — Anti-Homograph & Lookalike Detector (Chrome Extension)

Protège contre les URLs douteuses utilisées dans des attaques de phishing :  
- **caractères non latins** (cyrillique, grec, etc.)  
- **punycode** (`xn--…`)  
- **mélange d’alphabets** (Latin + autres scripts)  
- **lookalike domains** (ex. `paypa1.com` ressemblant à `paypal.com`)  

L’extension affiche une **bannière d’alerte** avant toute saisie de mot de passe et propose :  
➡️ **Quitter la page**  
➡️ **Continuer malgré l’avertissement**  
➡️ **Ajouter le domaine en liste sûre (whitelist)**  

---

## ✨ Fonctionnalités

- 🔎 Détection de caractères **non-ASCII**  
- ⚠️ Détection de **punycode / xn--**  
- 🌐 Détection de **scripts mixtes** (ex : `gοοgle.com` avec des “o” cyrilliques)  
- 🕵️ Détection **lookalike** (distance de Levenshtein + normalisation des caractères confusables)  
- 🛑 Blocage de la **première soumission** de formulaire contenant un mot de passe sur un domaine suspect  
- ✅ **Whitelist par domaine** (sauvegardée via `chrome.storage.sync`)  
- 🖥️ **Popup** pour gérer rapidement le domaine courant  

---

## 📦 Structure du projet

url-guard/
├─ manifest.json # Manifest V3 de l’extension
├─ background.js # Service worker (stockage whitelist)
├─ content.js # Détection & affichage de la bannière
├─ popup.html # Interface popup
└─ popup.js # Logique de la popup


---

## 🚀 Installation (mode développeur)

1. **Cloner** le dépôt :
   git clone https://github.com/<ton-compte>/url-guard.git
   cd url-guard


Ouvrir Chrome et aller sur :

chrome://extensions/


Activer le Mode développeur (coin haut à droite)

Cliquer sur “Charger l’extension non empaquetée”
et sélectionner le dossier url-guard/

L’extension apparaît dans la liste et son icône est disponible dans la barre d’extensions.

✔️ Compatible avec Chrome, Brave, Edge, Opera (tous basés sur Chromium).

🧪 Tests rapides

Punycode (IDN) :
👉 http://xn--n3h.net/
 → (☃.net) → doit afficher punycode

Non-ASCII :
👉 https://bücher.de/
 → doit afficher caractères non-ASCII / punycode

Lookalike :
👉 Crée un domaine de test ou modifie ton hosts vers paypa1.com → doit afficher proche de paypal.com (distance 1)

⚙️ Personnalisation
Liste des marques surveillées

Dans content.js, modifie la constante BRANDS :

const BRANDS = [
  "google.com",
  "paypal.com",
  "facebook.com",
  "banquepopulaire.fr",
  "impots.gouv.fr"
];


Seuil de détection

LOOKALIKE_MAX_DISTANCE (par défaut 2) → plus bas = plus strict.

LOOKALIKE_CHECK_TLD = true → alerte si seul le TLD change (.com → .co).