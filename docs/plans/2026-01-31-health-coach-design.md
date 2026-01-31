# Health Coach — Document de Design

## Vue d'ensemble

Application mobile (PWA) de coaching sportif personnalisé qui s'adapte en temps réel aux pathologies, douleurs, environnement de salle et progression de l'utilisateur. Fonctionne hors-ligne, données 100% privées et locales.

Accessible via Safari sur iPhone, installable sur l'écran d'accueil comme une app native.

---

## Utilisateurs cibles

Toute personne souhaitant un suivi sportif personnalisé tenant compte de ses problèmes de santé. L'app est multi-utilisateur : chaque personne passe par un onboarding qui collecte ses données et génère un programme sur mesure.

---

## Onboarding (premier lancement)

Questionnaire étape par étape :

1. **Le corps** — taille, poids, âge, sexe
2. **Problèmes de santé** — zones du corps interactives, diagnostic, ancienneté, intensité de la douleur pour chaque zone déclarée
3. **Environnement salle** — machines disponibles (checklist), poids disponibles (haltères de X à Y kg par pas de Z). L'inventaire se complète au fil des séances (apprentissage progressif)
4. **Objectifs** — perte de poids, prise de masse, rééducation, posture, mobilité (choix multiples)
5. **Planning** — nombre de jours par semaine, durée par séance
6. **Import programme existant (optionnel)** — l'utilisateur fournit ses programmes existants, le système les analyse et construit le meilleur plan adapté à ses pathologies et son matériel

---

## Écran de séance (coeur de l'app)

Interface minimaliste, mobile-first.

### Vue exercice

```
Développé couché — prise neutre
2/4 · 40kg × 8

[ Fait ]  [ Occupé ]  [ Pas ce poids ]
```

### Après "Fait" — saisie rapide

```
Reps réussies : [ 8 ]   En réserve : [ 2 ]   Douleur ? [ Non ]
```

- Reps réelles effectuées
- Reps en réserve (RPE) — pour calibrer la progression
- Douleur (oui/non, si oui : échelle 1-5 sur la zone concernée)

### Chrono repos

```
Repos
1:32 / 2:00

Série suivante : 3/4 · 40kg × 8

[ Go ]
```

Le bouton "Go" apparaît quand le repos est terminé. Le chrono enregistre le temps de repos réel (utilisé par le moteur de progression).

### Machine occupée — attente active

```
Machine occupée — en attendant :
→ Étirement poignets (rehab golf elbow)  [2 min]
→ Gainage latéral                         [2 min]

[ Machine libre ]
```

Quand occupé :
- Le système propose du remplissage utile : rehab, mobilité, gainage — des exercices qui ne fatiguent PAS les muscles du prochain exercice principal
- L'ordre des exercices principaux ne change PAS — préserve l'intégrité du cycle de progression
- Si attente très longue (+10 min) : remplacement possible, mais tracké séparément

### Poids indisponible

```
Pas ce poids — qu'est-ce que tu as ?
[ 2.5 ] [ 5 ] [ 7.5 ] [ Autre: __ ]
```

Le système adapte les reps en conséquence et retient le poids manquant pour les prochaines séances.

### Check douleurs fin de séance

```
Séance terminée
Check douleurs :
· Coude droit :  [0] [1] [2] [3] [4] [5]
· Genou droit :  [0] [1] [2] [3] [4] [5]
· Lombaires :    [0] [1] [2] [3] [4] [5]
```

Uniquement les zones connues de l'utilisateur, pas de questionnaire générique.

---

## Moteur de progression

### Double progression poids/reps avec périodisation

**Phase 1 — Hypertrophie + rééducation** (8-15 reps)
Charges modérées, stress articulaire faible. Les tendons et articulations guérissent, base musculaire se construit.

**Phase 2 — Mix hypertrophie/force** (5-12 reps)
Introduction progressive de blocs de force sur les exercices où les articulations le permettent.

**Phase 3 — Périodisation complète**
Alternance de blocs selon la progression et les données de douleur.

Le système décide quand passer d'une phase à l'autre en fonction des données utilisateur : niveaux de douleur en baisse, progression stable, articulations qui tiennent.

### Logique de progression par séance

- **Réussi (toutes les séries complètes, RPE correct)** — augmentation du poids (si disponible) ou des reps
- **Partiellement réussi** — même poids, objectif compléter les séries manquantes
- **Régression** — vérification contexte (douleur ? fatigue ?). Si récurrent, baisse de charge et relance de cycle

### Semaines de deload

Après 4-6 semaines de progression, le système programme automatiquement une semaine allégée (50-60% des charges). Essentiel pour la récupération articulaire et tendineuse.

### Facteurs de pondération

