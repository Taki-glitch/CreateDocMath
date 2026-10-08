# 📐 Fiches de Séance – Mathématiques (Cycle 4)

Un outil web complet, rapide et autonome pour concevoir, structurer et gérer vos fiches de séquence et de séance en mathématiques au collège (5e, 4e, 3e).

L'application intègre l'ensemble des programmes du **Bulletin Officiel (BO) du Cycle 4** (objectifs, automatismes, attendus de fin d'année) et propose un aperçu au format A4 mis à jour en temps réel.

---

## ✨ Fonctionnalités principales

### 1. Organisation par Séquences & Séances
* **Arborescence dynamique** : Gagnez du temps grâce à la gestion hiérarchique (une séquence regroupe plusieurs séances).
* **Partage des données BO** : Les informations du B.O. saisies au niveau de la séquence s'appliquent automatiquement à toutes ses séances.
* **Duplication & Gestion** : Dupliquez des séances en un clic pour créer des variantes ou de nouvelles étapes rapidement.

### 2. Intégration du B.O. Cycle 4 (Moteur de recherche)
* **Recherche intégrée** : Moteur de recherche par mot-clé (*ex: "Pythagore", "fractions", "boucle"*), par niveau (*5e, 4e, 3e*), par domaine ou par thème.
* **Sélection en un clic** : Cochez les compétences, automatismes ou attendus souhaités et ajoutez-les directement dans les champs de votre fiche.

### 3. Saisie & Ergonomie Enseignant
* **Mise en forme Markdown** : Formatez facilement le texte (`**gras**`, `__souligné__`, `- puces`, `## sous-titres`).
* **Barre de formules TeX/LaTeX** : Insertion rapide de symboles mathématiques ($\frac{a}{b}$, $\sqrt{x}$, $x^2$, $\pi$, $\leq$, etc.) via **KaTeX**.
* **Templates de phases** : Modèles d'étapes pré-remplis (*Questions rapides, Recherche individuelle, Mise en commun, etc.*) et réordonnancement par flèches (↑/↓).
* **Calculateur de minutage** : Vérification automatique de la durée totale de la séance avec alerte en cas de dépassement.
* **Gestion des images** : Importation et compression automatique des schémas, figures GeoGebra ou énoncés.

### 4. Rendu & Sauvegarde
* **Aperçu A4 en temps réel** : La colonne de droite affiche le document final formaté façon "fiche Eduscol / Inspection" à chaque frappe.
* **Auto-sauvegarde locale** : Vos données sont conservées dans le navigateur (`localStorage`).
* **Import / Export JSON** : Sauvegardez l'ensemble de vos cours dans un fichier `.json` pour les partager ou les utiliser sur un autre ordinateur.
* **Impression & PDF** : Feuille de style dédiée avec gestion anti-coupure des tableaux et images lors de l'export PDF.

---

## 📁 Structure du projet

```text
.
├── index.html        # Interface utilisateur (formulaire, aperçu A4, styles et scripts)
└── bo_cycle4.js      # Base de données complète du programme officiel du Cycle 4
