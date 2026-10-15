# Fiches de séance – Mathématiques

Application web **sans serveur ni installation** pour préparer des fiches de déroulement de séance de mathématiques (BO, objectifs, pré-requis, déroulement minuté, commentaires par phase, analyse didactique, compétences…), les imprimer en PDF ou les exporter en Word, et dérouler la séance en classe avec un minuteur.

Tout fonctionne dans le navigateur : les données restent sur votre appareil.

## Fonctionnalités

**Organisation**
- Séquences et séances : liste dans le volet de gauche, création, duplication, suppression.
- Les données de séquence (nom, référence du B.O., contenus, capacités attendues) sont saisies une seule fois et partagées par toutes les séances de la séquence.
- Sauvegarde automatique dans le navigateur ; export / import de toute la bibliothèque en JSON.

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
- Export **Word (.docx)** (formules exportées en texte `$…$`).
- Option **Trame seule** : masque l'analyse didactique (commentaires, choix didactiques, difficultés, compétences, choix du travail personnel).
- **Bilan de séquence** : tableau séances × 6 compétences, avec totaux, contenus et capacités ; imprimable ou exportable en Word.

**En classe**
- **Mode classe** : minuteur par phase en plein écran (tablette, VPI), affichage de la mise en œuvre, phase suivante, +1 min, signal sonore à l'échéance, écran maintenu allumé. Raccourcis : Espace (démarrer / pause), ← →, Échap.
- **PWA** : installable et utilisable hors connexion (voir ci-dessous).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Application complète (HTML, CSS, JavaScript) |
| `bo_cycle3.js` | Programme de 6e |
| `bo_cycle4.js` | Programme de 5e, 4e, 3e |
| `bank_difficultes.js` | Banque d'obstacles classiques (modifiable) |
| `bo_premiere.js` | 1re enseignement scientifique + bilan de compétences par chapitre |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | PWA (installation, hors-ligne) |

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
- Les bibliothèques externes (KaTeX pour les formules, html-docx pour l'export Word) sont chargées depuis un CDN. Elles sont mises en cache **après une première visite en ligne** ; sans cette visite, les formules s'affichent en LaTeX brut et l'export Word est indisponible hors ligne.
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

- Les données sont stockées dans le `localStorage` du navigateur : elles sont propres à un navigateur et à un appareil, et peuvent être effacées si l'on vide les données du site.
- **Exportez régulièrement** la bibliothèque (💾 Exporter tout) ; le fichier JSON sert aussi à transférer vos fiches d'un ordinateur à un autre.
- Les images sont réduites (900 px) pour limiter la taille ; en cas de stockage plein, un message invite à exporter.

## Limites connues

- Les formules écrites en fractions dans les PDF officiels sont mal extraites pour deux lignes de 5e (« fractions simples comme… », « fractions égales ») : à corriger à la main après insertion.
- Les « Automatismes » du programme de 6e ne sont pas inclus.
- Dans l'export Word, les formules sont converties en texte lisible (x², a/b, ≤, √, systèmes d'équations, matrices simples…) et ne sont **pas** des équations Word modifiables.
- L'export Word reprend le contenu mais pas toute la mise en page (images à droite du texte et formules en particulier) : vérifier le rendu dans Word.
- L'alignement « à droite » des images est conçu pour l'impression A4 ; il n'est pas garanti en export Word.

## Sources

Programmes officiels de mathématiques du cycle 3 (6e), du cycle 4 (annexe 2 et attendus de fin d'année de 5e, 4e et 3e) et programme de mathématiques intégré à l'enseignement scientifique de 1re générale. Le « bilan de compétences par chapitre » est un document personnel de l'auteur.