Le moteur tient compte de :
- Temps de repos réel vs prévu (repos allongé = perf gonflée, pas d'augmentation)
- Position de l'exercice dans la séance
- Historique de douleur sur les zones sollicitées
- Fréquence d'entraînement réelle (pas de jours fixes, séances numérotées)

### Exercices de rééducation

Progression très conservatrice. Priorité = zéro douleur, pas la performance. Réduction automatique du volume rehab quand la pathologie s'améliore.

---

## Module rééducation/santé

### Protocoles intégrés (basés sur la littérature médicale et sportive)

- **Épicondylite médiale (golf elbow)** — exercices excentriques (Tyler Twist, wrist curls excentriques), progression conservatrice
- **Tendinites genou** — renforcement excentrique quadriceps (spanish squat, leg extension tempo lent)
- **Arthrose pied + pieds plats** — renforcement voûte plantaire (short foot exercise, towel curls), mobilité cheville
- **Posture (cou/épaules en avant)** — rétracteurs scapulaires (face pulls, band pull-aparts), étirements pectoraux, exercices de cou
- **Sangle abdominale + lombaires** — gainage progressif (dead bugs, pallof press, bird dogs), renforcement érecteurs du rachis
- **Sciatique** — mobilité nerf sciatique (nerve flossing), renforcement fessiers, étirements piriforme

### Intégration dans les séances

```
ÉCHAUFFEMENT (10 min)
→ Séries de chauffe progressives (barre à vide → poids de travail)
→ Mobilité ciblée selon la séance du jour
→ 1-2 exos rehab prioritaires

SÉANCE PRINCIPALE
→ Exercices muscu (avec suivi douleur et RPE)

ATTENTE ACTIVE (si machine occupée)
→ Exos rehab secondaires / mobilité

RETOUR AU CALME (5 min)
→ Étirements ciblés zones douloureuses
```

### Échauffement intelligent

Séries de chauffe avant le premier exercice lourd :
- Barre à vide × 10
- 50% poids de travail × 8
- 70% poids de travail × 5
- 85% poids de travail × 3
- Puis séries de travail

### Instructions rehab

Chaque exercice de rééducation inclut une description textuelle claire avec les consignes clés d'exécution (pas de vidéo, texte uniquement).

---

## Jours off — routine optionnelle

```
Jour off — routine du jour (15-20 min)

→ Excentriques golf elbow
→ Mobilité épaules/cou
→ Nerve flossing sciatique
→ Étirements (programme externe)  [ Fait / Pas fait ]

[ Faire ]  [ Passer ]
```

- Adapté en fonction des programmes fournis par l'utilisateur
- Exercices d'étirement externe (vidéos perso) : le système demande juste si c'est fait pour le suivi d'assiduité
- Léger, court, pas obligatoire

---

## Séances flexibles

Pas de planning fixe (pas "lundi = push"). Le système fonctionne en séances numérotées :

```
Séance A → Séance B → Séance C → Séance A ...
```

- L'app sait quelle était la dernière séance et quand
- Repos minimum entre séances (ex: 48h)
- Si l'utilisateur ouvre l'app trop tôt : repos recommandé ou routine mobilité/rehab légère proposée
- La progression s'adapte à la fréquence réelle

---

## Dashboard

Accessible quand l'utilisateur est posé (pas en séance) :

- **Progression** — courbes poids/reps par exercice, tendance sur les semaines
- **Douleurs** — évolution par zone (ex: "golf elbow : 7/10 → 3/10 en 6 semaines")
- **Historique séances** — détail de chaque séance (exercices, charges, reps, adaptations)
- **Prochaine séance** — aperçu de ce qui attend l'utilisateur
- **Assiduité** — fréquence réelle vs objectif, suivi des routines jour off

Minimaliste. Juste les données utiles.

---

## Inventaire salle — apprentissage progressif

- Onboarding : déclaration initiale des machines et poids disponibles
- En séance : chaque "Pas ce poids" ou "Occupé" enrichit l'inventaire
- Le système ne propose jamais un exercice infaisable dans la salle de l'utilisateur
- Import de programmes existants ≠ inventaire salle (deux choses séparées)

---

## Backup des données

- Bouton "Exporter mes données" — génère un fichier JSON sauvegardable sur iCloud ou autre
- Bouton "Importer mes données" — restauration depuis le fichier
- Données 100% locales, aucun envoi vers un serveur externe

---

## Base de connaissances

Les protocoles de rééducation, la sélection d'exercices et les recommandations sont basés sur la littérature scientifique et médicale du sport, intégrés en dur dans l'application. Pas de recherche internet en temps réel.

Mise à jour des connaissances via mise à jour de l'app.

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | React (PWA) | Interface mobile-first, installable sur iPhone via Safari |
| Backend | Python + FastAPI | Logique de progression, adaptation, rehab |
| Base de données | SQLite | Stockage local, fichier unique, simple à sauvegarder |
| Hébergement | Local ou serveur perso | Données privées, pas de cloud tiers |

### Contraintes iPhone (PWA sur iOS)

- Pas de notifications push fiables sur iOS pour les PWA
- Rappels de séance : l'utilisateur configure ses propres rappels (alarme téléphone)
- L'app fonctionne en plein écran depuis l'écran d'accueil (pas de barre Safari)

---

## Périmètre actuel

**Inclus :**
- Coaching musculation personnalisé
- Rééducation / rehab intégré
- Suivi de progression et douleurs
- Adaptation temps réel en séance
- Routines jours off

**Exclu (pour le moment) :**
- Nutrition / tracking calories
- Intégration balance connectée
- Reconnaissance d'images (photos salle)
- Notifications push
