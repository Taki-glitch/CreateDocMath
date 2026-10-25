# Fiches de séance – Mathématiques

Application web **sans serveur ni installation** pour préparer des fiches de déroulement de séance de mathématiques (BO, objectifs, pré-requis, déroulement minuté, commentaires par phase, analyse didactique, compétences…), les imprimer en PDF ou les exporter en Word, et dérouler la séance en classe avec un minuteur.

Tout fonctionne dans le navigateur : les données restent sur votre appareil.

## Fonctionnalités

**Organisation**
- Séquences et séances : liste dans le volet de gauche, création, duplication, suppression.
- Les données de séquence (nom, référence du B.O., contenus, capacités attendues) sont saisies une seule fois et partagées par toutes les séances de la séquence.
- Enregistrement automatique dans **IndexedDB** (plus de limite de 5 Mo), avec état visible en bas du volet de gauche ; sauvegarde complète en **.zip** (images binaires, sommes de contrôle) et import avec aperçu, détection des doublons, fusion ou remplacement. Voir *MIGRATION.md*.

**Programme officiel (BO)**
- Recherche dans les programmes : niveau, domaine, thème, mot-clé, type (contenus, objectifs / capacités, automatismes, attendus de fin d'année).
- Un clic sur **+** ajoute la ligne dans Contenus ou Capacités attendues (sans doublon).
- Le volet est replié automatiquement quand la séquence est déjà renseignée.
- Données incluses : 6e (cycle 3), 5e / 4e / 3e (cycle 4, attendus de fin d'année compris), 1re enseignement scientifique et bilan de compétences par chapitre.
- Les fichiers de programme sont chargés à la première ouverture du volet.

**Rédaction**
- Aperçu en direct : l'aperçu est le document final (A4, Times, tableaux).
- Phases du déroulement : durée, nom, mise en œuvre, commentaire détaillé ; phases types en un clic ; réorganisation par ↑ ↓.
- Alerte si la durée totale dépasse la durée de la séance ; ratio *élèves actifs / collectif* calculé à partir du mode de chaque phase.
- Formules mathématiques (KaTeX) avec clavier de formules.
- Mise en forme légère : `**gras**`, `__souligné__`, `- puce`, `## sous-titre`.
- Compétences (Chercher, Modéliser, Représenter, Calculer, Raisonner, Communiquer) avec justification.

**Images**
- Ajout par sélecteur, **glisser-déposer** ou **collage** (Ctrl + V d'une capture d'écran).
- Taille (25 / 50 / 75 / 100 %), alignement (centrée / à droite), **légende**, **recadrage** par sélection à la souris ou au doigt.

**Comprendre ce qui s'affiche**
- Un **bandeau jaune** au-dessus de l'aperçu signale tout réglage qui change le contenu : option **« Trame seule »** cochée (l'analyse didactique est masquée, à l'écran comme au PDF) ou vue spéciale active (Fiche élève, Fiche séquence, Cahier, Cahier de textes, Progression annuelle). Un lien du bandeau rétablit la fiche normale. Le bandeau n'est jamais imprimé.
- Le **bouton de la vue active** est surligné dans le volet de gauche.

**Organisation de l'année**
- **Classes multiples** : champ *Classe* sur chaque séquence (3A, 3B…) et bouton **🏫 Copier pour une autre classe** : la séquence et toutes ses séances sont copiées avec un **décalage de dates** au choix (0, +2 jours, −1…).
- **📓 Cahier de textes** : tableau *Date · Séance · Travail personnel*, trié par date, pour la séquence en cours ou pour toutes les séquences (option « séances datées seulement »). Le lien **« copier le tableau »** le place dans le presse-papiers (collage dans l'ENT ou un tableur).
- **📅 Progression annuelle** : toutes les séquences avec classe, dates de début et de fin, nombre de séances, **heures prévues** (somme des durées des séances), avancement (faites / prêtes) et total d'heures par classe.
- **Modèles de séances** : menu « + Séance depuis un modèle… » (rituel / questions flash, évaluation, devoir maison, problème ouvert) et **★ Enregistrer comme modèle** pour créer les vôtres.

**Sauvegarde et historique**
- **📁 Dossier de sauvegarde** (Chrome et Edge) : choisissez un dossier (par exemple synchronisé avec votre cloud) ; l'application y écrit automatiquement `fiches_maths_auto.zip` (toujours le plus récent) et `fiches_maths_AAAA-MM-JJ.zip` (une copie par jour), au même format que l'export (version 2.0 : les anciens `.json` du dossier restent lisibles via « Importer »). Après une fermeture du navigateur, cliquez sur **« réactiver »** pour renouveler l'autorisation. Cette fonction compte comme un export pour le rappel de sauvegarde.
- **↶ ↷ Annuler / Rétablir** (Ctrl + Z / Ctrl + Y) sur toutes les modifications des séquences et des séances (60 étapes, y compris suppressions, déplacements et images). L'historique est vidé quand la page est rechargée.

**Impression pour les élèves**
- **🎒 Fiche élève** : imprime (ou exporte en Word) uniquement l'**activité** et/ou la **trace écrite**, sans l'analyse didactique ni les en-têtes de préparation. Options dans le volet de gauche : activité, trace écrite, ligne Nom / Prénom / Date, et **masquer les corrections**.
- Option **Texte agrandi (fiche adaptée)** : police Verdana 13,5 pt et interligne augmenté.
- Option **2 par feuille (A5 · A4 paysage)** : la fiche est dupliquée côte à côte avec une ligne de découpe, pour économiser le papier. Le papier est automatiquement réglé en paysage dans la boîte d'impression ; si votre navigateur ne le fait pas, choisissez « Paysage » à la main.
- Le masquage supprime les lignes qui commencent par « → Correction » (ou « Correction : »), jusqu'à la question suivante (ligne commençant par « 2. », « 3) », un sous-titre `##` ou du gras). Vérifiez l'aperçu avant de distribuer.

**Étiquettes et partage**
- **Étiquettes** (champ « Étiquettes » de la séance, séparées par des virgules : Informatique, Rituel, DS, Co-intervention…) : petites pastilles colorées dans le volet de gauche, boutons de suggestion des étiquettes déjà utilisées, et prises en compte par le filtre de recherche.
- **📤 Cette séance** exporte une seule séance. À l'import, l'application propose de l'**ajouter à la séquence en cours** ou, sinon, de la fusionner comme une nouvelle séquence.
- Le clavier de formules propose aussi : **système d'équations**, **vecteur**, **angle**, **degré** et **intervalle**. Dans l'export Word, un angle `\widehat{ABC}` devient « ∠ABC » et `30^\circ` devient « 30° ».

**Confort et sécurité du stockage**
- **Ctrl + S** : enregistre immédiatement (message de confirmation) ; **Ctrl + Maj + S** : exporte toutes les fiches. Le bouton **?** liste les raccourcis.
- **Jauge de stockage** en bas du volet de gauche (espace utilisé et quota estimé par le navigateur) et lien **« réduire les images »** (700 px, qualité moyenne) quand les images pèsent plus de 10 Mo.
- **Mode sombre** (bouton 🌙) pour le formulaire ; l'aperçu reste blanc comme la feuille imprimée. Le choix est mémorisé.

**Sécurité et finitions**
- **Annuler une suppression** : après la suppression d'une séance, d'une séquence ou le remplacement de toutes les fiches par un import, un lien « ↩ Annuler la suppression » apparaît dans le volet de gauche. La séance revient à sa place d'origine. Il reste disponible jusqu'à la fermeture de la page.
- **Numérotation automatique** : supprimer une séance renumérote les suivantes (S1, S2, S3…) ; un nouveau numéro n'est jamais en doublon. Le bouton **1…N** renumérote une séquence dans l'ordre actuel.
- **Sauts de page à l'impression** : trois cases (« avant le focus sur l'activité », « avant la trace écrite », « avant l'analyse didactique ») ; un trait pointillé les matérialise dans l'aperçu.
- **Numéros de page** (« Page 1 / 3 ») en bas à droite du PDF. *Chrome et Edge récents ; ignorés sans effet ailleurs.*
- Dans le contrôle de la fiche, le lien **« ajuster »** aligne la durée de la séance sur la somme des phases.
- La **fiche séquence** indique la durée totale du chapitre, le temps moyen d'élève actif et, pour chaque séance, la part d'élèves actifs.

**Navigation dans les fiches**
- **Filtre** par mot-clé (sans tenir compte des accents) et par niveau en haut du volet de gauche : utile quand les séquences s'accumulent.
- **État de préparation** de chaque séance (○ à préparer, ◐ prête, ● faite en classe) et compteur « prêtes ou faites / total » à côté de chaque séquence.
- Pendant le glisser-déposer, une **ligne d'insertion** indique exactement où la séance va se placer.
- Le message « dernier export il y a N jours » contient un lien **« exporter maintenant »**.
- L'**aperçu est affiché à l'échelle réelle d'une page A4** (réduite pour tenir dans le panneau) : les retours à la ligne correspondent à ceux de l'impression. Masquez le formulaire (👁) pour l'agrandir. *Nécessite un navigateur récent (Chrome, Edge, Safari, Firefox 126+).*

**Gérer ses séquences**
- **Réordonner les séances** par glisser-déposer dans le volet de gauche (ou avec les boutons ↑ ↓) : les numéros S1, S2, S3… sont mis à jour automatiquement.
- **Dupliquer une séquence** avec toutes ses séances (réutilisation d'une année sur l'autre).
- **📤 Cette séquence** exporte une seule séquence dans un fichier JSON à partager avec un collègue ; **📂 Importer** propose de *fusionner* avec vos fiches (rien n'est supprimé) ou, en option, de tout remplacer.
- Un **rappel de sauvegarde** s'affiche dans le volet de gauche si vous n'avez pas exporté vos fiches depuis 7 jours.
- Le **nom de fichier du PDF** est proposé automatiquement (« Séquence - S1 Titre », « Fiche séquence », « Cahier de séquence »), y compris avec Ctrl + P.

**Ergonomie et aide à la rédaction**
- Volet de gauche et formulaire **masquables** (boutons ☰ et 👁 en bas à gauche) pour agrandir l'aperçu sur un petit écran ; le choix est mémorisé.
- Boutons de mise en forme **G**, **S**, puce et titre (et raccourcis Ctrl + B / Ctrl + U) qui s'appliquent au texte sélectionné.
- **Banque d'obstacles classiques** (avec recherche par mot-clé, sans tenir compte des accents) (≈ 40 difficultés par thème : nombres, calcul littéral, proportionnalité, géométrie, statistiques et probabilités, fonctions, algorithmique, transversal) ajoutées d'un clic dans « Difficultés rencontrées ».
- **⚙ Remplir depuis les phases** : préremplit le tableau de synthèse de la séquence (introduction, cours, entraînement) à partir des noms des phases ; les champs déjà remplis ne sont jamais écrasés.
- **Contrôle de la fiche** (volet de gauche) : signale objectifs manquants, durée des phases différente de la durée de séance, compétences non cochées, B.O. absent, pré-requis ou difficultés non renseignés.

**Séquences (fiche séquence et cahier complet)**
- Cliquer sur le **nom d'une séquence** dans le volet de gauche (ou sur « 📋 Fiche séquence ») affiche la fiche « Organisation pédagogique de la séquence » : nombre de séances d'apprentissage et d'évaluation (calculé selon le *type* de chaque séance), cadre général et progression, **tableau de synthèse** (séance, objectif principal, introduction, moment de cours, entraînement & tâche), **déroulé détaillé** de chaque séance (généré à partir de ses phases), matrice des compétences et recommandations facultatives.
- **📑 Cahier complet** : fiche séquence suivie des fiches de toutes les séances, prêt pour l'impression, le PDF ou l'export Word.
- Champs à renseigner : dans la séquence, *cadre général* et *recommandations* ; dans chaque séance, *type* (apprentissage / évaluation), le bloc *Fiche séquence : synthèse de cette séance* (introduction, moment de cours, entraînement, remarque pédagogique).

**Mise en page de la fiche** (inspirée d'un document type)
- En-tête « Fiche de Déroulement de Séance », séquence et niveau, bandeau « Cadre institutionnel & programmes officiels (B.O.) ».
- Sections numérotées : 1. Textes du B.O. · 2. Fiche de préparation synthétique · 3. Déroulement envisagé · 4. Analyse didactique (sous-parties lettrées A, B, C… automatiquement).
- Tableau de déroulement à 4 colonnes : Phase / Durée · Intitulé / Support · Description des activités · Modalités.
- Encadrés « Focus sur l'activité » et « Contenu de la trace écrite » ; chaque image se place dans l'une de ces zones ou dans l'analyse.
- En-tête et pied de page répétés sur chaque page imprimée.
- Les lignes coupées par un copier-coller (suite commençant par une minuscule) sont recollées ; pour un nouveau paragraphe, laissez une ligne vide.

**Sorties**
- Impression / PDF (mise en page A4).
- Export **Word (.docx)** généré directement (bibliothèque `docx` embarquée, **hors ligne**) : titres, tableaux avec en-têtes répétés, encadrés, listes, images (légende, alignement), en-tête et pied de page avec « Page X / Y », sauts de page entre séances. Les **formules courantes** (fractions, racines, puissances, indices, symboles grecs, ≤ ≥ ×…) deviennent de **vraies équations Word modifiables** ; les constructions non gérées (systèmes d'équations, matrices) sont insérées en texte lisible.
- Option **Trame seule** : masque l'analyse didactique (commentaires, choix didactiques, difficultés, compétences, choix du travail personnel).
- **Bilan de séquence** : tableau séances × 6 compétences, avec totaux, contenus et capacités ; imprimable ou exportable en Word.

**En classe**
- **Mode classe** : minuteur par phase en plein écran (tablette, VPI), affichage de la mise en œuvre, phase suivante, +1 min, signal sonore à l'échéance, écran maintenu allumé. Raccourcis : Espace (démarrer / pause), ← →, Échap.
- **PWA** : installable et utilisable hors connexion (voir ci-dessous).

## Nouveautés de la version 2.1 : interface, recherche, suivi

**Menu et navigation**
- Une **barre de menus** remplace la pile de boutons : *Fichier*, *Séquence*, *Séance*, *Affichage*, plus **Mode classe**, **Word**, **PDF**, la recherche (🔎), annuler / rétablir, mode sombre et aide. Les actions destructrices (supprimer) sont en rouge, séparées. Utilisable au clavier (flèches, Échap).
- Le **volet de gauche** ne garde que la navigation : filtre, séquences **repliables** (seule la séquence courante est dépliée), compétences et contrôle de la fiche repliés par défaut, état d'enregistrement.
- Les **options propres à une vue** (fiche élève, cahier de textes, suivi des compétences) s'affichent au-dessus de l'aperçu, seulement dans la vue concernée.
- **Ctrl + K** : palette de commandes **et** recherche globale (voir ci-dessous).
- **Mobile et tablette** (écran ≤ 1000 px) : une zone à la fois (Liste / Fiche / Aperçu) avec une barre en bas ; menus en pleine largeur ; zones tactiles agrandies.

**Recherche globale** (Ctrl + K) : titres, objectifs, pré-requis, phases (nom, activités, commentaire, support, modalités), activité, trace écrite, difficultés, aides, compétences, étiquettes, références du B.O. et exercices de la banque. Insensible aux majuscules et aux accents ; plusieurs mots (ils peuvent être dans des champs différents de la même séance) ; extraits avec mots surlignés ; résultats groupés (séances, séquences, exercices) ; filtres par niveau, classe, séquence et période ; ouverture directe du résultat. Les actions des menus sont aussi lançables depuis la palette.

**Couverture du B.O.** (Séquence ▸ Couverture du B.O.)
- Dans la séance : cases « Contenus du B.O. travaillés dans cette séance ». Dans la séquence : statut de chaque contenu (À traiter, En cours, Traité, Non pertinent).
- Le rapport (imprimable, exportable en Word) distingue des **avertissements** (contenu travaillé dans aucune séance, séance sans contenu associé, association vers un contenu modifié, compétence annoncée mais cochée nulle part, compétences cochées sans activité) et des **informations** (contenu dans plusieurs séances, marqué « Traité » sans séance, séances liées toutes faites). Des **suggestions** d'association (mots communs) sont proposées mais **jamais appliquées automatiquement** ; les objectifs ne sont jamais modifiés.
- Les associations sont rattachées au *texte* de la ligne du B.O. : modifier une ligne rompt son lien (signalé par un avertissement).

**Banque d'exercices** (Fichier ▸ Banque d'exercices, ou 📚 dans la barre de formules)
- Exercices, questions flash, calcul mental, problèmes, activités de découverte, consignes, exemples corrigés, traces écrites, questions diagnostiques, remédiation ; niveau, domaine, notions, compétences, énoncé, correction, difficulté, durée, mots-clés, source.
- Recherche, filtres, favoris, duplication, modification, suppression avec confirmation, import / export JSON (doublons ignorés).
- **Insertion en un clic** dans l'Activité ou la Trace écrite, **à la position du curseur** ou à la fin, sans rien écraser ; la correction est insérée sous la forme « → Correction : … » (donc masquée par l'option de la fiche élève). L'insertion crée une **copie indépendante**.
- **★ enregistrer** : enregistre dans la banque le texte sélectionné dans un champ.

**Calendrier** (Affichage ▸ Calendrier) : vues **mois**, **semaine** et **liste** (accessible, dates modifiables au clavier), filtre par classe, couleur par classe, statut visible. Déplacement par **glisser-déposer** ou, au tactile, en **sélectionnant** la séance puis en touchant le jour. En déplaçant une séance : *uniquement celle-ci*, *celle-ci et les suivantes de la séquence*, ou *celle-ci et les séances postérieures à une date choisie* ; **aperçu** avant / après, avertissement de conflit (même classe, même jour), option **éviter week-ends et jours non travaillés** (liste personnelle), bouton **Annuler le dernier déplacement**. Les dates sont manipulées en jours calendaires (aucun décalage lié au fuseau horaire ou à l'heure d'été). Les séances sans date restent sans date.

**Suivi des compétences** (Séquence ▸ Suivi des compétences) : distingue **prévue** (par séquence), **travaillée** (cochée dans la séance), **évaluée** (nouvelle case dans la séance) et **bilan de la classe** saisi par l'enseignant avec un critère de maîtrise et un historique. Bilan sur une période et/ou une classe, alertes (« prévue mais non travaillée », « peu travaillée »), export CSV, impression / Word. La maîtrise n'est jamais déduite automatiquement et **aucune donnée individuelle d'élève** n'est enregistrée.

**Mode classe** : trois affichages (**Phase**, **Activité**, **Trace écrite**) avec images et formules ; corrections masquées par défaut ; taille du texte réglable (A− / A+, touches + et −) ; **plein écran** (F) ; **contraste élevé** ; mode **sans distraction** ; minuteur calculé sur l'horloge (pas de dérive si l'onglet est suspendu) avec temps prévu / écoulé, +1 min, réinitialisation, dépassement signalé ; raccourcis Espace, ← →, P / A / T, Échap. Les commentaires de l'enseignant ne sont jamais affichés et le mode classe ne modifie aucune donnée.

## Nouveautés de la version 2.0 : stockage et exports

- **IndexedDB** (voir *Sauvegarde et données* et *MIGRATION.md*), sauvegarde **.zip** vérifiée, import avec aperçu.
- **Export Word natif** (bibliothèque `docx` embarquée) : titres, tableaux, encadrés, images, en-tête / pied de page « Page X / Y » ; formules courantes en **équations Word modifiables**, repli en texte lisible pour les constructions non gérées.
- **PDF** : en-tête du tableau de déroulement répété sur chaque page ; phases très longues autorisées à se couper.
- Analyse didactique : champs **Aides et différenciation prévues** et **Évaluation et bilan de la séance** (absents de la fiche élève). Fiche élève : option **Lignes de réponse**.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Application complète (HTML, CSS, JavaScript) |
| `bo_cycle3.js` | Programme de 6e |
| `bo_cycle4.js` | Programme de 5e, 4e, 3e |
| `bank_difficultes.js` | Banque d'obstacles classiques (modifiable) |
| `bo_premiere.js` | 1re enseignement scientifique + bilan de compétences par chapitre |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | PWA (installation, hors-ligne) |
| `vendor/` | KaTeX 0.16.45, JSZip 3.10.1 et docx 9.6.1 (tous MIT) embarqués, avec leurs licences |
| `tests/` | Tests Playwright (`node tests/run.js`) |
| `MIGRATION.md` | Migration depuis l'ancien stockage, sauvegarde / restauration, publication |

Tous les fichiers doivent rester **dans le même dossier**.

## Installation

**En local** : ouvrir `index.html` dans le navigateur. Tout fonctionne, sauf l'installation PWA et le mode hors-ligne, qui exigent `https` ou `localhost`.

**Sur GitHub Pages** (recommandé) : déposer les fichiers à la racine du dépôt, puis *Settings → Pages → Deploy from a branch → main / root*. L'application est alors accessible depuis n'importe quel appareil et installable (menu du navigateur : « Installer l'application »).

## Utilisation rapide

1. Créer une **séquence** (+ Séquence), la nommer, puis renseigner le B.O. avec le volet « Chercher dans le programme ».
2. Créer une **séance** (+ Séance), renseigner objectifs, pré-requis et phases du déroulement.
3. Compléter l'analyse didactique ; cocher les compétences.
4. **Imprimer / PDF** ou **Exporter Word**. Activer « Trame seule » pour une version sans analyse.
5. En classe : **⏱ Mode classe**.

## Hors connexion (PWA)

- Les fichiers de l'application sont toujours rechargés depuis le réseau quand il est disponible, avec le cache en secours.
- **KaTeX (formules) et JSZip (sauvegardes) sont embarqués** dans `vendor/` et mis en cache à l'installation : formules et sauvegardes fonctionnent hors ligne dès la première installation.
- **L'export Word (bibliothèque `docx`) est aussi embarqué** dans `vendor/` : plus aucune dépendance à un CDN, tout fonctionne hors ligne après installation.
- Si vous ajoutez un fichier BO, ajoutez-le aussi à la liste `CORE` de `sw.js` pour le rendre disponible hors ligne.

## Ajouter un programme (niveau, discipline…)

Chaque fichier `bo_*.js` ajoute des lignes à la base commune :

```js
(self.BO_DATA=self.BO_DATA||[]).push(
["2de", "Fonctions", "Généralités sur les fonctions", "o", "Déterminer graphiquement les extremums d’une fonction sur un intervalle."],
["2de", "Fonctions", "Généralités sur les fonctions", "c", "Maximum, minimum d’une fonction sur un intervalle."]
);
```

Format d'une ligne : `[niveau, domaine, thème, type, texte]`, avec le type `c` (contenu), `o` (objectif / capacité), `a` (automatisme) ou `e` (attendu de fin d'année).

Puis ajouter le nom du fichier dans la liste `BO_FILES` de `index.html` (et dans `CORE` de `sw.js`). Le niveau apparaît automatiquement dans le sélecteur.

## Ajouter vos propres obstacles

Dans `bank_difficultes.js`, ajoutez des lignes `["Thème", "Titre", "Description"]` ; le thème apparaît automatiquement dans le menu. Ajoutez aussi le fichier à la liste `CORE` de `sw.js` s'il est nouveau.

## Sauvegarde et données

- Les données sont stockées dans **IndexedDB** du navigateur (base `cdm3db`) : elles sont propres à un navigateur et à un appareil, et peuvent être effacées si l'on vide les données du site. L'application demande au navigateur un stockage *persistant* ; le bouton **🛟 Stockage et sauvegardes** indique si c'est accordé.
- Les données ne sont **pas chiffrées**.
- Les premières ouvertures de cette version migrent automatiquement l'ancien stockage (`localStorage`, clé `cdm3`), sans le supprimer : voir **MIGRATION.md**.
- **Exportez régulièrement** (💾 Exporter tout → fichier `.zip`). L'export est relu et vérifié avant d'être proposé.
- Les images sont réduites (900 px) ; elles sont stockées en binaire.

## Limites connues

- Les formules écrites en fractions dans les PDF officiels sont mal extraites pour deux lignes de 5e (« fractions simples comme… », « fractions égales ») : à corriger à la main après insertion.
- Les « Automatismes » du programme de 6e ne sont pas inclus.
- La banque d'exercices ne gère pas encore les images (texte et formules uniquement).
- Pas de tableau de bord annuel complet (la *Progression annuelle* existante est conservée) ni de suivi individuel d'élèves (volontaire).
- Le calendrier ne connaît pas les jours fériés officiels : saisissez vos jours non travaillés.
- Export Word : les équations non reconnues (systèmes `cases`, matrices, commandes LaTeX rares) sont converties en texte lisible, pas en équation modifiable. LibreOffice sans module Math n'affiche pas les équations Word : ouvrir avec Microsoft Word.
- L'export Word reprend la structure et la mise en page principales, mais pas pixel pour pixel l'aperçu (polices de substitution possibles, mode « 2 par feuille » exporté en une seule fiche).
- Le rendu Word n'a été vérifié ici que par analyse du fichier (XML, python-docx, conversion LibreOffice) : ouvrez un export dans Word pour valider sur vos documents.

## Sources

Programmes officiels de mathématiques du cycle 3 (6e), du cycle 4 (annexe 2 et attendus de fin d'année de 5e, 4e et 3e) et programme de mathématiques intégré à l'enseignement scientifique de 1re générale. Le « bilan de compétences par chapitre » est un document personnel de l'auteur.
