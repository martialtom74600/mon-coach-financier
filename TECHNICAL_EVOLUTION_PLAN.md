# Plan d'Évolution Technique — Mon Coach Financier

> Audit réalisé le 9 mars 2026 par analyse statique exhaustive de l'intégralité du répertoire.
> Ce document est auto-suffisant : chaque étape contient le Quoi, le Pourquoi, et l'Impact.

---

## Table des Matières

1. [Synthèse de l'Audit](#1-synthèse-de-laudit)
2. [Déduction de l'Intention](#2-déduction-de-lintention)
3. [Analyse de la Force du Code](#3-analyse-de-la-force-du-code)
4. [Diagnostic de Robustesse](#4-diagnostic-de-robustesse)
5. [Roadmap d'Évolution](#5-roadmap-dévolution)

---

## 1. Synthèse de l'Audit

### Inventaire

| Catégorie | Fichiers | Lignes (approx.) |
|-----------|----------|-------------------|
| Moteur (`app/lib/`) | 5 fichiers (definitions, engine, scenarios, validations, prisma) | ~1 620 |
| Services (`app/services/`) | 8 fichiers | ~430 |
| Routes API (`app/api/`) | 10 fichiers | ~310 |
| Pages (`app/`) | 5 pages + 2 error boundaries | ~2 145 |
| Composants (`app/components/`) | ~12 fichiers | ~1 350 |
| Hooks (`app/hooks/`) | 2 fichiers | ~262 |
| Tests (`__tests__/`) | 2 fichiers | ~871 |
| Configuration | 5 fichiers (next, ts, vitest, package, prisma) | ~310 |
| **Total** | **~49 fichiers** | **~7 300 lignes** |

### Verdict Global

Le socle est **remarquablement structuré pour un MVP** : typage strict, validation Zod complète, couche service découplée, 61 tests sur le moteur, schéma Prisma propre avec Decimal. La dette technique est concentrée dans trois zones : le frontend (100% CSR, pages monolithiques), les fonctions fantômes du moteur (projections vides, FIRE non calculé), et l'absence totale de monitoring en production.

---

## 2. Déduction de l'Intention

### Ce que le code résout techniquement

En analysant exclusivement la structure des types (`definitions.ts` : 466 lignes, 30+ types), le schéma relationnel (`schema.prisma` : 248 lignes, 7 modèles, 8 enums) et la complexité algorithmique (`engine.ts` : 540 lignes + `scenarios.ts` : 385 lignes), voici la reconstruction de l'objectif :

**L'application modélise l'intégralité de la vie financière d'un individu français et exécute un moteur de simulation déterministe à trois étages.**

#### Étage 1 — Modélisation du flux monétaire (`computeFinancialPlan`, engine.ts:261-325)

Le système agrège 6 catégories de flux (`ItemCategory` enum) en un budget mensuel unifié. Il distingue les charges obligatoires (fixes + variables + crédits + abonnements) des charges discrétionnaires (`funBudget`), puis calcule la capacité d'épargne résiduelle. C'est un **simulateur de trésorerie statique**.

#### Étage 2 — Allocation d'objectifs sous contrainte (`distributeGoals`, engine.ts:242-255)

Les objectifs financiers (8 catégories : `GoalCategory` enum) sont triés par priorité (Urgence > Immobilier > Autres > Retraite) et alimentés séquentiellement depuis la capacité disponible. L'algorithme est glouton (*greedy*) : il remplit chaque objectif jusqu'à saturation avant de passer au suivant. C'est un **optimiseur de budget par allocation prioritaire**.

#### Étage 3 — Diagnostic comportemental (`analyzeProfileHealth`, engine.ts:347-539)

Un système de portes conditionnelles (Survie → Sécurité → Croissance) analyse le patrimoine de l'utilisateur et produit des recommandations contextuelles parmi 16 guides d'action prédéfinis. La logique est celle d'un **système expert à règles** : si le matelas < seuil ET pas de Livret A → recommander l'ouverture. Si l'âge > 25 ET investissement < 1000€ ET épargne > 3000€ → signaler un retard d'investissement.

#### Module transversal — Projection de trésorerie (`generateTimeline`, scenarios.ts:105-278)

Un simulateur jour par jour sur 730 jours qui intègre les récurrences calendaires (salaires, prélèvements), les dépenses variables lissées par jour de semaine (pondération dimanche=2.3x, mardi=0.6x), et les événements ponctuels (achats simulés, crédits). C'est un **moteur de projection de cashflow forward-looking**.

### La proposition technique unique

Ce n'est pas un agrégateur bancaire (pas de connexion aux comptes), ni un robo-advisor (pas de gestion automatisée), ni un simple budget tracker (il va au-delà de la catégorisation). C'est un **moteur de décision financière personnelle** qui combine modélisation budgétaire, optimisation d'allocation, et système de recommandation contextualisé — le tout exécuté intégralement côté client en JavaScript.

---

## 3. Analyse de la Force du Code

### 3.1 Segments Avancés (Points Forts)

#### A. Le système de portes hiérarchiques (`engine.ts:364-376`)

```
if (endOfMonthBalance < 0) {
    if (rawCapacity < 0) → DANGER (score 10, early return)
    else → SURCHAUFFE (score 30, early return)
}
```

Le *early return* sur les états critiques est une excellente pratique. Le moteur ne propose jamais d'investissement à quelqu'un en déficit structurel. Cette hiérarchie est le contrat fondamental du produit et elle est correctement implémentée.

#### B. Le type utilitaire `SerializedDecimal<T>` (`definitions.ts:23-29`)

```typescript
type SerializedDecimal<T> = {
  [K in keyof T]: T[K] extends Prisma.Decimal ? number
    : T[K] extends Prisma.Decimal | null ? number | null
    : T[K];
};
```

Ce type mappé résout élégamment le problème de la frontière Prisma/Application en convertissant automatiquement tous les champs `Decimal` d'un type Prisma en `number`. C'est du TypeScript avancé correctement appliqué.

#### C. La timeline avec pondération par jour de semaine (`scenarios.ts:50-51, 236-239`)

```typescript
const SPENDING_WEIGHTS = [ 1.3, 0.6, 0.6, 0.6, 0.6, 1.0, 2.3 ]; // Dim→Sam
```

Le lissage des dépenses variables par jour de semaine est un modèle comportemental réaliste. Le dimanche (1.3x) et le samedi (2.3x) reflètent les habitudes de consommation françaises. C'est une attention au détail qui différencie ce moteur d'un simple calcul `montant_mensuel / 30`.

#### D. Le hasAsset intelligent (`engine.ts:179-197`)

La double vérification (enum strict + mapping catégoriel) permet au moteur de recommandations de fonctionner même si les données utilisateur ne sont pas parfaitement normalisées. C'est un pattern défensif bien pensé.

#### E. La couche de validation Zod (`validations.ts`, 216 lignes)

12 schémas couvrant toutes les routes API, avec coercion de types (`z.coerce.number()`, `z.coerce.date()`), enums miroir Prisma, et un helper `validationError()` centralisé. L'architecture `safeParse → 400 si échec → service si succès` est propre.

#### F. La couche service avec ownership check (`services/*.ts`)

Pattern `findOwnedItem(profileId, itemId)` avant chaque update/delete. L'autorisation est vérifiée au niveau service, pas au niveau route. C'est la bonne couche pour cette responsabilité.

---

### 3.2 Segments Sous-Exploités ou Limités

#### A. `simulateGoalScenario` — Projection vide (`engine.ts:327-341`)

**Constat** : La fonction retourne systématiquement `{ projection: [], summary: { finalAmount: 0, totalInterests: 0, totalPocket: 0 } }`.

```typescript
// engine.ts:340
return { tempGoal, monthlyEffort: effort, projectionData: { projection: [], summary: { finalAmount: 0, totalInterests: 0, totalPocket: 0 } }, diagnosis };
```

Le type `GoalScenarioResult` (definitions.ts:185-193) promet une projection avec `GoalProjectionPoint[]` (date, balance, contributed), mais la donnée n'est jamais calculée. Le graphique de projection dans la page goals dépend de cette donnée. **Impact** : le simulateur d'objectif affiche un diagnostic textuel correct mais aucune courbe de projection.

#### B. FIRE Year — Jamais calculé (`engine.ts:534`)

```typescript
// engine.ts:530-534
projections: { wealth10y, wealth20y, fireYear: 99 }
```

`fireYear` (Financial Independence, Retire Early) est hardcodé à 99 alors que toutes les données nécessaires au calcul sont disponibles : patrimoine total, capacité d'épargne mensuelle, taux de rendement moyen. La formule standard (`25 × dépenses annuelles / patrimoine`) pourrait être appliquée trivialement.

#### C. Tax Brackets — Définis mais jamais utilisés (`engine.ts:36-41`)

```typescript
TAX_BRACKETS: [
    { t: 11294, r: 0.11 }, { t: 28797, r: 0.30 },
    { t: 82341, r: 0.41 }, { t: 177106, r: 0.45 }
]
```

Ces tranches d'imposition sont correctes pour 2025 mais ne sont jamais référencées dans aucun calcul. Elles pourraient alimenter le calcul du gain fiscal PER (déduction du revenu imposable) ou l'estimation de l'impôt net.

#### D. `analyzePurchaseImpact` — Issues et tips vides (`scenarios.ts:384`)

```typescript
return { ..., issues: [], tips: [], ... };
```

Le type `AnalysisResult` (definitions.ts:220-239) définit `issues: AnalysisIssue[]` et `tips: AnalysisTip[]` avec des niveaux de sévérité (`'red' | 'orange'`). Mais la fonction retourne toujours des tableaux vides. Le système de feedback détaillé est **architecturalement prévu mais jamais implémenté**.

#### E. `securityBuffer` et `availableForProjects` — Hardcodés à 0 (`engine.ts:321`)

```typescript
securityBuffer: 0, availableForProjects: 0,
```

Ces deux KPIs critiques du `BudgetResult` sont toujours 0, alors que `simulateGoalScenario` (engine.ts:337-338) les utilise comme contexte pour le diagnostic des objectifs. Le `availableForProjects` devrait être `netCashflow - totalAllocated` et le `securityBuffer` devrait refléter la marge entre le matelas actuel et l'idéal.

#### F. Formule de crédit inexacte (`scenarios.ts:90, 324`)

```typescript
const totalPaid = amount * (1 + (rate / 100) * (months / 12));
```

C'est un calcul d'intérêts simples. Un crédit amortissable réel utilise la formule d'annuité constante : `PMT = P × r(1+r)^n / ((1+r)^n - 1)`. L'écart est significatif : pour un crédit de 10 000€ à 5% sur 48 mois, la formule actuelle donne 11 666€ total, la formule correcte donne 10 908€. **Erreur de +7%** sur le coût affiché à l'utilisateur.

#### G. `AssetHistory` — Schéma riche, exploitation nulle

Le modèle `AssetHistory` avec son index composite `[assetId, date]` est prêt pour tracer des courbes d'évolution du patrimoine. `assetService.ts:42-47` crée correctement un snapshot quand la valeur change. Mais aucune page, aucun composant, aucune requête ne lit jamais ces données.

#### H. History stats toujours à 0 (`history/page.tsx`)

`stats.accepted` et `stats.rejected` sont toujours 0. Le modèle `PurchaseDecision` n'a pas de champ `verdict` ou `outcome`. Le suivi des décisions est un journal sans analyse rétrospective.

---

## 4. Diagnostic de Robustesse

### 4.1 Performance

| Risque | Fichier:Ligne | Sévérité | Description |
|--------|---------------|----------|-------------|
| 100% CSR | Toutes les pages | **ÉLEVÉE** | Les 5 pages sont en `'use client'`. Aucune exploitation du SSR de Next.js. Le premier rendu nécessite le téléchargement de tout le JS, l'exécution du hook `useFinancialData`, un fetch API, puis le calcul du moteur. Sur mobile 3G, c'est > 3 secondes de flash blanc. |
| Full refetch après chaque mutation | `hooks/useFinancialData.ts:~120-200` | **ÉLEVÉE** | Chaque `saveItem`, `saveGoal`, `addDecision` déclenche `fetchData()` qui recharge l'intégralité du profil (items, assets, goals, decisions). Pour un profil avec 50 items et 10 goals, c'est ~5KB rechargé pour un changement de 50 octets. |
| Cache-busting systématique | `hooks/useFinancialData.ts` | **MOYENNE** | `?t=${Date.now()}` sur chaque fetch empêche tout cache HTTP, CDN, ou navigateur. |
| Timeline 730 jours côté client | `scenarios.ts:109` | **MOYENNE** | La boucle de 730 itérations avec lookup de Map à chaque jour est O(n) mais le coefficient est élevé (events, recurring, one-off). Sur un profil complexe, ça peut dépasser 50ms et bloquer le main thread. |
| Sankey diagram | `components/FinancialSankey.tsx` | **FAIBLE** | Nivo ResponsiveSankey peut être CPU-heavy sur mobile avec beaucoup de nœuds. |

### 4.2 Précision Monétaire

| Risque | Fichier:Ligne | Sévérité | Description |
|--------|---------------|----------|-------------|
| Decimal → float à la frontière | `definitions.ts:34` | **ÉLEVÉE** | `serializeDecimals` convertit `Prisma.Decimal.toNumber()`. Toute la précision `Decimal(12,2)` gagnée en BDD est perdue dès le passage en JS `number` (IEEE 754). Pour des patrimoines > 1M€, les erreurs d'arrondi deviennent visibles. |
| `safeFloat` avec parseFloat | `definitions.ts:438` | **MOYENNE** | `parseFloat(clean)` sur des strings monétaires peut introduire des erreurs. Ex: `parseFloat("999999.99")` est exact, mais `parseFloat("9999999999.99")` = `9999999999.99` OK en float, mais `parseFloat("99999999999.99")` commence à perdre des centimes. |
| Formule de crédit inexacte | `scenarios.ts:90` | **ÉLEVÉE** | Intérêts simples au lieu d'annuités constantes. Erreur de +7% sur un crédit 48 mois à 5%. L'utilisateur prend des décisions financières sur des chiffres faux. |
| `round()` à 2 décimales | `scenarios.ts:53` | **FAIBLE** | `Math.round((num + Number.EPSILON) * 100) / 100` est correct pour l'arrondi mais n'empêche pas l'accumulation d'erreurs dans les boucles (730 itérations de timeline). |

### 4.3 Sécurité des Flux

| Risque | Fichier:Ligne | Sévérité | Description |
|--------|---------------|----------|-------------|
| Aucun rate limiting | Toutes les routes API | **ÉLEVÉE** | Un script peut envoyer 10 000 requêtes/seconde à `/api/items`. Pas de protection au niveau Next.js ou middleware. |
| Pas de validation d'ID | Routes `[id]/route.ts` | **MOYENNE** | `params.id` est utilisé directement dans les requêtes Prisma sans vérification de format (CUID attendu). Un ID invalide produit une erreur Prisma brute qui peut leaker des informations de schéma. |
| Fallback "no-email" | `services/userService.ts:34` | **MOYENNE** | `emailAddresses[0]?.emailAddress \|\| "no-email"` viole la contrainte `@unique` si deux utilisateurs n'ont pas d'email. Crash Prisma P2002 en production. |
| `profileService.updateProfile` sans existence check | `services/profileService.ts:18-21` | **MOYENNE** | L'absence de vérification d'existence produit un `RecordNotFoundError` Prisma non converti en `ServiceError`, qui fuit comme une 500 avec stack trace potentielle. |
| `userService.getFullUserProfile` retourne null comme 200 | `services/userService.ts:12-91` | **FAIBLE** | Le client reçoit `null` avec un status 200 au lieu d'un 404 structuré. Pas une faille de sécurité mais un contrat d'API cassé. |
| `any` dans le moteur critique | `scenarios.ts:60,107,285` | **MOYENNE** | `getSimulatedEvents` retourne `any[]`, `generateTimeline` accepte `history: any[]`, `analyzePurchaseImpact` accepte `currentStats: any`. Toute valeur peut entrer sans validation dans le moteur de projection. |
| Pas de headers de sécurité | `next.config.js` | **MOYENNE** | Aucun `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` configuré. Le PWA est vulnérable au clickjacking et à l'injection de scripts tiers. |
| Pas de monitoring | Production | **ÉLEVÉE** | Aucun Sentry, aucun structured logging. En production, les erreurs sont invisibles. Les `console.error` dans les routes API ne persistent nulle part. |

### 4.4 Architecture Frontend

| Risque | Fichier | Sévérité | Description |
|--------|---------|----------|-------------|
| Pages monolithiques | `profile/page.tsx` (643 lignes), `page.tsx` (419 lignes), `goals/page.tsx` (428 lignes) | **MOYENNE** | Mélange de layout, logique, et UI dans un seul fichier. Difficile à tester, à reviewer, et à maintenir. |
| `alert()` / `confirm()` | `goals/page.tsx`, `simulator/page.tsx`, `history/page.tsx` | **FAIBLE** | Bloquent le thread, non-stylisables, incompatibles avec le PWA feel. |
| `window.location.href = '/'` | `profile/page.tsx` | **FAIBLE** | Full reload après sauvegarde du profil au lieu de navigation client. Perte de tout l'état en mémoire. |
| Composants dupliqués | `Badge` dans `page.tsx` (inline) vs `components/ui/Badge.tsx` | **FAIBLE** | Deux implémentations avec des APIs différentes. |

---

## 5. Roadmap d'Évolution

### Philosophie

Chaque étape est **atomique** : elle peut être livrée indépendamment, testée indépendamment, et revertée indépendamment. Les étapes sont ordonnées par **rapport impact/effort décroissant**.

---

### PHASE A — Corriger les Mensonges du Moteur

> Priorité : **CRITIQUE**. Le moteur affiche des chiffres faux à l'utilisateur.

#### A.0 — [TERMINÉ] ~~[CRITIQUE] Fixer le mapping `savingsContributions` (Bug silencieux)~~

> Ajouté par l'audit de révision du 9 mars 2026. Bug non détecté lors de l'audit initial.

- **Quoi** : Corriger le mapping de champs entre `Asset` (Prisma) et `savingsContributions` (ProfileUI) dans `userService.ts:85`.
- **Pourquoi** : `getFullUserProfile` injecte des objets `Asset` bruts (champs `monthlyFlow`, `transferDay`) dans `savingsContributions`, mais le type `ProfileUI` et **tout le moteur** attendent `{ amount, dayOfMonth }`. Résultat : `safeFloat(item.amount)` reçoit `undefined` → retourne `0` → **toute l'épargne programmée est invisible**.
- **Conséquence** : `manualSavings = 0` toujours. En cascade :
  - `endOfMonthBalance` et `netCashflow` sont **surévalués** du montant total des virements automatiques.
  - `remainingToLive` est surévalué (l'utilisateur croit avoir plus d'argent qu'en réalité).
  - La timeline (`scenarios.ts:150-157`) ne génère **aucun événement** d'épargne (le `if(amount > 0)` ne passe jamais).
  - Toutes les recommandations et diagnostics d'objectifs sont faussés en aval.
  - Le bug est **100% silencieux** : pas d'erreur, pas de `NaN`, pas de crash. TypeScript ne le détecte pas car la donnée transite via JSON (fetch API).
- **Implémentation** :
  ```typescript
  // userService.ts:85 — Remplacer :
  savingsContributions: assets.filter((a) => a.monthlyFlow > 0),
  // Par :
  savingsContributions: assets
    .filter((a) => a.monthlyFlow > 0)
    .map((a) => ({ id: a.id, name: a.name, amount: a.monthlyFlow, dayOfMonth: a.transferDay })),
  ```
- **Impact** : `userService.ts:85` (1 ligne). Corrige instantanément tous les calculs en aval sans toucher au moteur.
- **Fichiers touchés** : `services/userService.ts`.
- **Tests** : Ajouter un test vérifiant que `savingsContributions` retourne bien `{ amount, dayOfMonth }` et non `{ monthlyFlow, transferDay }`.

#### A.1 — [TERMINÉ] ~~Corriger la formule de crédit~~

- **Quoi** : Remplacer le calcul d'intérêts simples par la formule d'annuité constante dans `scenarios.ts:90` et `scenarios.ts:324`.
- **Pourquoi** : L'erreur atteint +7% sur un crédit standard. L'utilisateur prend des décisions d'achat sur des données fausses. C'est la pire dette technique du projet car elle affecte la **confiance** dans le produit.
- **Formule correcte** :
  ```
  PMT = P × r(1+r)^n / ((1+r)^n - 1)
  avec r = taux_annuel / 12, n = nombre_de_mois, P = capital emprunté
  ```
- **Impact** : `scenarios.ts` (2 lignes), tests à ajouter pour `getSimulatedEvents` avec CREDIT mode.
- **Fichiers touchés** : `scenarios.ts:90`, `scenarios.ts:324`.
- **Tests** : Ajouter un test vérifiant que 10 000€ à 5% sur 48 mois = ~10 908€ total (et non 11 666€).

#### A.2 — [TERMINÉ] ~~Implémenter `securityBuffer` et `availableForProjects`~~

- **Quoi** : Calculer réellement ces deux KPIs dans `computeFinancialPlan` au lieu de les hardcoder à 0.
- **Pourquoi** : `simulateGoalScenario` (engine.ts:337-338) utilise `context.availableForProjects` comme `capacity` dans `analyzeGoalStrategies`. Avec `capacity = 0`, `gap = effort - 0 = effort`, donc tous les objectifs sont diagnostiqués comme **HARD** (pas IMPOSSIBLE — cette condition nécessite `effort > income`). Concrètement, chaque objectif affiche "Manque X€/mois" où X = 100% de l'effort requis, rendant tous les diagnostics artificiellement pessimistes.
- **Implémentation** :
  ```
  availableForProjects = Math.max(0, netCashflow - totalAllocated)
  securityBuffer = matelas - idealSafety (peut être négatif)
  ```
- **Impact** : `engine.ts:321` (2 champs), la page goals affichera des diagnostics plus réalistes.
- **Fichiers touchés** : `engine.ts:321`.

#### A.3 — [TERMINÉ] ~~Implémenter les projections dans `simulateGoalScenario`~~

- **Quoi** : Calculer la courbe de projection `GoalProjectionPoint[]` au lieu de retourner un tableau vide.
- **Pourquoi** : Le type promet des données de projection. La page goals a déjà le code pour afficher un graphique Recharts. La donnée manque.
- **Implémentation** : Boucle mois par mois depuis `currentSaved` avec ajout de `monthlyEffort` et intérêts composés si `isInvested`.
- **Impact** : `engine.ts:340`, `definitions.ts:179-183` (types déjà corrects). La page goals affichera une courbe de croissance.
- **Fichiers touchés** : `engine.ts:327-341`.

#### A.4 — [TERMINÉ] ~~Implémenter `issues` et `tips` dans `analyzePurchaseImpact`~~

- **Quoi** : Générer des alertes et conseils contextuels dans le simulateur d'achat.
- **Pourquoi** : Les types `AnalysisIssue` et `AnalysisTip` existent (definitions.ts:211-218) mais ne sont jamais peuplés. Le simulateur affiche un verdict binaire (vert/orange/rouge) sans explication.
- **Implémentation** : Après le calcul du verdict, ajouter des rules :
  - Si `newSafetyMonths < 3` → issue red "Matelas en danger"
  - Si `creditCost > amount * 0.10` → issue orange "Coût du crédit élevé"
  - Si `opportunityCost > amount` → tip "Cet argent investi vaudrait X dans 10 ans"
  - Si `isReimbursable` → tip "Pensez à suivre le remboursement"
- **Impact** : `scenarios.ts:368-384`. Le simulateur deviendra réellement pédagogique.
- **Fichiers touchés** : `scenarios.ts`.

#### A.5 — [TERMINÉ] ~~Calculer `fireYear`~~

- **Quoi** : Remplacer `fireYear: 99` par le calcul réel du nombre d'années avant l'indépendance financière.
- **Pourquoi** : C'est un KPI motivationnel puissant. Toutes les données sont disponibles.
- **Formule** : `fireYear = log((dépenses_annuelles / SWR + patrimoine) / (patrimoine + épargne_mensuelle * 12)) / log(1 + rendement) ` avec SWR = 4%.
- **Impact** : `engine.ts:534`. Le dashboard pourra afficher "Indépendance financière dans X ans".
- **Fichiers touchés** : `engine.ts:530-534`.

#### A.6 — [TERMINÉ] ~~Fixer les ruptures de contrat API (Sankey, Savings, Housing, Timeline)~~

> Ajouté par l'audit de ruptures de contrat du 9 mars 2026.

- **Quoi** : Corriger 4 bugs de rupture de contrat entre le type `ProfileUI` et les données réellement retournées par `getFullUserProfile`.
- **Pourquoi** : TypeScript perd son pouvoir à la frontière JSON (`fetch → any`). Le type `ProfileUI` promet des champs que l'API ne remplissait jamais. Ces bugs sont **100% silencieux** (pas de crash, pas de NaN — juste des `0` ou `undefined` interprétés comme valeurs valides).
- **Bugs corrigés** :
  1. **`FinancialSankey.tsx:222,238`** — Utilisait `cred.monthlyPayment` (inexistant) au lieu de `cred.amount`. Les crédits étaient **invisibles** dans le diagramme Sankey. → Remplacé par `cred.amount`.
  2. **`useGoalManager.ts:24`** — Lisait `profile.savings` (jamais calculé par l'API) pour la stratégie "Apport". `safeFloat(undefined)` = 0, puis `updateProfileInfo({ savings: 0 })` **écrasait l'épargne à 0** en BDD. → Ajouté le calcul de `savings` et `investedAmount` dans `userService.ts`.
  3. **`engine.ts:548`** — `profile.housing?.status.includes('OWNER')` crashait si `status` était `null` (profil incomplet). → Ajouté un optional chaining : `status?.includes(...)`.
  4. **`userService.ts:98`** — Retournait `user.updatedAt` (record User Prisma) au lieu de `p.updatedAt` (profil financier). L'ancre de la timeline pouvait être décalée si Clerk mettait à jour le User sans changement financier. → Corrigé vers `p.updatedAt`.
- **Fichiers touchés** : `userService.ts`, `engine.ts:548`, `FinancialSankey.tsx:222,238`.
- **Leçon** : Tout champ du type `ProfileUI` qui n'est pas explicitement retourné par `getFullUserProfile` est un bug en attente. La Phase B (élimination des `any`) réduira ce risque en rendant les accès vérifiables à la compilation.

#### A.7 — [TERMINÉ - ARMORED] ~~Implémentation du Bouclier Zod Ultime (End-to-End Validation)~~

> Ajouté le 9 mars 2026. Renforcé le 9 mars 2026 — Bouclier Zod Ultime déployé sur **tous** les fetchs.

- **Quoi** : Valider strictement avec Zod **toutes les réponses API** au moment du fetch côté client, au lieu de faire confiance aveuglément au JSON reçu du réseau.
- **Pourquoi** : `res.json()` retourne `any`. TypeScript est aveugle à la frontière réseau. Un champ manquant, un type changé, ou une réponse partielle traversent sans erreur et produisent des calculs faussés silencieusement (`NaN`, `undefined` interprétés comme `0`, etc.). Le Bouclier Zod intercepte ces ruptures de contrat **avant** qu'elles n'atteignent le moteur de calcul.
- **Implémentation (ARMORED)** :
  1. **Schémas Response** : `financialItemResponseSchema`, `assetResponseSchema`, `financialGoalResponseSchema`, `purchaseDecisionResponseSchema`, `profileAPIResponseSchema`, `profilePatchResponseSchema`, `successResponseSchema`.
  2. **parseAPIResponse()** sur **chaque** fetch dans `useFinancialData.ts` : GET /api/user, POST /api/items, PATCH /api/profile, saveAsset (POST/PATCH), deleteAsset, saveGoal (POST/PATCH), deleteGoal, addDecision, deleteDecision, deleteItem.
  3. **Routes API** : Validation `req.json()` déjà en place (createAssetSchema, updateAssetSchema, createGoalSchema, etc.).
  4. **Tests adverses** : `validations.test.ts` — amount string, type invalide, success: false — le bouclier intercepte.
- **Fichiers touchés** : `app/lib/validations.ts`, `app/hooks/useFinancialData.ts`, `__tests__/lib/validations.test.ts`.
- **Tests** : 95/95 passés — Bouclier vérifié par données corrompues.

---

### PHASE B — Éliminer les `any` du Moteur de Projection

> Priorité : **HAUTE**. Les fonctions les plus critiques pour l'utilisateur acceptent n'importe quoi.

#### B.1 — [TERMINÉ] ~~Typer `getSimulatedEvents`~~

- **Quoi** : Remplacer `const events: any[]` par `TimelineEvent[]` dans `scenarios.ts:60`.
- **Pourquoi** : Cette fonction génère les événements de crédit/split/achat qui alimentent la timeline. Le `any` permet de pousser des objets incomplets sans erreur de compilation.
- **Impact** : `scenarios.ts:60-99`. Nécessite de vérifier que tous les `events.push()` produisent des objets conformes à `TimelineEvent`.
- **Fichiers touchés** : `scenarios.ts`.

#### B.2 — [TERMINÉ] ~~Typer `generateTimeline`~~

- **Quoi** : Remplacer `history: any[]` par `PurchaseDecision[]` et `simulatedEvents: any[]` par `TimelineEvent[]` dans `scenarios.ts:106-109`.
- **Pourquoi** : La timeline est le cœur visuel de l'application (calendrier, projection). Des données malformées produisent des balances incohérentes sans erreur visible.
- **Impact** : `scenarios.ts:106-109`, `scenarios.ts:129,160`. Les `any` internes (`recurringByDay`, `oneOffEventsMap`) doivent aussi être typés.
- **Fichiers touchés** : `scenarios.ts`, potentiellement `hooks/useFinancialData.ts` (passage d'arguments).

#### B.3 — [TERMINÉ] ~~Typer `analyzePurchaseImpact`~~

- **Quoi** : Remplacer `currentStats: any` par `BudgetResult` dans `scenarios.ts:285`.
- **Pourquoi** : C'est la fonction qui dit à l'utilisateur "achète" ou "n'achète pas". Elle accède à `currentStats.matelas`, `currentStats.remainingToLive`, `currentStats.rules` — tous non vérifiés à la compilation.
- **Impact** : `scenarios.ts:285`. Le type `BudgetResult` existe déjà dans `definitions.ts:348-374`. Renommage du paramètre et ajout de l'import.
- **Fichiers touchés** : `scenarios.ts`, `simulator/page.tsx` (vérifier que l'appel passe le bon type).

#### B.4 — [TERMINÉ] ~~Typer les `any` restants dans les composants~~

- **Quoi** : Éliminer les `any` dans `FinancialSankey.tsx` (`profile: any`), `CalendarView.tsx` (`timeline: any[]`, `day: any`), `Header.tsx` (`pageContent: any`), `useFinancialData.ts` (`addDecision(decision: any)`).
- **Pourquoi** : Ces composants affichent des données financières. Un `any` qui change de shape silencieusement produit un `NaN` affiché à l'utilisateur.
- **Impact** : ~6 fichiers, remplacement par les types existants (`Profile`, `MonthData[]`, `PurchaseDecision`).
- **Fichiers touchés** : `FinancialSankey.tsx`, `CalendarView.tsx`, `Header.tsx`, `useFinancialData.ts`.

---

### PHASE C — Tests du Module Critique Non Couvert

> Priorité : **HAUTE**. `scenarios.ts` (385 lignes) est le fichier le plus complexe et n'a **aucun test**.

> **Audit QA 9 mars 2026** : Refonte intégrale selon le protocole "Blind & Logic". Tous les tests calculent la valeur attendue manuellement AVANT d'appeler la fonction. Invariants vérifiés : conservation de la masse, réalité du crédit (totalPaid = capital + intérêts), priorisation Urgence > Loisirs, zéro fuite (netCashflow = revenus - charges). Tests adverses : scénarios catastrophe, dates limites (1 mois, 360 mois, année bissextile), objets Zod corrompus.

#### C.1 — [TERMINÉ] [VÉRIFIÉ & ADVERSE] Tester `getSimulatedEvents`

- **Quoi** : Tests unitaires pour les 4 modes de paiement (CASH_CURRENT, CASH_SAVINGS, SPLIT, CREDIT).
- **Pourquoi** : Cette fonction génère les événements qui alimentent la projection de trésorerie. Un bug ici = des centaines de jours avec des balances fausses.
- **Cas de test** :
  - CASH_CURRENT : 1 événement, montant négatif
  - CASH_CURRENT + reimbursable : 2 événements (achat + remboursement J+30)
  - SPLIT 4x : 4 événements mensuels, somme = montant total
  - CREDIT 5% 48 mois : 48 événements, vérifier le total avec la formule correcte (après A.1)
  - CASH_SAVINGS : 0 événements (pas d'impact timeline)
- **Refonte 9 mars 2026** : Protocole Blind & Logic appliqué. Invariant crédit (totalPaid = capital + intérêts). Edge cases : annuité 1 mois, crédit 360 mois.
- **Fichiers touchés** : `__tests__/lib/scenarios.test.ts`.

#### C.2 — [TERMINÉ] [VÉRIFIÉ & ADVERSE] Tester `generateTimeline`

- **Quoi** : Tests de la boucle de projection jour par jour.
- **Pourquoi** : La timeline est le composant visuel principal. Un décalage d'un jour dans les récurrences fausse toute la projection.
- **Cas de test** :
  - Profil minimal : salaire le 1er, loyer le 5 → vérifier que le solde augmente le 1er et baisse le 5
  - Fin de mois : événement le 31 dans un mois de 28 jours → doit tomber le 28
  - Pondération variable : les samedis doivent avoir une dépense 2.3x supérieure à un mardi
  - Anchor point : les jours avant l'ancre doivent avoir `balance: null`
- **Refonte 9 mars 2026** : Protocole Blind & Logic. Edge case année bissextile (31 février → 28).
- **Fichiers touchés** : `__tests__/lib/scenarios.test.ts`.

#### C.3 — [TERMINÉ] [VÉRIFIÉ & ADVERSE] Tester `analyzePurchaseImpact`

- **Quoi** : Tests du verdict et des calculs de coûts.
- **Pourquoi** : C'est la décision binaire "achète / n'achète pas". Doit être déterministe et correct.
- **Cas de test** :
  - Achat cash OK → verdict green
  - Achat cash dépassant le matelas → verdict red, message "Fonds insuffisants"
  - Achat à crédit → vérifier `creditCost` et `realCost`
  - Achat remboursable → `realCost = 0`, `opportunityCost = 0`
  - Achat passé → verdict green "Mise à jour"
  - Cashflow danger → verdict orange "Attends un peu"
- **Refonte 9 mars 2026** : Protocole Blind & Logic. **Rupture de logique corrigée** : `isBudgetOk` pour CASH_SAVINGS utilisait `newMatelas >= 0` au lieu de `amount <= matelas` → retrait supérieur au matelas donnait verdict green au lieu de red. Corrigé dans `scenarios.ts:366`.
- **Fichiers touchés** : `__tests__/lib/scenarios.test.ts`, `app/lib/scenarios.ts`.

#### C.4 — [TERMINÉ - ARMORED] Tester les schémas Zod

- **Quoi** : Tests unitaires pour `validations.ts` — chaque schéma avec des entrées valides et invalides.
- **Pourquoi** : Les schémas Zod sont le **firewall** de l'application. Si un schéma est trop permissif, des données corrompues entrent en BDD. Si trop strict, l'utilisateur ne peut pas sauvegarder.
- **Refonte 9 mars 2026** : Tests adverses créés — objets corrompus (amount invalide, category invalide, type invalide, etc.) pour forcer l'échec de validation.
- **ARMORED 9 mars 2026** : Tests du Bouclier Response — `amount` string au lieu de number, `type` invalide, `success: false`, `profileAPIResponseSchema` avec assets corrompus. Vérification que `parseAPIResponse` retourne `null` et intercepte les données corrompues.
- **Fichiers touchés** : `__tests__/lib/validations.test.ts`.

---

### PHASE D — Exploiter le SSR de Next.js

> Priorité : **MOYENNE-HAUTE**. Impact direct sur la performance perçue.

#### D.1 — [TERMINÉ] Passer le dashboard en Server Component + Client Islands

- **Quoi** : Extraire les données du profil côté serveur dans `app/page.tsx`. Passer `profile` comme prop aux îlots clients (graphiques, jauges).
- **Pourquoi** : Le dashboard est la première page vue. En SSR, le HTML est généré côté serveur avec les données, envoyé au client en ~200ms. En CSR actuel, il faut ~1-3 secondes (download JS → fetch API → compute → render).
- **Implémentation** :
  1. Créer `app/page.tsx` comme Server Component async
  2. Appeler `getFullUserProfile()` directement (pas via fetch API)
  3. Passer `profile` en prop à un composant `<DashboardClient profile={profile} />`
  4. Déplacer `useMemo`/`useState` dans le composant client
- **Impact** : `app/page.tsx` (restructuration complète), `hooks/useFinancialData.ts` (le hook devient optionnel pour cette page).
- **Fichiers touchés** : `app/page.tsx`, nouveau `components/DashboardClient.tsx`.

#### D.2 — [TERMINÉ] Ajouter React `cache()` sur le profil

- **Quoi** : Wrapper `getFullUserProfile` avec `React.cache()` et `unstable_cache` de Next.js.
- **Pourquoi** : Le profil est lu à chaque navigation. Avec le cache, un seul appel DB par requête serveur, révalidé à la mutation.
- **Implémentation** :
  ```typescript
  const getCachedProfile = cache(async (userId: string) => {
    return getFullUserProfile(userId);
  });
  ```
  Revalidation via `revalidateTag('profile')` dans les routes de mutation.
- **Impact** : `services/userService.ts`, toutes les routes de mutation (ajout de `revalidateTag`).
- **Fichiers touchés** : `services/userService.ts`, `api/*/route.ts`.

#### D.3 — [TERMINÉ] Supprimer le cache-busting `?t=${Date.now()}`

- **Quoi** : Retirer le query param aléatoire des fetch client.
- **Pourquoi** : Avec le cache serveur en place (D.2), le cache-busting côté client devient inutile et contre-productif.
- **Impact** : `hooks/useFinancialData.ts`.
- **Fichiers touchés** : `hooks/useFinancialData.ts`.

---

### PHASE E — Sécuriser pour la Production

> Priorité : **HAUTE** pour un déploiement réel.

#### E.1 — Ajouter le rate limiting

- **Quoi** : Implémenter un rate limiter sur toutes les routes API.
- **Pourquoi** : Sans rate limiting, un script automatisé peut saturer la DB Prisma/PostgreSQL.
- **Implémentation** : Utiliser `@upstash/ratelimit` avec Redis (Vercel KV) ou un rate limiter in-memory pour le dev.
  ```typescript
  // middleware.ts ou helper partagé
  const ratelimit = new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(20, '10 s') });
  ```
- **Impact** : `middleware.ts` ou nouveau `lib/ratelimit.ts` + modification des routes.
- **Fichiers touchés** : `middleware.ts`, potentiellement toutes les routes API.

#### E.2 — Ajouter les security headers

- **Quoi** : Configurer `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` dans `next.config.js`.
- **Pourquoi** : Le PWA est actuellement vulnérable au clickjacking (pas de `X-Frame-Options`) et à l'injection de scripts tiers (pas de CSP).
- **Implémentation** :
  ```javascript
  // next.config.js
  headers: async () => [{ source: '/(.*)', headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  ]}]
  ```
- **Impact** : `next.config.js` uniquement.
- **Fichiers touchés** : `next.config.js`.

#### E.3 — Valider les IDs dans les routes `[id]`

- **Quoi** : Ajouter un schéma Zod `z.string().cuid()` pour les paramètres d'URL.
- **Pourquoi** : Un ID invalide (ex: `../../../etc/passwd`) est actuellement passé directement à Prisma. Même si Prisma paramétrise les requêtes (pas d'injection SQL), l'erreur Prisma brute peut leaker des infos de schéma.
- **Implémentation** : Créer un helper `validateId(id: string)` dans `validations.ts`.
- **Impact** : Les 8 routes `[id]/route.ts`.
- **Fichiers touchés** : `validations.ts`, `api/*/[id]/route.ts`.

#### E.4 — Corriger le fallback "no-email"

- **Quoi** : Remplacer `"no-email"` par une génération d'email unique ou lever une erreur explicite.
- **Pourquoi** : Deux utilisateurs sans email = violation de contrainte unique = crash Prisma P2002 en production.
- **Implémentation** : `email: userAuth.emailAddresses[0]?.emailAddress || \`noemail+${userId}@placeholder.local\`` ou rejeter avec une erreur 400.
- **Impact** : `services/userService.ts:34`.
- **Fichiers touchés** : `services/userService.ts`.

#### E.5 — Ajouter Sentry + structured logging

- **Quoi** : Intégrer `@sentry/nextjs` pour le monitoring d'erreurs et remplacer les `console.error` par un logger structuré.
- **Pourquoi** : En production, les erreurs sont actuellement invisibles. Le `console.error` dans les routes API ne persiste nulle part.
- **Impact** : Nouveau `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, modification de `next.config.js`.
- **Fichiers touchés** : `next.config.js`, nouvelles configs Sentry, potentiellement tous les fichiers avec `console.error`.

#### E.6 — Créer `.env.example`

- **Quoi** : Documenter toutes les variables d'environnement nécessaires.
- **Pourquoi** : Aucun nouveau développeur ne sait quelles variables configurer. Le projet ne démarre pas sans `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, les clés Clerk, etc.
- **Impact** : Nouveau fichier `.env.example` à la racine.
- **Fichiers touchés** : `.env.example` (nouveau).

---

### PHASE F — Exploiter les Données Dormantes

> Priorité : **MOYENNE**. Forte valeur produit, effort modéré.

#### F.1 — Utiliser `TAX_BRACKETS` pour le calcul fiscal PER

- **Quoi** : Créer une fonction `estimateTaxSavings(annualIncome, perContribution)` utilisant `FINANCIAL_KNOWLEDGE.TAX_BRACKETS`.
- **Pourquoi** : Le guide PER (engine.ts:136-147) recommande d'ouvrir un PER mais ne chiffre jamais l'économie d'impôt. Avec les tranches, on peut dire "Vous économisez X€ d'impôt sur ce versement".
- **Impact** : Nouveau helper dans `engine.ts`, enrichissement de l'opportunité `tax_optim_open/boost`.
- **Fichiers touchés** : `engine.ts`.

#### F.2 — Exploiter `AssetHistory` pour les tendances

- **Quoi** : Créer un endpoint `GET /api/assets/[id]/history` et un composant `AssetChart` affichant l'évolution de chaque actif dans le temps.
- **Pourquoi** : Les données sont collectées par `assetService.ts:42-47` à chaque modification mais jamais affichées. C'est un trésor dormant : montrer la croissance du patrimoine est le meilleur motivateur comportemental.
- **Impact** : Nouveau route `api/assets/[id]/history/route.ts`, nouveau composant, modification de la page profil ou dashboard.
- **Fichiers touchés** : Nouveaux fichiers + `page.tsx` ou `profile/page.tsx`.

#### F.3 — Implémenter la rétention `AssetHistory`

- **Quoi** : Créer un job d'agrégation qui compresse les snapshots quotidiens en snapshots mensuels après 1 an.
- **Pourquoi** : Sans rétention, la table `asset_history` croît indéfiniment. Un utilisateur actif avec 5 actifs modifiés hebdomairement = 260 lignes/an. Sur 10 ans et 10 000 utilisateurs = 26M lignes.
- **Implémentation** : CRON job (Vercel Cron ou API route déclenchée) qui agrège en moyenne mensuelle les snapshots > 12 mois.
- **Impact** : Nouveau `api/cron/aggregate-history/route.ts`.
- **Fichiers touchés** : Nouveau fichier, potentiellement `vercel.json` pour le cron.

#### F.4 — Ajouter l'analyse rétrospective des décisions

- **Quoi** : Ajouter un champ `outcome: 'SATISFIED' | 'REGRETTED' | null` au modèle `PurchaseDecision` et une UI de feedback dans la page historique.
- **Pourquoi** : Le journal de décisions est actuellement en écriture seule. Permettre un feedback rétrospectif ferme la boucle comportementale : "Est-ce que cet achat valait le coup ?" C'est le cœur de la mission éducative.
- **Impact** : Migration Prisma (nouveau champ), modification `history/page.tsx`, `stats.accepted`/`stats.rejected` auront enfin des valeurs.
- **Fichiers touchés** : `schema.prisma`, `history/page.tsx`, `decisionService.ts`, `validations.ts`.

---

### PHASE G — Refactoring Frontend

> Priorité : **MOYENNE**. Maintenabilité et testabilité.

#### G.1 — Découper les pages monolithiques

- **Quoi** : Extraire les sous-composants des pages > 400 lignes.
- **Pourquoi** : `profile/page.tsx` (643 lignes) contient 6 steps de wizard, chacun étant un composant implicite. `page.tsx` (419 lignes) contient le dashboard, le gauge, le score, les cards — tous en ligne.
- **Plan de découpe** :
  - `profile/page.tsx` → `ProfileWizard.tsx` + `steps/StepIdentity.tsx`, `StepSituation.tsx`, `StepFixedCosts.tsx`, `StepDailyLife.tsx`, `StepAssets.tsx`, `StepStrategy.tsx`
  - `page.tsx` → `DashboardClient.tsx` + `SafeToSpendGauge.tsx`, `HealthScoreCard.tsx`, `OpportunityList.tsx`, `WealthChart.tsx`
  - `goals/page.tsx` → `GoalsPage.tsx` + `GoalForm.tsx`, `GoalSimulation.tsx`, `GoalBudgetSidebar.tsx`
- **Impact** : Aucun changement fonctionnel. Meilleure lisibilité, possibilité de tester chaque composant.
- **Fichiers touchés** : `app/page.tsx`, `goals/page.tsx`, `profile/page.tsx`, nouveaux fichiers composants.

#### G.2 — Remplacer `alert()` / `confirm()` par un système de toast/modal

- **Quoi** : Créer un composant `Toast` et un `ConfirmDialog` réutilisables.
- **Pourquoi** : `alert()` et `confirm()` bloquent le thread, ne sont pas stylisables, et cassent l'expérience PWA. Un toast non-bloquant avec undo est supérieur pour les suppressions.
- **Impact** : `goals/page.tsx`, `simulator/page.tsx`, `history/page.tsx`, `GoalCard.tsx`.
- **Fichiers touchés** : Nouveaux `components/ui/Toast.tsx`, `components/ui/ConfirmDialog.tsx`, modification des pages.

#### G.3 — Remplacer `window.location.href` par `router.push`

- **Quoi** : Utiliser `useRouter().push('/')` au lieu de `window.location.href = '/'` dans `profile/page.tsx`.
- **Pourquoi** : Le full reload détruit tout le state React, force un re-téléchargement du JS, et produit un flash blanc. La navigation client préserve le state et est instantanée.
- **Impact** : `profile/page.tsx` (1 ligne).
- **Fichiers touchés** : `profile/page.tsx`.

#### G.4 — Unifier le composant `Badge`

- **Quoi** : Supprimer le `Badge` inline dans `page.tsx` et utiliser exclusivement `components/ui/Badge.tsx`.
- **Pourquoi** : Deux implémentations = deux surfaces de maintenance. L'inline dans `page.tsx` a une API différente du composant partagé.
- **Impact** : `app/page.tsx`, `components/ui/Badge.tsx`.
- **Fichiers touchés** : `app/page.tsx`.

---

### PHASE H — Pagination et Index Manquants

> Priorité : **MOYENNE** (devient HAUTE au-delà de 1 000 utilisateurs).

#### H.1 — Ajouter les index manquants

- **Quoi** : Ajouter `@@index([profileId, deadline])` sur `FinancialGoal` et `@@index([profileId, date])` sur `PurchaseDecision`.
- **Pourquoi** : Les requêtes de tri par date (objectifs proches, historique récent) font un full scan de la table sans index.
- **Impact** : Migration Prisma, aucun changement de code applicatif.
- **Fichiers touchés** : `schema.prisma`.

#### H.2 — Implémenter la pagination cursor-based sur les décisions

- **Quoi** : Modifier `GET /api/decisions` pour supporter `?cursor=xxx&limit=20`.
- **Pourquoi** : Un utilisateur avec 500 décisions charge tout en un seul GET via `getFullUserProfile`. La pagination réduit la charge DB et le temps de transfert.
- **Impact** : `services/decisionService.ts` (nouveau `listDecisions`), `api/decisions/route.ts` (GET handler), `history/page.tsx` (infinite scroll).
- **Fichiers touchés** : `decisionService.ts`, `api/decisions/route.ts`, `history/page.tsx`.

---

### PHASE I — Le Moteur Proactif

> Priorité : **BASSE** (valeur produit très élevée, effort important).

#### I.1 — Créer `app/lib/proactive.ts`

- **Quoi** : Un module qui analyse le profil et génère des insights datés :
  - `detectDanger(profile, budget)` → alertes de découvert imminent
  - `detectDrift(profile, budget, previousBudget)` → dérive par rapport à la projection
  - `detectMilestones(profile, budget)` → "Ton matelas a atteint 3 mois !"
- **Pourquoi** : Le moteur actuel est **réactif** (l'utilisateur ouvre l'app, les chiffres sont calculés). Un moteur proactif **initie le contact** quand quelque chose change.
- **Impact** : Nouveau fichier `proactive.ts`, stockage des insights en DB (nouveau modèle `Insight`), affichage dans le dashboard.
- **Fichiers touchés** : Nouveau `proactive.ts`, `schema.prisma`, `page.tsx`.

#### I.2 — Alertes calendaires

- **Quoi** : "Dans 5 jours, 3 prélèvements pour 850€. Solde projeté : 210€."
- **Pourquoi** : La timeline génère déjà les projections jour par jour. L'alerte n'est que la lecture de la timeline avec un seuil.
- **Implémentation** : Filtrer les jours à J+7 où `balance < matelas * 0.3` et générer un message.
- **Impact** : `proactive.ts`, notifications PWA via le service worker existant.
- **Fichiers touchés** : `proactive.ts`, `public/sw.js` (push notifications).

#### I.3 — Notifications PWA

- **Quoi** : Envoyer des push notifications via le service worker pour les alertes proactives.
- **Pourquoi** : Le service worker (`public/sw.js`) est déjà configuré mais ne gère que le cache. L'ajout de push notifications ferme la boucle proactive.
- **Impact** : `sw.js`, nouveau `api/notifications/route.ts`, subscription management côté client.
- **Fichiers touchés** : `sw.js`, nouveau route API, `layout.tsx` (demande de permission).

---

### PHASE J — Préparation au Scale

> Priorité : **BASSE** (pertinent à 10 000+ utilisateurs).

#### J.1 — Soft-delete + Audit trail

- **Quoi** : Remplacer les `DELETE` par un `UPDATE { deletedAt: now() }` et ajouter un champ `deletedAt DateTime?` sur les modèles enfants.
- **Pourquoi** : Les suppressions sont actuellement irréversibles. Un utilisateur qui supprime par erreur un objectif perd toutes ses données. Un audit trail (qui a modifié quoi, quand) est nécessaire pour la conformité et le debug.
- **Impact** : Migration Prisma, modification de tous les services (ajout de `where: { deletedAt: null }`), modification du `deleteItem` / `deleteGoal` / etc.
- **Fichiers touchés** : `schema.prisma`, tous les fichiers `services/*.ts`, `validations.ts`.

#### J.2 — Optimistic updates

- **Quoi** : Mettre à jour le state local avant la réponse API, et reverter en cas d'erreur.
- **Pourquoi** : Le full refetch actuel (useFinancialData) rend chaque mutation lente (300-800ms visible). L'optimistic update rend l'UI instantanée.
- **Impact** : `hooks/useFinancialData.ts` (refactoring majeur du state management).
- **Fichiers touchés** : `hooks/useFinancialData.ts`.

#### J.3 — Migrer vers une bibliothèque de précision monétaire

- **Quoi** : Remplacer les calculs `number` par `Dinero.js` ou `big.js` dans le moteur.
- **Pourquoi** : IEEE 754 float perd des centimes sur les gros montants. Pour un patrimoine > 500K€, les erreurs d'arrondi s'accumulent dans la timeline (730 jours × N flux/jour).
- **Impact** : Refactoring majeur de `engine.ts` et `scenarios.ts`. Toutes les fonctions de calcul doivent passer en objet monétaire au lieu de `number`.
- **Fichiers touchés** : `definitions.ts`, `engine.ts`, `scenarios.ts`, `validations.ts`.

---

## Matrice de Priorité

| Phase | Effort | Impact | Priorité |
|-------|--------|--------|----------|
| **A** — Corriger les mensonges | Faible (5 fonctions) | **CRITIQUE** (confiance utilisateur) | 🔴 IMMÉDIAT |
| **B** — Éliminer les `any` | Faible (4 fichiers) | **HAUT** (sécurité du typage) | 🔴 IMMÉDIAT |
| **C** — Tests scenarios.ts | Moyen (1 fichier, ~300 lignes de tests) | **HAUT** (filet de sécurité) | 🟠 COURT TERME |
| **D** — SSR + Cache | Moyen (restructuration pages) | **HAUT** (performance perçue) | 🟠 COURT TERME |
| **E** — Sécurité production | Moyen (headers, rate limit, Sentry) | **HAUT** (viabilité prod) | 🟠 COURT TERME |
| **F** — Données dormantes | Moyen (nouvelles features) | **MOYEN** (valeur produit) | 🟡 MOYEN TERME |
| **G** — Refactoring frontend | Moyen (découpe, composants) | **MOYEN** (maintenabilité) | 🟡 MOYEN TERME |
| **H** — Pagination + Index | Faible (DB + 1 route) | **MOYEN** (scalabilité) | 🟡 MOYEN TERME |
| **I** — Moteur proactif | Élevé (nouveau module) | **ÉLEVÉ** (différenciation produit) | 🔵 LONG TERME |
| **J** — Scale | Élevé (refactoring profond) | **ÉLEVÉ** (viabilité entreprise) | 🔵 LONG TERME |

---

## Annexe : Risques Techniques par Fichier

| Fichier | Ligne(s) | Risque | Sévérité |
|---------|----------|--------|----------|
| `userService.ts` | 85 | Mapping `savingsContributions` cassé — `monthlyFlow`/`transferDay` vs `amount`/`dayOfMonth` → épargne programmée invisible (A.0) | 🔴🔴 |
| `scenarios.ts` | 90, 324 | Formule de crédit inexacte (intérêts simples) | 🔴 |
| `engine.ts` | 321 | `securityBuffer: 0, availableForProjects: 0` hardcodés | 🔴 |
| `engine.ts` | 340 | ~~Projection vide dans `simulateGoalScenario`~~ [TERMINÉ] | ✅ |
| `scenarios.ts` | 384 | ~~`issues: [], tips: []` toujours vides~~ [TERMINÉ] | ✅ |
| `engine.ts` | 534 | ~~`fireYear: 99` jamais calculé~~ [TERMINÉ] | ✅ |
| `FinancialSankey.tsx` | 222, 238 | ~~`cred.monthlyPayment` au lieu de `cred.amount` → crédits invisibles~~ [TERMINÉ] | ✅ |
| `useGoalManager.ts` | 24 | ~~`profile.savings` jamais alimenté → épargne écrasée à 0~~ [TERMINÉ] | ✅ |
| `engine.ts` | 548 | ~~`housing?.status.includes('OWNER')` crash si null~~ [TERMINÉ] | ✅ |
| `userService.ts` | 98 | ~~`user.updatedAt` au lieu de `p.updatedAt` → ancre timeline décalée~~ [TERMINÉ] | ✅ |
| `scenarios.ts` | 60 | ~~`const events: any[]`~~ [TERMINÉ] | ✅ |
| `scenarios.ts` | 107 | ~~`history: any[]`~~ [TERMINÉ] | ✅ |
| `scenarios.ts` | 285 | ~~`currentStats: any`~~ [TERMINÉ] | ✅ |
| `userService.ts` | 34 | Fallback `"no-email"` → violation unique | 🟠 |
| `profileService.ts` | 18-21 | Pas de check d'existence → 500 au lieu de 404 | 🟡 |
| `useFinancialData.ts` | ~fetchData | Full refetch (cache-busting supprimé D.3) | 🟡 |
| `engine.ts` | 36-41 | `TAX_BRACKETS` définis mais jamais utilisés | 🟡 |
| `next.config.js` | — | Aucun security header | 🟡 |
| Toutes routes API | — | Aucun rate limiting | 🟠 |
| Routes `[id]` | — | Pas de validation de format d'ID | 🟡 |
