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

## Sauvegarde et données

- Les données sont stockées dans le `localStorage` du navigateur : elles sont propres à un navigateur et à un appareil, et peuvent être effacées si l'on vide les données du site.
- **Exportez régulièrement** la bibliothèque (💾 Exporter tout) ; le fichier JSON sert aussi à transférer vos fiches d'un ordinateur à un autre.
- Les images sont réduites (900 px) pour limiter la taille ; en cas de stockage plein, un message invite à exporter.

## Limites connues

- Les formules écrites en fractions dans les PDF officiels sont mal extraites pour deux lignes de 5e (« fractions simples comme… », « fractions égales ») : à corriger à la main après insertion.
- Les « Automatismes » du programme de 6e ne sont pas inclus.
- L'export Word reprend le contenu mais pas toute la mise en page (images à droite du texte et formules en particulier) : vérifier le rendu dans Word.
- L'alignement « à droite » des images est conçu pour l'impression A4 ; il n'est pas garanti en export Word.

## Sources

Programmes officiels de mathématiques du cycle 3 (6e), du cycle 4 (annexe 2 et attendus de fin d'année de 5e, 4e et 3e) et programme de mathématiques intégré à l'enseignement scientifique de 1re générale. Le « bilan de compétences par chapitre » est un document personnel de l'auteur.
