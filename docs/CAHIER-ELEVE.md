# 📚 Cahier de l'élève — architecture et phase 1

## 1. Architecture existante (analyse)

- **Application** : `index.html` (HTML, CSS, JS inline) + fichiers `bo_*.js`, `bank_difficultes.js`, `vendor/` (KaTeX, docx, JSZip), PWA (`sw.js`, cache réseau d'abord).
- **Données** : objet `db = {seqs, seances, …}` en mémoire ; IndexedDB `cdm3db` avec écriture **incrémentale** (stores `seqs`, `seances`, `kv`, `blobs`, `backups`), vérification après écriture (`stVerify`), historique global (`snap`/`hgo`), sauvegardes ZIP (`buildZip` / `readZip`), import JSON (`validateDb` → `normalizeDb` → `importFlow`) et import IA (`aiConvert`).
- **Interface** : barre de menus, panneaux, `modal()`, `info()`, `toast()`, mise en forme légère `fmt()` (`**gras**`, `- puce`, `## titre`) et rendu KaTeX `rmath()`.
- **Réutilisé par le module** : `uid`, `esc`, `fmt`, `rmath`, `modal`, `info`, `toast`, `rq`/`tdone` (IndexedDB), `errMsg`, `COMP`, `IMGOK`, `dl`.
- **Risques de régression identifiés** et traités : raccourcis globaux (Ctrl+Z / Y / S / K) et collage d'image, qui agissaient sur la préparation ouverte ; focus et lecteurs d'écran (contenu de fond rendu `inert`) ; z-index du toast ; impression (seul le cahier est imprimé quand il est ouvert).

## 2. Décision de stockage

Les cahiers sont dans une **base IndexedDB séparée `cdm3cahiers`** (stores `cahiers`, `meta`, `backups`). La base `cdm3db`, `db`, `buildZip` et l'import existant ne sont **pas modifiés** : zéro migration du stockage existant, aucune possibilité de mélanger chapitres et séances. Un test vérifie que `cdm3db` est strictement inchangée.

## 3. Modèle de données (schéma v1)

```
Cahier  { id, v:1, nom, niveau, classe, annee, couleurs:{attendus,decouverte,trace,exercices,tache,eval},
          chapitres:[Chapitre], creeLe, modifLe, pub:{statut:'brouillon'|'publie'|'depublie', version} }
Chapitre{ id, nom, ref, seqIds:[id de séquences liées (phase 3)], blocs:[Bloc] }
Bloc    { id, type:'attendus'|'decouverte'|'trace'|'exercices'|'tache'|'eval', titre, couleur ('' = défaut),
          v:{ champs propres au type }, corr:{texte, defaut:'masque'|'affiche', en_ligne, pdf, word},
          comp:[compétences], items:[Exercice], imgs:[{u,w,a,l}], saut }
Exercice{ id, num, titre, niveau:''|'facile'|'moyen'|'difficile', enonce, corrige }
```
Les champs `seqIds`, `corr.*`, `imgs`, `pub` sont déjà dans le schéma pour les phases 2 à 5 : pas de migration à prévoir pour elles. Toute lecture passe par `normCah()` (valeurs douteuses ramenées à des valeurs sûres, limites : 200 chapitres, 200 blocs, 100 exercices, 100 000 caractères par champ, couleurs `#rrggbb` uniquement, types inconnus écartés **avec avertissement**). Migration : un enregistrement dont `v` diffère est copié dans le store `backups` (`id@vN`) **avant** mise à niveau ; un enregistrement illisible est conservé tel quel en base.

Export / import : fichier `.json` au format `createdocmath-cahier-backup` v1 (`cahiers[]`), import toujours **additif** avec identifiants neufs. Le format futur `createdocmath-student-notebook` (phase 6) réutilisera `normCah()`.

## 4. Architecture envisagée pour la publication (phase 5)

IndexedDB n'est pas partagé : il faut un backend. Proposition **Supabase** (Postgres + RLS + Edge Functions), le site restant statique.

| Table | Contenu | Accès |
|---|---|---|
| `notebooks` | brouillons : `id uuid`, `owner uuid` (auth.uid), `data jsonb`, `updated_at` | **propriétaire uniquement** (RLS `owner = auth.uid()`) |
| `publications` | `id uuid`, `notebook_id`, `owner`, `slug` (aléatoire ≥ 128 bits), `status` (`published`/`unpublished`), `access` (`link`/`code`), `code_hash`, `current_version` | propriétaire ; **aucun accès anonyme direct** |
| `publication_versions` | `publication_id`, `version int`, `snapshot jsonb` (**projection élève**), `with_answers jsonb` (corrigés publiés, séparés), `created_at` | propriétaire ; anonyme **via RPC uniquement** |

- **Projection de publication** générée côté enseignant puis recalculée côté serveur : uniquement titres, attendus, activités, traces écrites, énoncés, images. Ne passent **jamais** : séquences, séances, commentaires, analyses, difficultés, aides, `seqIds`, corrigés non publiés. Les corrigés vivent dans une colonne distincte, renvoyée seulement si `corr.en_ligne` est vrai pour ce bloc : un masquage CSS ne suffit pas, les données ne sont pas envoyées.
- **Lecture élève** : fonction Postgres `get_publication(slug, code)` (`security definer`, `anon` n'a `select` sur aucune table) qui vérifie `status = 'published'`, le code éventuel (comparaison de hachage, limitation de débit) et renvoie la version courante. Dépublier = `status = 'unpublished'` : la fonction ne renvoie plus rien, **y compris pour les anciennes URL** ; réponses en `Cache-Control: no-store`.
- **Versions** : « Mettre à jour » crée une version et déplace `current_version` ; modifier le brouillon ne change jamais la publication. Retour arrière = repointer vers une version antérieure.
- **Secrets** : seule la clé publique `anon` est dans le JavaScript ; clé de service jamais côté client ; Edge Function pour la génération de projection et le contrôle du code.
- **Espace élève** : page statique distincte (`/eleve/#slug`, lecture seule, sans le code de l'éditeur), responsive.
- **Tests de sécurité prévus (côté serveur, non via l'interface)** : `anon` ne peut `select` aucune table ; une version non publiée n'est pas lisible ; un autre enseignant ne peut ni lire ni écrire ; `get_publication` ne renvoie aucun corrigé non publié ; dépublication effective sur ancienne URL.

## 5. Phase 1 — découpage réalisé

1. Module `cahier.js` (fichier séparé, chargé en `defer`, ajouté au cache hors ligne) ; entrée **Affichage ▸ 📚 Cahier de l'élève…**.
2. Espace plein écran en trois volets (chapitres · édition · aperçu en direct), onglets sur téléphone.
3. Cahiers : créer, renommer, dupliquer, supprimer (confirmation + annulation de session), plusieurs cahiers, réglages (niveau, classe, année, couleurs par catégorie).
4. Chapitres : créer, renommer, dupliquer, supprimer (confirmation), réordonner (↑ ↓ ou glisser-déposer).
5. Les six types de blocs, avec champs, couleur propre, saut de page, exercices multiples, compétences, corrigé ; aperçu A4 avec formules KaTeX, corrigés affichables ou non.
6. Enregistrement automatique dans `cdm3cahiers` avec relecture de contrôle, erreurs signalées avec « réessayer », ↶ ↷ propres au cahier, export / import `.json`, impression / PDF de l'aperçu.

## 6. Phase 2 — éditeur pédagogique

**Mise en forme** (barre d'outils au-dessus de l'éditeur, agit sur le champ texte actif ; Ctrl + B / Ctrl + U) :

| Syntaxe dans un champ | Rendu |
|---|---|
| `**gras**`, `__souligné__`, `- puce`, `## sous-titre` | mise en forme légère de l'application |
| `@def …` `@prop …` `@thm …` `@ex …` `@meth …` `@rem …` `@att …` | encadré coloré (Définition, Propriété, Théorème, Exemple, Méthode, Remarque, Attention), jusqu'à la ligne vide |
| `\| a \| b \|` puis `\|---\|---\|` | tableau (première ligne = en-tête si la ligne de séparation suit) |
| `1. …`, `a) …` | question numérotée, numéro en couleur ; une ligne de suite commençant par une minuscule est recollée |
| `$…$`, `$$…$$` | formules KaTeX ; le clavier de formules de l'application est repris |

Tout est échappé avant mise en forme : aucun HTML saisi n'est interprété.

**Images** : ajout par bouton, **glisser-déposer** ou **collage** (Ctrl + V) dans un bloc ou dans un exercice. Réduction à 900 px (JPEG), taille 25 / 50 / 75 / 100 %, alignement centré ou à droite, légende, déplacement, suppression. Largeur en % et hauteur automatique : **jamais déformées**, y compris à l'impression. Formats PNG, JPEG, GIF, WebP (SVG refusé). Le collage hors d'un bloc n'ajoute rien, et jamais rien aux séances.

**Corrigés** : réglages par bloc (affichage par défaut, accessible en ligne, inclus dans le PDF, inclus dans le Word), et trois versions de l'aperçu / impression :
1. *Enseignant* : tous les corrigés ;
2. *Élève avec corrigés* : selon les réglages de chaque bloc (« Voir le corrigé » déroulant à l'écran ; à l'impression, seulement les blocs cochés « PDF ») ;
3. *Élève sans corrigés* : les corrigés **ne sont pas présents dans le HTML** (pas un simple masquage).

**Nouveaux contenus** : type de bloc *Fiche de révision* (points clés, méthodes, exercices conseillés), champ *Questions intermédiaires* dans la tâche complexe, compétences et barème dans l'évaluation, images dans les exercices.

**Modèle de données** : le schéma reste **v1** (changements uniquement additifs, normalisés à la lecture : `couleurs.revision`, `imgs[].id`, `items[].imgs`, `v.questions`). Les cahiers de la phase 1 se chargent sans migration ni copie de sécurité (testé). L'historique ↶ ↷ référence les images par clé pour ne pas dupliquer leur poids en mémoire.

## 7. Limites (à traiter dans les phases suivantes)

- **Les sauvegardes ZIP ne contiennent pas encore les cahiers** : utiliser **Exporter** (`.json`, images comprises) dans le cahier. Intégration au ZIP prévue en phase 4.
- Pas de recadrage d'image dans le cahier, ni de table des matières, de pagination automatique, d'en-tête / pied de page configurables ni d'export Word (phase 4) ; pas de liaison avec les séquences ni de banque d'exercices (phase 3) ; pas de publication (phase 5).
- Les réglages « Word » des corrigés sont enregistrés mais ne seront utilisés qu'avec l'export Word (phase 4).
- Édition simultanée dans deux onglets : le dernier enregistrement l'emporte.
- Chaque enregistrement réécrit le cahier modifié en entier, images comprises : à optimiser (stockage binaire séparé) si des cahiers très illustrés posent problème.
- Le glisser-déposer sur de longues distances dépend de l'auto-défilement du navigateur : utiliser ↑ ↓.
