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

