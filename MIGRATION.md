# Migration, sauvegarde et publication (version 2.1)

## 1. Ce qui change
- Les fiches sont désormais enregistrées dans **IndexedDB** (base `cdm3db`, schéma de données **v2**), plus dans `localStorage`.
- Chaque séquence et chaque séance est un enregistrement séparé ; seuls les enregistrements modifiés sont réécrits. Les images sont stockées en **binaire** (plus de Base64).
- `db.v` / `kv.schema` = version du **schéma des données** (2). Elle est indépendante de la version de l'application (`APP_V`) et de la version du cache du service worker.
- Si les données ont un schéma **plus récent** que l'application, l'ouverture est refusée sans rien modifier.

## 2. Première ouverture après mise à jour (migration automatique)
1. Lecture de l'ancienne clé `cdm3`, validation de la structure (JSON valide, identifiants uniques…).
2. **Copie de sécurité interne** (« avant migration ») dans IndexedDB, en plus de la clé `cdm3` laissée intacte.
3. Écriture dans IndexedDB en **une seule transaction**.
4. **Relecture et comparaison complète** (nombres, ordre, contenu, images octet par octet).
5. Seulement alors, la migration est marquée « terminée ».
- Idempotente : une fois terminée, `cdm3` n'est plus relue ; aucune donnée récente n'est écrasée.
- En cas d'échec, un message explique le problème et propose : *Réessayer*, *Télécharger mes anciennes données*, *Continuer avec l'ancien stockage* (si les données sont valides) ou *Démarrer avec des fiches vides* (si elles sont illisibles ; une copie est conservée). **Rien n'est supprimé.**
- Si une ancienne version de l'application (autre onglet, cache) modifie encore `cdm3` après la migration, un bandeau propose de **les examiner et les importer**.

### Précautions avant la première mise à jour
1. **Avant** de publier, ouvrez l'ancienne version et faites 💾 *Exporter tout* (fichier `.json`). Conservez-le.
2. Publiez, puis ouvrez l'application **en ligne** une première fois (migration + mise en cache).
3. Vérifiez : 🛟 *Stockage et sauvegardes* → *Vérifier l'intégrité*, puis faites un export `.zip`.
4. Ne supprimez **pas** l'ancien stockage tout de suite.

### Supprimer l'ancien stockage (facultatif, plus tard)
🛟 *Stockage et sauvegardes* → *Supprimer l'ancien stockage…*. Refusé tant que : la migration n'est pas terminée, l'intégrité n'est pas vérifiée, la copie « avant migration » est absente, ou aucun export n'a été fait depuis la migration. Il faut ensuite taper `SUPPRIMER`. La copie interne « avant migration » est conservée.

## 3. Sauvegarde et restauration
- **Format** : archive `.zip` = `manifest.json` (format, version, effectifs, SHA-256) + `data.json` (séquences, séances, paramètres, sans images) + `img/<sha256>.<ext>` (images binaires dédupliquées).
- **Export** : l'archive est relue et comparée avant d'être proposée au téléchargement.
- **Import** (`.zip`, ou anciens `.json`) : aperçu (séquences, séances, état), rapport d'intégrité, puis :
  - **Fusionner** : séquences nouvelles ajoutées (mêmes identifiants), séquences identiques ignorées (donc réimporter deux fois ne crée aucun doublon), séquences existantes mais différentes ajoutées en copie « (importée) » ;
  - **Remplacer tout** : confirmation, **copie de sécurité interne** (3 dernières conservées), puis remplacement ; le lien « Annuler la suppression » reste disponible jusqu'à la fermeture de la page.
- Une image altérée permet un import partiel ; un `data.json` altéré, un ZIP illisible, un format plus récent ou une structure invalide sont **refusés**.
- Après chaque import, les données stockées sont relues et comparées (rapport affiché).
- Les copies internes sont listées dans 🛟 *Copies internes…* (téléchargement, restauration).
- Les fichiers importés sont traités comme non fiables : types d'image limités (jpeg/png/webp/gif), noms de fichiers contrôlés, aucun code exécuté.

## 4. Fiabilité
- Indicateur d'état (⏳ en cours, ✓ enregistré, ⚠ échec + « réessayer »). Une donnée n'est annoncée enregistrée qu'après la fin de la transaction.
- Plusieurs onglets : un onglet sans modification se resynchronise ; sinon le conflit est détecté (compteur de révision), l'écriture est bloquée et un bandeau propose de télécharger une sauvegarde ou de recharger.
- Fermeture : écriture forcée au passage en arrière-plan / `pagehide` ; avertissement si des modifications ne sont pas enregistrées ; message au redémarrage si la session précédente a pu être interrompue.
- IndexedDB indisponible : repli sur l'ancien stockage seulement si la migration n'a jamais eu lieu (sinon message d'erreur, pour éviter de réécrire des données périmées).

## 5. Tests
```
npm install
npx playwright install chromium
node tests/run.js            # tous les tests
node tests/run.js migration  # tests dont le nom contient « migration »
```
(Si `jszip` n'est pas installé, les tests utilisent `vendor/jszip.min.js`.) Les tests utilisent des contextes de navigateur vierges, jamais vos données.

## 6. Publier sur GitHub Pages
1. Remplacer **tous** les fichiers du dépôt par ceux de l'archive (dossiers `vendor/` et `tests/` compris).
2. *Settings → Pages → Deploy from a branch → main / root*.
3. Ouvrir l'application en ligne et la recharger une fois (installation du service worker, mise en cache de `vendor/`).
4. À chaque livraison, incrémenter le nom de cache `V` dans `sw.js`.

## 7. Limites connues de cette étape
- Safari iPad et iOS : non testés ici (seul Chromium l'a été). Le stockage binaire utilise des `ArrayBuffer` (plus fiable que les Blob sur Safari), mais l'éviction du stockage par iOS après plusieurs semaines d'inactivité reste possible : faites des exports.
- Le dossier de sauvegarde automatique reste limité à Chrome / Edge.
- L'export Word utilise désormais la bibliothèque `docx` embarquée (plus de CDN).
- L'historique « Annuler / Rétablir » (Ctrl+Z) n'est pas conservé après rechargement (inchangé).

## 8. Nouveaux champs de données (version 2.1)
Tous optionnels, avec valeur par défaut : séquence `cov`, `compPrev`, `compBilan`, `compLog` ; séance `couv`, `compEval`, `aides`, `evalBilan` ; base `bank` (banque d'exercices), `cal` (jours non travaillés), `cp` (filtres du suivi). Ils sont enregistrés dans IndexedDB et inclus dans les sauvegardes `.zip` ; les anciennes fiches s'ouvrent sans modification.
