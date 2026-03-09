# Mon Coach Financier — Stratégie Technique & Vision Produit

> Document de référence pour tout agent ou développeur intervenant sur le projet.
> Dernière mise à jour : 9 mars 2026.

---

## 1. L'Âme du Projet

### Ce que le code révèle

Mon Coach Financier n'est **pas** un outil de calcul. C'est un **coach comportemental** déguisé en application financière.

Le moteur (`app/lib/engine.ts`) implémente une **pyramide de Maslow de l'argent** :

```
PORTE 3 → Croissance    (Ton argent travaille pour toi ?)
PORTE 2 → Sécurité      (Tu peux encaisser un imprévu ?)
PORTE 1 → Survie        (Tu ne meurs pas financièrement ?)
```

Le moteur ne propose **jamais** d'investissement (PEA, crypto, SCPI) tant que la sécurité n'est pas assurée. Il ne passe jamais à la croissance tant que le matelas de sécurité est insuffisant. Cette hiérarchie est le contrat fondamental du produit.

### Le vrai produit

- Le tableau de bord n'est pas le produit. Le **changement de comportement** de l'utilisateur face à l'argent est le produit.
- Les 16 `ACTION_GUIDES` intégrés au moteur (PEA, LEP, dette, budget...) forment un **système éducatif embarqué** : chaque recommandation est accompagnée d'étapes concrètes, de tips, d'un niveau de difficulté.
- Le simulateur d'achat (`analyzePurchaseImpact`) attaque les biais cognitifs en montrant le **coût réel** d'un achat : coût d'opportunité sur 10 ans, impact sur la trésorerie à J+45, effet sur le matelas de sécurité.

### Positionnement vs concurrence

| App | Ce qu'elle fait | Notre différence |
|-----|----------------|-----------------|
| Bankin'/Linxo | Agrège les comptes bancaires, catégorise les dépenses | Nous ne connectons pas les comptes. Nous **éduquons** et **simulons**. |
| Wealthfront | Gère l'argent à la place de l'utilisateur (robo-advisor) | Nous rendons l'utilisateur **autonome** dans ses décisions. |
| YNAB | Budgétisation manuelle stricte | Nous allons au-delà du budget : patrimoine, objectifs, recommandations personnalisées. |

**Notre proposition de valeur unique** : un moteur de recommandation contextuel (le "Docteur Financier") qui adapte ses conseils au profil exact de l'utilisateur (âge, persona, patrimoine, objectifs, dettes).

---

## 2. Stack Technique

| Domaine | Choix | Version | Notes |
|---------|-------|---------|-------|
| Framework | Next.js (App Router) | 14.2.x | SSR sous-exploité (pages en Client Components) |
| Auth | Clerk | 5.x | Middleware protège toutes les routes non-publiques |
| Base de données | PostgreSQL via Prisma | 5.16.x | Schéma solide, manque index sur dates et Decimal pour les montants |
| Styling | Tailwind CSS | 3.4.x | Composants UI custom (pas de shadcn/MUI) |
| Charts | Recharts + Nivo (Sankey) | — | |
| Validation | Zod | 4.x | Appliqué sur toutes les routes API (Phase 1 terminée) |
| Tests | Vitest | 4.x | 61 tests couvrant engine.ts et definitions.ts |
| PWA | @ducanh2912/next-pwa | 10.x | Service worker en production |

---

## 3. Architecture du Moteur

### Fichiers clés (`app/lib/`)

```
definitions.ts  — Types, enums, constantes, helpers (safeFloat, calculateListTotal)
engine.ts       — Le cerveau : computeFinancialPlan, analyzeProfileHealth, distributeGoals
scenarios.ts    — Simulateur d'achat : generateTimeline, analyzePurchaseImpact
logic.ts        — Barrel export (réexporte definitions + engine + scenarios)
validations.ts  — Schémas Zod pour toutes les routes API
prisma.ts       — Singleton Prisma Client
```

### Couche Service (`app/services/`)

