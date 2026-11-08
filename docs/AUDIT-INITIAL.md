# Audit initial (phase 0)

Audit réalisé sur l'état du dépôt après intégration des phases 1 à 3 du cahier de l'élève, **avant** tout développement de la phase 4. Les constats ci-dessous sont vérifiés sur les fichiers et par l'exécution de la suite de tests ; ce qui n'a **pas** pu être vérifié est indiqué à la fin (§9).

## 1. Méthode

- Lecture des fichiers principaux : `index.html`, `cahier.js`, `cahier-liaison.js`, `sw.js`, `tests/run.js`, `README.md`, `MIGRATION.md`, `docs/`.
- Recherches ciblées : secrets, requêtes réseau externes, usages d'`innerHTML`, dépendances entre modules, contenu du manifeste ZIP, stratégie du service worker.
- Exécution de la suite complète (Playwright, Chromium sans interface) : **89 tests, 89 réussis** à la dernière exécution. Une instabilité a été trouvée et corrigée (voir P4).

## 2. Inventaire

| Fichier | Taille | Rôle |
|---|---|---|
| `index.html` | 239 ko | application principale (HTML, CSS, JS) ; ≈ 195 fonctions globales |
| `cahier.js` | 63 ko | éditeur du cahier de l'élève (modèle, persistance, aperçu, export / import, sauvegarde) |
| `cahier-liaison.js` | 21 ko | liaison préparations / banque → cahier, chargé à la demande |
| `sw.js` | 2 ko | service worker (réseau d'abord, cache en secours), cache `fiches-maths-v20` |
| `tests/run.js` | 224 ko | 89 tests |
| `vendor/` | — | KaTeX, docx, JSZip en local |
| `bo_*.js`, `bank_difficultes.js` | — | référentiels |
| `docs/`, `README.md`, `MIGRATION.md` | — | documentation |

## 3. Architecture et stockage

- **`cdm3db`** (IndexedDB, schéma 2) : stores `seqs`, `seances`, `kv`, `blobs`, `backups` ; écritures incrémentales, relecture de contrôle, détection de modification concurrente entre onglets (`BroadcastChannel('cdm3db')`).
- **`cdm3cahiers`** (IndexedDB, schéma de cahier v1) : stores `cahiers`, `meta`, `backups`. Les images sont des URI Base64 **dans** l'enregistrement du cahier.
- **`cdm3h`** : mémorise le dossier de sauvegarde automatique (Chrome / Edge). Ancien stockage `localStorage` (`cdm3`) conservé et migré.
- **Couplage** : `cahier.js` et `cahier-liaison.js` dépendent de ≈ 20 identifiants globaux d'`index.html` (`uid`, `esc`, `fmt`, `rmath`, `modal`, `info`, `toast`, `rq`, `tdone`, `errMsg`, `nmap`, `COMP`, `IMGOK`, `APP_V`, `dl`, `KB`, `inl`, `BK`, `BK_T`, `db`…). Un test dédié (« contrat des fonctions partagées ») échoue si l'un d'eux disparaît ou change de nature.
- **Hors ligne** : aucune requête réseau externe dans les fichiers de l'application (KaTeX, docx, JSZip sont locaux) ; les 36 fichiers du `CORE` du service worker existent tous.

## 4. Fonctionnalités par rapport au cahier des charges

| Domaine | État | Remarque |
|---|---|---|
| Séquences, séances, phases, images, exercices, compétences, modèles, banque | présent | couverts par les tests existants |
| Import JSON, import IA, export JSON, export ZIP, Word natif, PDF | présent | |
| Historique / annulation, sauvegarde dossier, copies internes | présent | |
| Mode classe (minuteur), recherche globale (Ctrl+K), calendrier, suivi / couverture des compétences, différenciation, bibliothèque de modèles | présent, **profondeur à évaluer lot par lot** | existent déjà : ne pas reconstruire (phase 4 ter) |
| Cahier — phases 1, 2, 3 | présent | 15 + 5 + 12 tests ; garanties d'indépendance, d'absence d'écrasement et de confidentialité testées |
| 4.1 Table des matières, page de garde | **absent** | |
| 4.2 Pagination, en-têtes / pieds configurables | **partiel** | impression A4, sauts de page manuels, couleurs forcées ; pas de table des matières, de numéros « page / total » configurables ni de marges réglables |
| 4.3 Export Word du cahier | **absent** | le Word natif (avec équations) existe pour les préparations : réutilisable |
| 4.4 Outils d'images du cahier | **partiel** | taille, alignement, légende, déplacement ; ni recadrage ni rotation (le recadrage existe pour les préparations) |
| 4.5 Cahiers dans les sauvegardes | **absent → traité (PR « phase 4 · lot A »)** | voir P1 |
| 4.6 Historique daté des versions | **absent** | seul l'annuler / rétablir de session existe |
| 4.7 Images en stockage binaire séparé (cahiers) | **absent** | images dans l'enregistrement (voir P6) |
| 4 bis Synchronisation préparations ⇄ cahier | **absent, prérequis présents** | `src` et l'empreinte `h` sont déjà enregistrés à l'import |
| 4 ter Générateur d'évaluations / de fiches de révision | à évaluer | bloc « fiche de révision » dans le cahier ; pas de générateur |
| 5 Publication, 6 Espace élève | **absent** | aucun code Supabase ; plan d'architecture dans `docs/CAHIER-ELEVE.md` §4 |
| 11.2 Conflits entre onglets | **partiel** | géré pour les préparations (test « deux onglets »), **pas** pour les cahiers (P3) |
| Format JSON IA pour les cahiers | absent | prévu phase 6 du document précédent |

## 5. Intégration des phases 1 à 3 du cahier

Vérifiée par 32 tests (15 + 5 + 12) : création, chapitres, six types de blocs + fiche de révision, images (ajout, collage, dépôt, proportions à l'impression), trois versions de corrigés (**absents du HTML** de la version « sans corrigés », vérifié aussi dans le PDF), association de séquences, import avec séparation des corrigés, **copies indépendantes**, **aucun écrasement**, **aucun commentaire ni analyse didactique copié** (chaînes témoins recherchées dans la fenêtre, le cahier, l'aperçu et l'export), import depuis la banque, annulation globale, chargement à la demande et hors ligne, mobile et accessibilité.

## 6. Sécurité

| Contrôle | Constat |
|---|---|
| Secrets dans le code public | **aucun** (recherche de `service_role`, `supabase`, `apikey`, `secret`, jetons `eyJ…` : néant) |
| Requêtes externes | aucune |
| Échappement des contenus | systématique via `esc` ; 59 `innerHTML=` dans `index.html`, 11 dans les modules du cahier ; injections HTML / JS testées pour : import IA, import de cahier, liaison, `cahiers.json` malveillant, données de séance |
| Images | `IMGOK` n'accepte que des URI `data:image/png|jpeg|gif|webp` : SVG, `javascript:` et URI malformées écartés (testé) |
| Limites | textes bornés (100 000 car.), 200 chapitres / 200 blocs / 100 exercices / 30 images par bloc, import de cahier ≤ 50 Mo, import IA ≤ 5 Mo et 60 séances |
| Politique de sécurité du contenu (CSP) | **absente** : à étudier ; les scripts en ligne d'`index.html` imposeraient `'unsafe-inline'`, bénéfice limité tant que le code n'est pas externalisé |
| Séparation enseignant / élève | pas encore applicable (pas de publication) ; le champ `src` et `seqIds` du cahier devront être retirés de toute projection publiée |

## 7. Problèmes détectés

| N° | Gravité | Constat | Suite |
|---|---|---|---|
| P1 | **élevée** | Les **cahiers n'étaient dans aucune sauvegarde** : ni le ZIP, ni la copie interne avant restauration, ni la sauvegarde automatique dans un dossier. Un « Remplacer tout » ou une perte de profil les aurait perdus. | **corrigé** (PR phase 4 · lot A) |
| P2 | moyenne | Le dépôt contient un dossier `.patch/` (≈ 196 ko de patches de livraison) et un `fiches-maths-github.zip` ancien (version d'octobre) : fichiers parasites, risque de confusion. | à supprimer (lot H) |
| P3 | moyenne | Deux onglets sur le **même cahier** : le dernier enregistrement l'emporte sans avertissement (les préparations, elles, sont protégées). | lot G |
| P4 | faible | Écriture du cahier **différée de 400 ms** (vidée à la fermeture et au passage en arrière-plan) : fenêtre de perte minime en cas de fermeture brutale. Un test rechargeant la page sans attendre l'écriture était instable : **corrigé** (attente explicite). | surveiller ; documenté |
| P5 | faible | Le test « calendrier » dépendait de la date du jour ; il fige désormais l'horloge (`clock.setFixedTime`). | traité |
| P6 | info | Images des cahiers en Base64 dans l'enregistrement : tout le cahier est réécrit à chaque enregistrement ; historique en mémoire allégé par clés d'images. | lot B |
| P7 | info | Aucune intégration continue (`.github/` absent). | lot H |
| P8 | info | `index.html` monolithique (239 ko) ; couplage global (§3), protégé par un test de contrat. | surveiller |
| P9 | info | Le nom du cache du service worker est incrémenté à la main à chaque livraison et figé dans un test. | à automatiser (lot H) |
| P10 | info | L'import d'activité reprend une séance en **un seul bloc** (pas de découpage en exercices) ; les tâches complexes sont reconnues par l'étiquette de la séance. | limite documentée |

## 8. Risques de régression par axe

| Axe | Risque | Parade |
|---|---|---|
| Format de sauvegarde ZIP | élevé (données) | section additive, `formatVersion` inchangé, `data.json` inchangé, tests de compatibilité dans les deux sens |
| Migration du stockage des images des cahiers (lot B) | **élevé** | sauvegarde préalable, migration réversible, validation avant application |
| Pagination / table des matières (lot C) | moyen (rendu) | pagination mesurée sur le rendu réel, tests PDF sur document long |
| Export Word du cahier (lot D) | moyen | réutilisation du convertisseur d'équations existant, tests de relecture du `.docx` |
| Conflits multi-onglets (lot G) | moyen | reprendre le mécanisme éprouvé de `cdm3db` |
| Publication Supabase (phase 5) | **élevé (sécurité)** | RLS stricte, projection côté serveur, tests de permissions côté serveur, aucun secret client |

## 9. Limites de cet audit

- Aucun test manuel dans un vrai navigateur de bureau, sur téléphone ou sur tablette : uniquement Chromium automatisé (émulation tactile comprise).
- Les 59 `innerHTML=` d'`index.html` n'ont **pas** été relus un par un ; la protection repose sur `esc` et sur les tests d'injection listés au §6.
- Les performances n'ont été mesurées que sur quelques cas (export de 20 cahiers : ≈ 0,2 s ; PDF de 30 chapitres) ; pas de mesure sur de très grandes banques.
- Aucun environnement Supabase n'existe : la phase 5 ne peut être ni testée ni validée sans projet Supabase fourni.
- Les fonctionnalités « présentes » du §4 ont été constatées par l'existence du code et des tests, pas évaluées en profondeur.
