# ALTA 2026 — Inscription au concours

Site d'inscription au **concours de création de contenu caritatif ALTA 2026** (17–21 novembre 2026, NSNN Sidi Abdellah), organisé par **ALTA Charity Club**.

- **Site** : https://malekdjr.github.io/alta2026-inscription/
- **Données** : chaque inscription est ajoutée comme une ligne dans la Google Sheet « ALTA 2026 — Inscriptions concours » (compte malekkdjr@gmail.com), onglet *Inscriptions*.
- **Backend** : Google Apps Script (Code.gs), déployé en application Web liée à la Sheet.

## Contenu du formulaire
- Équipe : nom, cause choisie (question 1), idée / motivation (question 2)
- 3 membres : nom, email, téléphone, établissement, rôle (le membre 1 est le chef d'équipe)
- Vérifications : emails et téléphones valides, emails uniques, nom d'équipe unique, anti-spam

## Modifier le backend
1. Ouvrir la Sheet → Extensions → Apps Script
2. Modifier Code.gs, puis **Déployer → Gérer les déploiements → ✏️ → Nouvelle version** (l'URL reste la même).