```
errors.ts            — ServiceError (not found, forbidden, internal) avec status HTTP
profileService.ts    — getProfileId, updateProfile
userService.ts       — getFullUserProfile, saveFullUserProfile (le gros GET/POST)
itemService.ts       — createItem, updateItem, deleteItem
assetService.ts      — createAsset, updateAsset, deleteAsset (+ historique)
goalService.ts       — createGoal, updateGoal, deleteGoal
decisionService.ts   — createDecision, updateDecision, deleteDecision
index.ts             — Barrel export
```

Les routes API ne contiennent plus que : auth → validation Zod → appel service → réponse HTTP. Toute la logique Prisma est dans les services, ce qui permet d'ajouter cache, events ou rate limiting sans toucher aux routes.

### Flux de données

```
Utilisateur saisit son profil
        │
        ▼
  POST /api/user (validé par Zod)
        │
        ▼
  PostgreSQL (Prisma)
        │
        ▼
  GET /api/user → Profile complet
        │
        ▼
  useFinancialData() (hook client)
        │
        ├──► computeFinancialPlan(profile) → SimulationResult (budget, allocations)
        ├──► analyzeProfileHealth(profile, budget) → DeepAnalysis (score, opportunités)
        └──► generateTimeline(profile, history) → MonthData[] (trésorerie J+N)
```

### Fonctions exportées du moteur

| Fonction | Rôle | Entrée | Sortie |
|----------|------|--------|--------|
| `computeFinancialPlan` | Orchestrateur principal | Profile | SimulationResult (budget complet, allocations, KPIs) |
| `analyzeProfileHealth` | Le "Docteur Financier" | Profile + budget | DeepAnalysis (score 0-100, tags, opportunités triées par sévérité) |
| `calculateMonthlyEffort` | Effort mensuel pour un objectif | Goal | number (€/mois, avec ou sans intérêts composés) |
| `analyzeGoalStrategies` | Diagnostic par objectif | Goal + contexte | GoalDiagnosis (POSSIBLE / HARD / IMPOSSIBLE + stratégies) |
| `distributeGoals` | Allocation optimale de l'épargne | Goal[] + capacité | Allocations par priorité (EMERGENCY > REAL_ESTATE > OTHER > RETIREMENT) |
| `simulateGoalScenario` | Simulation d'un nouvel objectif | Goal input + contexte | Effort + diagnosis |
| `generateTimeline` | Projection de trésorerie jour par jour | Profile + historique | MonthData[] (6 mois de projection) |
| `analyzePurchaseImpact` | Impact d'un achat | Achat + contexte | AnalysisResult (verdict, coûts réels, projection) |

---

## 4. Ce Qui a Été Fait

### Phase 0 — Audit Zero-Knowledge (terminé)

- Analyse complète de la stack, de l'architecture, de la sécurité, du schéma Prisma
- Identification de 6 vecteurs d'attaque (NaN injection, enums invalides, routes sans try/catch...)
- Roadmap de 5 améliorations prioritaires

### Point 1 — Validation Zod (terminé)

- Fichier `app/lib/validations.ts` créé avec 12 schémas et 8 enums miroir Prisma
- 10 routes API réécrites avec validation `safeParse` + try/catch
- Suppression de tous les `parseFloat`/`parseInt` manuels et casts `as` non sécurisés
- Build vérifié : 0 erreur

### Point 3 — Tests Unitaires (terminé)

- Vitest installé et configuré
- 61 tests couvrant :
  - `definitions.ts` : safeFloat, calculateListTotal, calculateFutureValue, formatCurrency
  - `engine.ts` : calculateMonthlyEffort, analyzeGoalStrategies, distributeGoals, computeFinancialPlan, simulateGoalScenario, analyzeProfileHealth
- Tests avec `vi.useFakeTimers()` pour le déterminisme des calculs basés sur les dates

---

## 5. Plan des 4 Phases — Roadmap Production

### Phase 1 — STABILISER (priorité immédiate)

**Objectif** : retirer les "flags de triche" et rendre le build TypeScript strict.

