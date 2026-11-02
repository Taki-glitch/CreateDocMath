# Importer une séquence produite par une IA (NotebookLM / Gemini)

CreateDocMaths peut créer **une séquence et toutes ses séances** à partir d'un fichier JSON produit par NotebookLM (ou Gemini), sans copier-coller. L'import crée de vraies séquences et séances natives : vous les modifiez ensuite dans l'éditeur habituel.

Rien n'est envoyé sur Internet : le fichier est lu et converti **dans votre navigateur**.

## 1. Procédure

1. Dans NotebookLM, chargez vos sources (programme, manuel…) puis envoyez le **prompt** de la section 6 (complété avec le niveau, la notion, le nombre de séances).
2. Demandez le fichier `.json` et téléchargez-le. Si l'IA n'en propose pas, copiez le JSON brut dans un fichier texte enregistré avec l'extension `.json`.
3. Dans CreateDocMaths : **Fichier ▸ 🤖 Importer une séquence depuis une IA (.json)…** et choisissez le fichier.
4. Une fenêtre d'**aperçu** présente : titre, niveau, nombre de séances, durée et nombre de phases de chacune (dépliable), les informations à compléter, les **avertissements**, les **champs non importés** et un éventuel **doublon**. Rien n'est importé tant que vous n'avez pas confirmé.
5. **Importer comme nouvelle séquence** ou **Annuler**.
6. La séquence apparaît dans la liste, la première séance est ouverte. **↶ (Ctrl + Z)** retire l'import si besoin.

L'import **ne remplace jamais** une séquence existante : il en crée toujours une nouvelle. Si une séquence de même nom et de même niveau existe déjà, l'aperçu le signale (sans bloquer : vous pouvez vouloir une nouvelle version ou une autre classe).

Le même bouton accepte aussi les fichiers JSON « natifs » (export « Partager cette séquence », anciennes sauvegardes `.json`) : ils passent par le flux d'import habituel (fusion). Les sauvegardes `.zip` restent à importer avec **Fichier ▸ Importer**.

## 2. Format `createdocmath-ai-sequence` (version 1.0)

Le format est volontairement indépendant de la structure interne : c'est l'application qui convertit le JSON vers ses champs.

Racine : `format` (obligatoire, valeur exacte `createdocmath-ai-sequence`), `version` (`"1.0"` ; absente = 1.0 supposée), `sequence` (obligatoire), `seances` (obligatoire, liste de 1 à 60 séances).

### 2.1 `sequence`

| Champ JSON | Obligatoire | Type | Champ CreateDocMaths | Si absent / remarque |
|---|---|---|---|---|
| `titre` | **oui** | texte | Nom de la séquence | import refusé |
| `niveau` | non (conseillé) | texte | Niveau | avertissement |
| `classe` | non | texte | Classe | vide |
| `reference_bo` | non | texte | Référence du B.O. | vide |
| `contenus_bo` | non | liste ou texte | Contenus du B.O. (une puce par élément) | vide |
| `capacites_attendues` | non | liste ou texte | Capacités attendues | vide |
| `recommandations` | non | texte | Recommandations pédagogiques | vide |
| `cadre_general` | non | texte | Cadre général et progression | vide |
| `progression` | non | texte | Cadre général, sous-titre « Progression » | rien |
| `problematique` | non | texte | Cadre général, sous-titre « Problématique » | rien |
| `objectifs_generaux` | non | liste ou texte | Cadre général, sous-titre « Objectifs généraux de la séquence » | rien |
| `prerequis` | non | liste ou texte | Cadre général, sous-titre « Pré-requis de la séquence » | rien |
| `domaine`, `theme` | non | texte | Cadre général, sous-titre « Domaine et thème » | rien |
| `duree_previsionnelle` | non | nombre (minutes) | Cadre général, sous-titre « Durée prévisionnelle » | rien |
| `competences` | non | liste | **non importé** : le bilan des compétences est calculé à partir des séances ; signalé dans l'aperçu | – |

