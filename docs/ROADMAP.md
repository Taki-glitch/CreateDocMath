# Feuille de route technique

Règles : **ne rien casser, préserver les données, un lot = une pull request testable et livrable**, validation avant chaque lot structurel. Aucun test n'est déclaré réussi sans avoir été exécuté. Voir `docs/AUDIT-INITIAL.md` pour l'état de départ.

## État

| Phase | État |
|---|---|
| 0 Audit | **fait** (`docs/AUDIT-INITIAL.md`) |
| 1 à 3 Cahier : base, éditeur, liaison | fait, 32 tests |
| 4 · lot A — cahiers dans les sauvegardes | **fait** (10 tests) |
| 4 · lots B à H, 4 bis, 4 ter, 5, 6, transversal | à faire |

## Phase 4 — découpage en lots indépendants

| Lot | Contenu | Dépend de | Risque | Validation préalable requise |
|---|---|---|---|---|
| **A** | Cahiers dans le ZIP, la copie interne et le dossier de sauvegarde ; restauration additive | — | élevé (données) | **fait** |
| **H** | Hygiène et CI : supprimer `.patch/` et l'ancien ZIP du dépôt, workflow GitHub Actions (tests sur chaque PR), nom de cache du service worker automatisé | — | faible | non |
| **G** | Conflits entre onglets pour les cahiers (détection, avertissement, recharger / comparer / garder une copie), sur le modèle de `cdm3db` | — | moyen | non |
| **B** | Stockage binaire séparé des images des cahiers (store `blobs`, références, historique léger) : **migration de `cdm3cahiers`** | A | **élevé** | **oui : plan de migration** |
| **D** | Export Word du cahier (trois versions, tableaux, encadrés, images, équations via le convertisseur existant) | — | moyen | non |
| **C** | Page de garde, table des matières, en-têtes / pieds / marges configurables, pagination mesurée sur le rendu réel | — | moyen | **oui : choix de la méthode de pagination** |
| **E** | Images du cahier : recadrage, rotation, optimisation | B recommandé | moyen | non |
| **F** | Historique daté des versions : comparer, restaurer | B | moyen | non |

**Ordre proposé** : H → G → D → B (après validation) → C (après validation) → E → F. Les lots H, G et D n'ont aucune dépendance structurelle et peuvent être livrés immédiatement.

## Phases suivantes

| Phase | Principe | Prérequis |
|---|---|---|
| 4 bis Synchronisation | exploiter `src` et `h` déjà enregistrés : états (à jour, modifié dans la source, source supprimée, import ancien, contenu personnalisé), comparaison, mise à jour **toujours validée**, jamais d'écrasement | lot A |
| 4 ter Outils pédagogiques | auditer d'abord ce qui existe (modèles, différenciation, couverture des compétences, mode classe) ; ajouter générateurs d'évaluations et de fiches de révision, un seul sujet par lot | 4 bis |
| 5 Publication | Supabase : tables `notebooks`, `publications`, `publication_versions`, RLS, RPC, projection élève calculée côté serveur, corrigés séparés, tests de permissions côté serveur | phase 4 stable ; **projet Supabase à fournir** |
| 6 Espace élève interactif | comptes minimaux, exercices interactifs, autoévaluation, suivi | phase 5 stable et sécurisée |
| Transversal | recherche globale étendue aux cahiers, IA assistée (aperçu obligatoire), accessibilité de l'application complète, mesures de performance | au fil de l'eau |

## Points qui nécessitent votre décision

1. **Lot B** : accepter une migration de la base des cahiers (sauvegarde préalable automatique, réversible).
2. **Lot C** : méthode de pagination. Proposition : paginer en mesurant les hauteurs dans un conteneur A4 calqué sur la mise en page d'impression, afin d'obtenir une table des matières avec numéros de page exacts.
3. **Phase 5** : création d'un projet Supabase et fourniture de l'URL publique et de la clé publique (jamais la clé de service).
