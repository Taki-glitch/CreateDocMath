# Tests et intégration continue

## Lancer les tests

```
npm install
npx playwright install chromium     # une seule fois
node tests/run.js                   # suite complète
node tests/run.js "cahier phase 3"  # seulement les tests dont le titre contient ce texte
```

Les tests démarrent un petit serveur local et pilotent Chromium (Playwright). Le texte des PDF est contrôlé avec `pdftotext` (paquet `poppler-utils`) : sans lui, ces contrôles sont ignorés avec un message.

## Intégration continue (GitHub Actions)

`.github/workflows/tests.yml` exécute à chaque pull request et à chaque envoi sur `main` : vérification de la syntaxe des scripts autonomes, puis la suite complète.

**Pour empêcher réellement une mise en production qui échoue** : GitHub ▸ Settings ▸ Branches ▸ règle de protection de `main` ▸ cocher « Require status checks to pass » et choisir `tests`. Sans cette règle, GitHub Pages publie malgré un test en échec.

Ce workflow n'a pas pu être exécuté dans l'environnement de développement : sa première exécution se fera sur GitHub (étapes d'installation de Playwright et de `poppler-utils` à surveiller).

## Numéro de build du cache hors ligne

`version.js` est la **source unique** du nom du cache (`fiches-maths-<build>`), lue par `sw.js` (`importScripts`) et par les tests. À chaque livraison : incrémenter `APP_BUILD`. Un test vérifie que tous les fichiers de l'application sont déclarés dans `CORE` (donc disponibles hors ligne).

## Hygiène du dépôt

Un test échoue si le dépôt contient un dossier `.patch/` ou une archive `.zip` à la racine (`.gitignore` les exclut désormais). Les archives de livraison se publient dans les « Releases » GitHub, pas dans le dépôt.

## Tests manuels nécessaires (non automatisables ici)

- Restauration d'une sauvegarde dans un **profil navigateur vierge** (Chrome et Firefox).
- Sauvegarde automatique dans un **vrai dossier** (Chrome / Edge) : le sélecteur de dossier ne peut pas être piloté en test.
- Impression et PDF sur **vrai appareil** (téléphone, tablette), rendu réel des polices.
- Installation de l'application (PWA) et usage hors ligne sur appareil réel.
- Lecteurs d'écran (NVDA, VoiceOver) : seuls les noms accessibles et le focus sont testés automatiquement.