Les informations sans champ propre (problématique, objectifs généraux, pré-requis de séquence, domaine, thème, durée) sont **regroupées dans « Cadre général et progression »** : rien n'est perdu et le schéma de l'application n'est pas modifié.

### 2.2 `seances[]`

| Champ JSON | Type | Champ CreateDocMaths | Si absent / remarque |
|---|---|---|---|
| `numero` | entier | N° de séance | les séances sont triées puis **numérotées 1, 2, 3…** (un numéro différent est signalé) |
| `titre` | texte | Nom de la séance | « Séance N » + avertissement |
| `type` | `apprentissage` \| `evaluation` | Type de séance | apprentissage ; autre valeur : avertissement |
| `duree` | entier > 0 (min) | Durée | somme des phases, sinon 55 min ; avertissement |
| `date` | `AAAA-MM-JJ` | Date | vide ; date invalide : avertissement |
| `objectifs` | texte | Objectif(s) de la séance | vide |
| `prerequis` | texte ou liste | Pré-requis | vide |
| `prerequis_tice` | texte | Pré-requis TICE | vide |
| `phases` | liste | Déroulement envisagé | aucune phase |
| `objectifs_fin` | texte | Objectifs de fin de séance | vide |
| `travail_personnel` | texte | Travail personnel donné | vide |
| `activite_titre` | texte | Titre du focus sur l'activité | vide |
| `activite` | texte | Focus sur l'activité (énoncé, corrections) | vide |
| `trace_ecrite` | texte | Contenu de la trace écrite | vide |
| `difficultes` | texte ou liste | Difficultés potentielles | vide |
| `aides` | texte ou liste | Aides et différenciation prévues | vide |
| `competences` | liste | Compétences cochées | une valeur inconnue est signalée et non importée |
| `competences_justification` | texte | Justification du lien avec les compétences | vide |
| `evaluation`, `bilan` | texte | Évaluation et bilan de la séance (`**Évaluation :**` et `**Bilan :**` si les deux sont présents) | vide |
| `introduction` | texte | Fiche séquence : Introduction | vide |
| `moment_cours` | texte | Fiche séquence : Moment de cours | vide |
| `entrainement` | texte | Fiche séquence : Entraînement & tâche | vide |
| `remarque_pedagogique` | texte | Fiche séquence : Remarque pédagogique | vide |

### 2.3 `phases[]`