| Tâche | Statut | Détail |
|-------|--------|--------|
| Définir `Purchase` & `AnalysisResult` dans definitions.ts | Terminé | Types fantômes importés dans scenarios.ts mais jamais définis |
| Supprimer `ignoreBuildErrors` + `ignoreDuringBuilds` | Terminé | next.config.js — les deux flags supprimés, build exposé aux erreurs TS/ESLint |
| Typer `simulateGoalScenario` (éliminer les `any`) | Terminé | Types `GoalScenarioInput`, `GoalScenarioContext`, `GoalScenarioResult` créés via `Pick<Goal, ...>` et `Pick<SimulationResult['budget'], ...>`. 0 `any` restant dans la signature. |
| Compléter `DeepAnalysis` et `OptimizationOpportunity` | Terminé | `ratios`, `projections` ajoutés à `DeepAnalysis`. `guide` (`ActionGuide`) et `link` ajoutés à `OptimizationOpportunity`. `ActionGuide` extrait de engine.ts vers definitions.ts. 61 tests verts. |
| Compléter `SimulationResult['budget']` | Terminé | `BudgetResult` (25 champs) + `GoalAllocation` extraits. `allocations: any[]` → `GoalAllocation[]`, `usedRates: any` → `Record<string, number>`. 0 `any` restant dans `SimulationResult`. 61 tests verts. |
| Éliminer les `any` dans les pages | Terminé | 23 `any` éliminés dans simulator (7), goals (12), dashboard (4). Types créés : `AnalysisTip`, `AnalysisIssue`, `GoalProjectionPoint`, `GoalFormData`, `ContextToggleProps`, `GlassCardProps`, `SafeToSpendGaugeProps`. 61 tests verts. |
| Supprimer les `@ts-ignore` | Terminé | 3 occurrences corrigées : `PURCHASE_TYPES` typé en `Record<PurchaseType, ...>`, accès indexés sécurisés avec `in` guard dans simulator et goals. 0 `@ts-ignore` restant. 61 tests verts. |
| Ajouter Error Boundary global | Terminé | `global-error.tsx` (root layout), `error.tsx` (routes), `ErrorBoundary.tsx` (composant réutilisable par section). 61 tests verts. |
| Fixer `useGoalManager.ts` | Terminé | `saveProfile` remplacé par `updateProfileInfo` + `saveGoal` (opérations atomiques existantes dans useFinancialData). 61 tests verts. |

**Critère de réussite** : `next build` passe sans aucun flag d'ignore, 0 erreur TypeScript.

### Phase 2 — DÉCOUPLER (après Phase 1)

**Objectif** : séparer les responsabilités pour pouvoir évoluer.

| Tâche | Statut | Impact |
|-------|--------|--------|
| Créer une couche service (`app/services/`) | Terminé | Découple les routes API de Prisma. Permet d'ajouter cache, events, rate limiting sans toucher chaque route. 7 fichiers service créés (`errors`, `profileService`, `userService`, `itemService`, `assetService`, `goalService`, `decisionService` + barrel `index.ts`). 10 routes API refactorées. 61 tests verts. |
| Séparer `Profile` en `ProfileDB` + `ProfileUI` | Terminé | `ProfileDB` (shape DB validable Zod) + `ProfileUI extends ProfileDB` (dérivés UI) + alias `Profile = ProfileUI` backward-compatible. 61 tests verts. |
| Migrer `Float` → `Decimal` dans le schéma Prisma | Terminé | 12 champs migrés (`@db.Decimal(12,2)` montants, `@db.Decimal(5,2)` taux). Type utilitaire `SerializedDecimal<T>` + helper `serializeDecimals()` dans definitions.ts. `safeFloat` gère `Prisma.Decimal`. Service layer sérialisé. 61 tests verts. |
| Ajouter pagination + index manquants | | Index sur `FinancialGoal.deadline`, `PurchaseDecision.date`. Pagination cursor-based sur les décisions |
| Stratégie de rétention `AssetHistory` | | Agrégation mensuelle après 1 an, sinon croissance illimitée |

### Phase 3 — ACCÉLÉRER (après Phase 2)

**Objectif** : exploiter le SSR de Next.js et rendre le moteur proactif.

