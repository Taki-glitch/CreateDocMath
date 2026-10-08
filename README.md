# Générateur de Fiches de Séance - Mathématiques

Une application web légère, simple et rapide permettant aux enseignants de mathématiques de concevoir, structurer et générer des fiches de déroulement de séances conformes aux exigences pédagogiques et aux programmes du Bulletin Officiel (BO).

## 🚀 Fonctionnalités

* **Saisie complète et guidée** : Formulaire reprenant l'ensemble des rubriques indispensables à la préparation de cours :
  * Informations générales (séquence, séance, date, objectifs).
  * Cadre institutionnel (extraits BO, capacités attendues, compétences mathématiques).
  * Pré-requis (connaissances, compétences, outils TICE).
  * Déroulement de séance (minutage étape par étape, mise en œuvre, commentaires par phase).
  * Analyse didactique et différenciation (choix du problème, difficultés anticipées, activités pour élèves rapides, travail personnel).
* **Mise en page automatique** : Génération immédiate d'un document récapitulatif sous forme de tableau structuré.
* **Export PDF & Impression** : Bouton d'impression intégré avec une feuille de style optimisée (le formulaire est automatiquement masqué à l'impression).
* **Sans dépendances ni installation** : Fonctionne directement dans n'importe quel navigateur web.

## 🛠️ Stack technique

* **HTML5** : Structure du formulaire et du document généré.
* **CSS3** : Design responsive, variables CSS et styles `@media print` pour l'impression PDF.
* **JavaScript (Vanilla)** : Gestion du rendu dynamique sans framework lourd.

## 💻 Installation et Utilisation

1. **Télécharger le projet** :
   * Cloner le dépôt ou télécharger le fichier `index.html`.

2. **Lancer l'application** :
   * Double-cliquez simplement sur le fichier `index.html` pour l'ouvrir dans votre navigateur habituel (Chrome, Firefox, Edge, Safari, etc.). Aucune connexion serveur ni commande `npm` n'est requise.

3. **Générer une fiche** :
   1. Remplissez les champs du formulaire.
   2. Cliquez sur **« Générer la Fiche de Séance »**.
   3. Vérifiez le rendu dans le tableau qui s'affiche sous le formulaire.
   4. Cliquez sur **« Imprimer / Enregistrer en PDF »** pour sauvegarder votre fiche.

## 📂 Structure du projet

```text
.
└── index.html    # Fichier unique contenant le formulaire, le script JS et les styles CSS