| Champ JSON | Type | Champ CreateDocMaths | Remarque |
|---|---|---|---|
| `duree` | entier ≥ 0 (min) | Durée de la phase | absente ou invalide : 0 min + avertissement |
| `nom` | texte | Nom de la phase | « Phase N » si absent ; une phase entièrement vide est ignorée |
| `contenu` | texte | Description des activités des élèves | |
| `commentaire` | texte | Commentaire sur la phase (analyse didactique) | |
| `modalite` | texte | Mode (élèves actifs / collectif) **et** colonne « Modalités » | voir 3 |
| `modalites` | texte | Colonne « Modalités » (texte libre, prioritaire sur `modalite` pour l'affichage) | facultatif |
| `support`, `materiel` | texte | Support | regroupés en une ligne |

## 3. Valeurs reconnues

- **Type de séance** : `apprentissage` (défaut) ; `evaluation` (aussi `évaluation`, `eval`, `contrôle`, `DS`, `test`).
- **Modalité d'une phase** : l'application distingue deux modes. *Élèves actifs* : `individuel`, `binôme`, `groupe`, `autonomie`, `recherche`, `atelier`… *Collectif* : `collectif`, `plénière`, `classe entière`, `magistral`… Une valeur mixte (« individuel puis collectif ») compte comme *élèves actifs*. Valeur absente : *élèves actifs*. Valeur inconnue : *élèves actifs* + avertissement. Le texte d'origine est conservé dans la colonne « Modalités » de la fiche.
- **Compétences** : `Chercher`, `Modéliser`, `Représenter`, `Calculer`, `Raisonner`, `Communiquer` (casse et accents indifférents).
- **Texte** : mise en forme légère de l'application (`**gras**`, `__souligné__`, `- puce`, `## sous-titre`), formules LaTeX entre `$…$` ou `$$…$$` (barres obliques inverses **doublées** dans le JSON). Une liste de textes devient une liste à puces.

## 4. Contrôles, erreurs et sécurité

- **Refusé** (rien n'est modifié, message en français) : extension autre que `.json`, fichier de plus de 5 Mo, JSON mal formé, format inconnu, version autre que 1.x, séquence sans titre, absence de la rubrique `sequence`, aucune séance (ou aucune exploitable), plus de 60 séances.
- **Accepté avec avertissement** : séance sans titre, durée absente ou invalide, phase sans durée / vide / de modalité inconnue, compétence inconnue, date invalide, numéros en double, valeurs non textuelles (ignorées), textes de plus de 20 000 caractères (tronqués), plus de 30 phases par séance (les 30 premières), fichier entouré de balises Markdown (retirées), formules dont les barres obliques n'étaient pas doublées (`\frac`, `\times`, `\theta`… sont réparées ; **vérifiez-les**).
- **Identifiants** : tout identifiant fourni par l'IA est ignoré ; l'application crée ses propres identifiants et rattache elle-même chaque séance à la séquence.
- **Champs inconnus** : jamais importés, toujours listés dans « Non importé ».
- **Sécurité** : tout le contenu est traité comme du texte non fiable (échappé à l'affichage, dans l'aperçu comme dans les fiches, les exports Word et PDF). Aucun HTML ni JavaScript du fichier n'est exécuté.
- **Intégrité** : l'import est « tout ou rien ». Si l'enregistrement échoue, la séquence n'est pas ajoutée et vos fiches restent inchangées. Après enregistrement, les données sont relues et comparées à l'import (message de vérification).

## 5. Exemple complet

Fichier : `docs/exemple-sequence-ia.json` (4 séances dont une évaluation, formules, toutes les rubriques).

```json
{
  "format": "createdocmath-ai-sequence",
  "version": "1.0",
  "sequence": {
    "titre": "Additionner et soustraire des fractions",
    "niveau": "5e",
    "classe": "5A",
    "domaine": "Nombres et calculs",
    "theme": "Fractions",
    "problematique": "Comment additionner deux quantités exprimées avec des fractions de dénominateurs différents ?",
    "duree_previsionnelle": 220,
    "objectifs_generaux": [
      "Comprendre qu’une fraction est un nombre et la placer sur une droite graduée",
      "Reconnaître et produire des fractions égales",
      "Additionner et soustraire des fractions dont les dénominateurs sont multiples l’un de l’autre"
    ],
    "prerequis": [
      "Connaître les tables de multiplication",
      "Savoir lire une fraction simple (demi, tiers, quart)"
    ],
    "reference_bo": "Programme de mathématiques du cycle 4 (annexe 2)",
    "contenus_bo": [
      "Additionner et soustraire des fractions de dénominateurs quelconques",
      "Comparer des fractions"
    ],
    "capacites_attendues": [
      "Il additionne ou soustrait des fractions dont les dénominateurs sont égaux ou multiples l’un de l’autre",
      "Il reconnaît et produit des fractions égales"
    ],
    "competences": [
      "Chercher",
      "Représenter",
      "Calculer",
      "Raisonner",
      "Communiquer"
    ],
    "cadre_general": "Séquence de quatre séances : une activité de découverte, un cours, un temps d’entraînement et une évaluation.",
    "progression": "S1 sens de la fraction et fractions égales ; S2 addition à dénominateur multiple ; S3 entraînement et problèmes ; S4 évaluation.",
    "recommandations": "Prévoir des bandes de papier à plier pour les élèves en difficulté."
  },
  "seances": [
    {
      "numero": 1,
      "titre": "Partager une unité : fractions égales",
      "type": "apprentissage",
      "duree": 55,
      "date": "2026-11-09",
      "objectifs": "Reconnaître que $\\frac{1}{2}=\\frac{2}{4}$ et produire des fractions égales.",
      "prerequis": [
        "Lire une fraction simple",
        "Tables de multiplication"
      ],
      "prerequis_tice": "Aucun.",
      "phases": [
        {
          "duree": 10,
          "nom": "Questions flash",
          "contenu": "Calculer mentalement $3\\times 4$, $12\\div 3$, la moitié de 18.",
          "commentaire": "Rituel de mise au travail.",
          "modalite": "individuel",
          "support": "Diaporama",
          "materiel": "ardoises"
        },
        {
          "duree": 20,
          "nom": "Recherche : plier des bandes",
          "contenu": "Plier une bande en 2, en 4 puis en 8 et colorier la même longueur.",
          "commentaire": "Observer les procédures, repérer les erreurs de partage.",
          "modalite": "binome"
        },
        {
          "duree": 15,
          "nom": "Mise en commun",
          "contenu": "Faire verbaliser : « $\\frac{1}{2}$ et $\\frac{4}{8}$ représentent la même part ».",
          "commentaire": "Institutionnaliser le vocabulaire.",
          "modalite": "collectif"
        },
        {
          "duree": 10,
          "nom": "Trace écrite",
          "contenu": "Copier le cours et traiter deux exemples.",
          "commentaire": "",
          "modalite": "individuel"
        }
      ],
      "objectifs_fin": "Chaque élève sait écrire deux fractions égales à $\\frac{3}{4}$.",
      "travail_personnel": "Exercices 5 et 6 page 42 pour jeudi.",
      "activite_titre": "Activité : les bandes de papier",
      "activite": "Voici trois bandes de même longueur.\n\n1. Plier la première en 2 parts égales : quelle fraction représente une part ?\n2. Plier la deuxième en 4 parts égales.\n3. Que remarques-tu pour $\\frac{1}{2}$ et $\\frac{2}{4}$ ?",
      "trace_ecrite": "## Fractions égales\nPour tout nombre $k$ non nul : $$\\frac{a}{b}=\\frac{a\\times k}{b\\times k}$$\nExemple : $\\frac{1}{2}=\\frac{3}{6}$.",
      "difficultes": [
        "Confusion entre numérateur et dénominateur",
        "Partages non égaux lors du pliage"
      ],
      "aides": [
        "Bandes déjà graduées",
        "Fiche d’aide avec les tables"
      ],
      "competences": [
        "Chercher",
        "Représenter",
        "Communiquer"
      ],
      "competences_justification": "Les élèves manipulent, représentent puis expliquent leur démarche.",
      "evaluation": "Critère : produit au moins deux fractions égales correctes.",
      "bilan": "À compléter après la séance.",
      "introduction": "Pliage de bandes de papier.",
      "moment_cours": "Définition des fractions égales (10 min).",
      "entrainement": "Deux exemples guidés.",
      "remarque_pedagogique": "Ne pas écrire de règle avant la manipulation."
    },
    {
      "numero": 2,
      "titre": "Additionner avec un dénominateur multiple",
      "type": "apprentissage",
      "duree": 55,
      "objectifs": "Additionner $\\frac{1}{2}+\\frac{1}{4}$ en se ramenant au même dénominateur.",
      "prerequis": "Fractions égales (séance 1).",
      "phases": [
        {
          "duree": 8,
          "nom": "Rituel",
          "contenu": "Écrire de tête des fractions égales.",
          "commentaire": "",
          "modalite": "individuel"
        },
        {
          "duree": 17,
          "nom": "Problème : la pizza",
          "contenu": "Léa mange $\\frac{1}{2}$ d’une pizza et Tom $\\frac{1}{4}$. Quelle part ont-ils mangée à eux deux ?",
          "commentaire": "Laisser émerger l’erreur $\\frac{2}{6}$.",
          "modalite": "individuel"
        },
        {
          "duree": 15,
          "nom": "Débat et institutionnalisation",
          "contenu": "Confronter les réponses puis conclure.",
          "commentaire": "",
          "modalite": "collectif"
        },
        {
          "duree": 15,
          "nom": "Entraînement",
          "contenu": "Calculer $\\frac{3}{4}+\\frac{1}{8}$ et $\\frac{5}{6}-\\frac{1}{3}$.",
          "commentaire": "",
          "modalite": "individuel"
        }
      ],
      "activite": "Léa mange $\\frac{1}{2}$ d’une pizza et Tom $\\frac{1}{4}$ de la même pizza. Quelle fraction ont-ils mangée ?",
      "trace_ecrite": "Pour additionner deux fractions, on les écrit avec le même dénominateur puis on additionne les numérateurs.\n$$\\frac{1}{2}+\\frac{1}{4}=\\frac{2}{4}+\\frac{1}{4}=\\frac{3}{4}$$",
      "difficultes": "Addition des numérateurs et des dénominateurs : $\\frac{1}{2}+\\frac{1}{4}=\\frac{2}{6}$.",
      "competences": [
        "Modéliser",
        "Calculer",
        "Raisonner"
      ],
      "travail_personnel": "Exercice 12 page 45."
    },
    {
      "numero": 3,
      "titre": "Entraînement et problèmes",
      "type": "apprentissage",
      "duree": 55,
      "objectifs": "Consolider l’addition et la soustraction de fractions.",
      "phases": [
        {
          "duree": 10,
          "nom": "Questions flash",
          "contenu": "Série de calculs de fractions.",
          "commentaire": "",
          "modalite": "individuel"
        },
        {
          "duree": 35,
          "nom": "Ateliers différenciés",
          "contenu": "Trois niveaux d’exercices en autonomie.",
          "commentaire": "Circuler, aider les groupes de besoin.",
          "modalite": "groupe"
        },
        {
          "duree": 10,
          "nom": "Correction",
          "contenu": "Correction des exercices clés.",
          "commentaire": "",
          "modalite": "collectif"
        }
      ],
      "entrainement": "Ateliers à trois niveaux.",
      "competences": [
        "Calculer",
        "Raisonner"
      ]
    },
    {
      "numero": 4,
      "titre": "Évaluation : fractions",
      "type": "evaluation",
      "duree": 55,
      "objectifs": "Évaluer les capacités de la séquence.",
      "phases": [
        {
          "duree": 5,
          "nom": "Consignes",
          "contenu": "Distribution et rappel du barème.",
          "commentaire": "",
          "modalite": "collectif"
        },
        {
          "duree": 45,
          "nom": "Évaluation écrite",
          "contenu": "Quatre exercices individuels.",
          "commentaire": "",
          "modalite": "individuel"
        },
        {
          "duree": 5,
          "nom": "Ramassage",
          "contenu": "",
          "commentaire": "",
          "modalite": "collectif"
        }
      ],
      "evaluation": "Barème sur 20 : 4 exercices de 5 points.",
      "competences": [
        "Calculer",
        "Raisonner",
        "Communiquer"
      ]
    }
  ]
}
```

## 6. Prompt à copier dans NotebookLM

Fichier : `docs/prompt-notebooklm.txt`. Complétez la rubrique « DEMANDE » (niveau, notion, nombre et durée des séances) avant de l'envoyer.

```text
Tu es un enseignant de mathématiques expérimenté (collège / lycée, France). À partir des sources de ce carnet NotebookLM, produis une séquence pédagogique COMPLÈTE sous la forme d'UN SEUL fichier JSON au format « createdocmath-ai-sequence » version 1.0, destiné à être importé dans l'application CreateDocMaths.

DEMANDE (à compléter avant d'envoyer) :
- Niveau : …
- Notion ou chapitre : …
- Nombre de séances : … (dont … séance(s) d'évaluation) ; durée de chaque séance : … minutes
- Classe (facultatif) : …
- Consignes particulières (facultatif) : …

SOURCES ET RIGUEUR
1. Appuie-toi d'abord sur les sources du carnet (programmes officiels, manuels, documents fournis).
2. N'invente AUCUNE référence officielle : n'écris une référence de programme, un contenu ou une capacité attendue dans « reference_bo », « contenus_bo » ou « capacites_attendues » que s'ils figurent dans les sources. Sinon laisse la chaîne vide ("") ou la liste vide ([]).
3. Distingue clairement trois catégories d'information :
   a) ce qui est issu des sources : reprends-le fidèlement ;
   b) tes propositions pédagogiques (activités, ordre des notions, durées) : tu peux les proposer librement ;
   c) ce qui doit être vérifié par l'enseignant (point incertain, source manquante) : commence le texte concerné par « À VÉRIFIER : ».
4. N'invente jamais une information pour remplir un champ : en cas de doute, laisse le champ vide.

CONTENU ATTENDU
- Une progression cohérente, qui respecte le programme du niveau demandé ; une problématique de séquence.
- Pour CHAQUE séance : objectifs, pré-requis, phases minutées (la somme des durées des phases doit être égale à la durée de la séance), activités mathématiques pertinentes, consignes rédigées pour les élèves, corrections et éléments de réponse (dans « activite », après chaque question, sur une ligne commençant par « → Correction : »), trace écrite, difficultés et erreurs classiques anticipées, aides et différenciation, compétences travaillées (parmi : Chercher, Modéliser, Représenter, Calculer, Raisonner, Communiquer) avec une justification, critères de réussite (dans « evaluation »).
- Pour chaque phase : durée en minutes, nom, description de l'activité des élèves (« contenu »), commentaire pour l'enseignant, modalité de travail.

RÈGLES DU FICHIER (strictes)
- Réponds par UN SEUL objet JSON syntaxiquement valide : guillemets doubles, aucune virgule finale, aucun commentaire.
- AUCUN texte avant ou après le JSON, AUCUNE balise Markdown, AUCUN bloc de code (pas de ```).
- Si tu peux créer un fichier téléchargeable, crée un fichier « sequence.json » contenant uniquement ce JSON ; sinon affiche uniquement le JSON brut.
- Retour à la ligne dans une chaîne : \n. Guillemet dans une chaîne : \".
- Formules mathématiques : LaTeX entre dollars, et CHAQUE barre oblique inverse doit être DOUBLÉE dans le JSON. Exemple : "$\\frac{1}{2}+\\sqrt{x^2}$". Formule centrée : "$$\\frac{a}{b}$$".
- Mise en forme autorisée dans les textes : **gras**, __souligné__, une puce par ligne commençant par "- ", un sous-titre sur une ligne commençant par "## ". Aucun HTML.
- « type » : "apprentissage" ou "evaluation". « modalite » : "individuel" ou "collectif" (travail en binôme ou en groupe : "individuel").
- « date » : laisse "" sauf si l'enseignant en fournit (format AAAA-MM-JJ).
- Les durées sont des nombres entiers de minutes. Les numéros de séance commencent à 1.
- N'ajoute aucun champ autre que ceux du format. Un champ inconnu reste "" (texte) ou [] (liste).

=== FORMAT JSON ===
{
  "format": "createdocmath-ai-sequence",
  "version": "1.0",
  "sequence": {
    "titre": "« titre de la séquence »",
    "niveau": "« 6e, 5e, 4e, 3e, 2de, 1re… »",
    "classe": "",
    "domaine": "« domaine du programme »",
    "theme": "« thème »",
    "problematique": "« question qui guide la séquence »",
    "duree_previsionnelle": 0,
    "objectifs_generaux": ["« objectif »"],
    "prerequis": ["« pré-requis »"],
    "reference_bo": "« référence exacte issue des sources, sinon vide »",
    "contenus_bo": ["« contenu issu des sources »"],
    "capacites_attendues": ["« capacité issue des sources »"],
    "competences": ["Chercher", "Modéliser", "Représenter", "Calculer", "Raisonner", "Communiquer"],
    "cadre_general": "« organisation générale de la séquence »",
    "progression": "« enchaînement des séances »",
    "recommandations": "« conseils, différenciation »"
  },
  "seances": [
    {
      "numero": 1,
      "titre": "« titre de la séance »",
      "type": "apprentissage",
      "duree": 55,
      "date": "",
      "objectifs": "« objectifs de la séance »",
      "prerequis": "« pré-requis de la séance »",
      "prerequis_tice": "« calculatrice, tableur, GeoGebra… »",
      "phases": [
        {
          "duree": 10,
          "nom": "« nom de la phase »",
          "contenu": "« activité des élèves »",
          "commentaire": "« commentaire pour l'enseignant »",
          "modalite": "individuel",
          "support": "« diaporama, fiche… »",
          "materiel": "« matériel »"
        }
      ],
      "objectifs_fin": "« ce que les élèves doivent savoir faire à la fin »",
      "travail_personnel": "« travail donné à la maison »",
      "activite_titre": "« titre de l'activité »",
      "activite": "« énoncé, questions, puis → Correction : … »",
      "trace_ecrite": "« cours / bilan à retenir »",
      "difficultes": "« erreurs classiques anticipées »",
      "aides": "« aides et différenciation »",
      "competences": ["Chercher", "Calculer"],
      "competences_justification": "« pourquoi ces compétences »",
      "evaluation": "« critères de réussite »",
      "bilan": "",
      "introduction": "« résumé de l'introduction »",
      "moment_cours": "« résumé du moment de cours »",
      "entrainement": "« résumé de l'entraînement »",
      "remarque_pedagogique": "« point de vigilance »"
    }
  ]
}
=== FIN DU FORMAT ===

Produis maintenant le JSON complet de la séquence demandée, avec TOUTES les séances, en respectant exactement ce format.
```

Conseils : demandez la séquence **par lots** (2 à 3 séances à la fois) si l'IA tronque sa réponse, puis fusionnez les listes `seances` (renumérotées à l'import) ; relisez systématiquement les mentions « À VÉRIFIER » et les références au programme.

## 7. Compatibilité des versions

- La version du format est indépendante de la version de l'application et du schéma de données (IndexedDB v2).
- **1.0** : version actuelle. Toute évolution **1.x** n'ajoutera que des champs facultatifs : un fichier 1.x plus récent reste importable, ses champs inconnus étant ignorés et signalés. Un changement incompatible portera le numéro **2.0** : un tel fichier est refusé avec un message clair par les versions qui ne le connaissent pas.
- Les fichiers JSON natifs (`seqs` / `seances`) et les anciennes sauvegardes continuent d'être acceptés par le flux d'import existant, inchangé.

## 8. Limites connues

- Les images ne sont pas importées (le format ne les prévoit pas) ; ajoutez-les ensuite dans l'éditeur.
- Les compétences de la séquence ne sont pas importées en tant que telles (elles se déduisent des compétences cochées dans les séances).
- Le contenu produit par l'IA peut contenir des erreurs mathématiques ou des références inexactes : **relisez et corrigez** avant utilisation en classe.
- Les formules sont conservées en LaTeX ; une barre oblique mal doublée est réparée dans les cas courants seulement (`\f`, `\b`, `\t…`, `\r…`), d'où la consigne du prompt. Un `\u` isolé rend le JSON invalide : demandez à l'IA de régénérer le fichier.
- Un fichier est limité à 5 Mo et 60 séances.
- NotebookLM ne garantit pas toujours un fichier téléchargeable : copiez alors le JSON brut dans un fichier `.json`.

## 9. Tests

`node tests/run.js import` exécute les tests de cette fonctionnalité (1, 5 et 10 séances, phases, compétences, activités / traces, formules, champs absents, données incorrectes, JSON mal formé, format inconnu, doublon, identifiants, association séquence / séances, enregistrement IndexedDB et retour arrière, conservation des données existantes, sécurité, fiches, Word et PDF après import, cohérence de cette documentation).