| Tâche | Impact |
|-------|--------|
| Passer les pages en Server Components + Client Islands | SSR pour le premier rendu (plus de flash blanc), moins de JS envoyé |
| Ajouter du cache (React `cache` + revalidation) | Évite de recalculer le plan financier à chaque navigation |
| Créer le moteur proactif (`app/lib/proactive.ts`) | Détection de dérive, alertes calendaires, milestones automatiques |
| Exploiter `AssetHistory` pour les tendances | Courbes d'évolution du patrimoine dans le temps (le trésor dormant) |

#### Architecture Proactive-First proposée

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TRIGGERS    │ ──► │  ANALYSIS ENGINE  │ ──► │  ACTIONS         │
│              │     │                  │     │                 │
│ • Cron daily │     │ • detectDanger() │     │ • Store insight │
│ • User login │     │ • detectOpps()   │     │ • Flag for UI   │
│ • Data write │     │ • detectDrift()  │     │ • Queue notif   │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

Trois nouvelles capacités :
1. **Détection de dérive** — Comparer le solde réel vs la projection et alerter si écart > 30%
2. **Alertes calendaires** — "Dans 5 jours, 3 prélèvements pour 850€. Solde projeté : 210€."
3. **Milestones** — "Ton matelas dépasse 3 mois. Tu passes au niveau Sécurisé."

### Phase 4 — SCALER (ongoing)

**Objectif** : monitoring, sécurité durcie, et ouvertures futures.

| Tâche | Impact |
|-------|--------|
| Monitoring (Sentry + structured logging) | En prod, on est actuellement aveugle |
| Rate limiting + security headers | Protection contre le spam API et les attaques |
| Soft-delete + audit trail | Les suppressions sont actuellement définitives et irréversibles |
| `.env.example` documenté | Aucun nouveau dev ne sait quelles variables sont nécessaires |
| Open Banking API (optionnel) | Game-changer : connexion aux comptes bancaires réels |

---

## 6. Principes de Développement

### Règles non négociables

1. **Le Docteur ne ment jamais** — Les formules de `engine.ts` sont couvertes par des tests. Aucun refactoring du moteur sans test vert.
2. **Zod en entrée, Prisma en sortie** — Toute donnée qui entre dans le système passe par un schéma Zod. Toute donnée qui sort passe par Prisma (pas de SQL brut).
3. **La hiérarchie des portes** — Survie > Sécurité > Croissance. Ne jamais recommander un investissement à quelqu'un en déficit structurel.
4. **Pas de `any` dans `app/lib/`** — Le moteur est le cerveau. Il doit être strictement typé.
5. **Les flags de triche sont interdits** — `ignoreBuildErrors` et `ignoreDuringBuilds` ne doivent jamais revenir dans `next.config.js`.

### Conventions de code

- **Tests** : `npm test` (Vitest). Les tests sont dans `__tests__/lib/`.
- **Validation** : Les schémas Zod sont dans `app/lib/validations.ts`.
- **Types** : Source de vérité dans `app/lib/definitions.ts`, miroir des enums Prisma.
- **Alias** : `@/` pointe vers la racine du projet (tsconfig paths).

---

## 7. Schéma Base de Données (Résumé)

```
User (Clerk ID) ──1:1── FinancialProfile
                              ├── N × FinancialItem   (revenus, charges, crédits, abos)
                              ├── N × Asset            (patrimoine : CC, livrets, PEA, crypto...)
                              │     └── N × AssetHistory (snapshots de valeur)
                              ├── N × FinancialGoal    (objectifs avec deadline et rendement)
                              └── N × PurchaseDecision (historique des achats simulés)
```

**Points d'attention** :
- `onDelete: Cascade` partout — pas de données orphelines
- `@@index` sur `profileId` pour toutes les tables enfants
- `AssetHistory` a un index composite `[assetId, date]`
- Les montants sont en `Decimal` (`@db.Decimal(12,2)` pour les montants, `@db.Decimal(5,2)` pour les taux)

Principe de résilience : Toute erreur dans le moteur de calcul doit être interceptée par une Error Boundary. L'utilisateur ne doit jamais voir un écran blanc, mais un message pédagogique.
