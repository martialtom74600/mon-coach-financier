# Plan d'Implémentation — Profil & Paramètres

> **Objectif** : Créer une section Profil/Paramètres dédiée permettant l'édition ciblée, les préférences (notifications, emails), et RGPD — sans refaire tout le wizard de création.

---

## Table des Matières

1. [Contexte & Problème](#1-contexte--problème)
2. [Architecture Cible](#2-architecture-cible)
3. [Modèle de Données](#3-modèle-de-données)
4. [Plan d'Implémentation par Phase](#4-plan-dimplémentation-par-phase)
5. [Détail des Tâches](#5-détail-des-tâches)
6. [Estimation & Priorisation](#6-estimation--priorisation)

---

## 1. Contexte & Problème

### État actuel

| Élément | Fonctionnement |
|---------|----------------|
| **Route `/profile`** | Affiche uniquement le `ProfileWizard` (tunnel 6 étapes) |
| **Modification** | Pour changer un champ, l'utilisateur doit re-parcourir tout le wizard |
| **Préférences** | Aucune : notifications push gérées par prompt silencieux |
| **RGPD** | Aucun espace pour consentements, export, suppression |
| **Emails** | Aucune gestion (newsletter, alertes) |

### Problèmes

- **Impersonnel** : Pas de ton personnalisé, pas de récapitulatif "Mon profil"
- **Friction** : Édition = tout refaire
- **Préférences** : Notifications, emails, RGPD sans interface dédiée
- **Conformité** : Consentements explicites manquants

---

## 2. Architecture Cible

### Nouvelle structure des routes

```
/profile          → Vue Profil (récap + accès aux sections)
/profile/edit     → Édition du profil financier (wizard ou sections)
/settings         → Paramètres (préférences, RGPD, emails)
```

**Alternative** : `profile` avec sous-tabs : `Mon profil` | `Paramètres` | `Données & confidentialité`

### Structure des pages

```
app/
├── profile/
│   ├── page.tsx              # Vue Profil (récap + navigation)
│   ├── edit/
│   │   └── page.tsx          # Édition du profil (sections éditables)
│   └── layout.tsx            # Layout commun (optionnel)
├── settings/
│   └── page.tsx              # Paramètres (notifications, emails, RGPD)
```

### Composants

```
app/components/
├── profile/
│   ├── ProfileWizard.tsx     # Conservé pour onboarding initial
│   ├── ProfileView.tsx       # NOUVEAU : Vue récapitulative
│   ├── ProfileEditSection.tsx # NOUVEAU : Édition par section
│   └── steps/                # Réutilisés en mode édition
├── settings/
│   ├── SettingsSection.tsx   # NOUVEAU : Bloc de paramètres
│   ├── NotificationSection.tsx
│   ├── EmailSection.tsx
│   └── RgpdSection.tsx
```

---

## 3. Modèle de Données

### Nouveau modèle : `UserPreferences` (ou `ProfilePreferences`)

```prisma
model UserPreferences {
  id        String   @id @default(cuid())
  profileId String   @unique
  profile   FinancialProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  // Notifications
  pushEnabled    Boolean @default(false)
  pushAskedAt    DateTime?
  emailAlerts    Boolean @default(false)   // Alertes par email
  emailNewsletter Boolean @default(false)  // Newsletter

  // RGPD / Consentements
  consentAnalytics Boolean @default(false)  // Stats anonymes
  consentMarketing Boolean @default(false)  // Prospection
  consentUpdatedAt DateTime @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_preferences")
}
```

### Modifications `FinancialProfile`

```prisma
model FinancialProfile {
  // ... existant ...
  preferences UserPreferences?  // Relation 1:1
}
```

### Migration

```bash
npx prisma migrate dev --name add_user_preferences
```

---

## 4. Plan d'Implémentation par Phase

### Phase K — Profil & Paramètres (nouvelle phase)

| Phase | Nom | Description | Effort |
|-------|-----|-------------|--------|
| **K.1** | Modèle UserPreferences | Migration Prisma + service | Faible |
| **K.2** | Page Settings | Paramètres (notifications, emails, RGPD) | Moyen |
| **K.3** | Vue Profil récap | Page profil avec récap + navigation | Moyen |
| **K.4** | Édition par section | Déplacer wizard en mode édition ciblée | Moyen |
| **K.5** | Intégration RGPD | Boutons export/suppression, consentements | Faible |
| **K.6** | Navigation & UX | Liens, breadcrumbs, ton personnalisé | Faible |

---

## 5. Détail des Tâches

---

### K.1 — [TERMINÉ] Modèle UserPreferences

**Objectif** : Stocker les préférences utilisateur en BDD.

**Tâches** :

1. **Migration Prisma**
   - Créer le modèle `UserPreferences` (voir ci-dessus)
   - Ajouter la relation `preferences` sur `FinancialProfile`
   - Exécuter `prisma migrate dev`

2. **Service `preferencesService.ts`**
   - `getPreferences(profileId)` : récupère ou crée les préférences par défaut
   - `updatePreferences(profileId, data)` : met à jour (pushEnabled, emailAlerts, etc.)
   - `updateConsents(profileId, consents)` : met à jour les consentements RGPD

3. **Route API**
   - `GET /api/preferences` : retourne les préférences du profil
   - `PATCH /api/preferences` : met à jour (schéma Zod)

4. **Fichiers touchés**
   - `prisma/schema.prisma`
   - `app/services/preferencesService.ts` (nouveau)
   - `app/api/preferences/route.ts` (nouveau)
   - `app/lib/validations.ts` (schémas préférences)

**Tests** : `preferencesService.test.ts` (get, update, consents)

---

### K.2 — [TERMINÉ] Page Settings

**Objectif** : Page `/settings` avec blocs préférences, notifications, RGPD.

**Tâches** :

1. **Page `app/settings/page.tsx`**
   - Server Component ou Client avec `useFinancialData`
   - Récupère les préférences via `GET /api/preferences`
   - Affiche les sections

2. **Section Notifications**
   - Toggle "Notifications push" (lit/écrit `pushEnabled`)
   - Si activé : appelle `PushNotificationPrompt` ou `savePushSubscription`
   - Si désactivé : supprime les subscriptions (optionnel)

3. **Section Emails**
   - Toggle "Alertes par email" (ex: alerte calendaire)
   - Toggle "Newsletter" (optionnel)

4. **Section RGPD**
   - Cases à cocher : consentement analytics, marketing
   - Bouton "Exporter mes données"
   - Bouton "Supprimer mon compte" (avec confirmation)

5. **Fichiers touchés**
   - `app/settings/page.tsx` (nouveau)
   - `app/components/settings/NotificationSection.tsx` (nouveau)
   - `app/components/settings/EmailSection.tsx` (nouveau)
   - `app/components/settings/RgpdSection.tsx` (nouveau)
   - `app/components/Navigation.tsx` (ajout lien Settings)

**Navigation** : Ajouter un lien "Paramètres" dans `Navigation.tsx` (desktop + mobile)

---

### K.3 — [TERMINÉ] Vue Profil récap

**Objectif** : Page `/profile` affiche un récapitulatif personnalisé au lieu du wizard direct.

**Tâches** :

1. **Détection onboarding vs profil existant**
   - Si profil vide ou incomplet → rediriger vers wizard (ou afficher "Compléter mon profil")
   - Si profil complet → afficher `ProfileView`

2. **Composant `ProfileView.tsx`**
   - Bloc "Identité" : prénom, âge, situation (résumé)
   - Bloc "Situation financière" : revenus, charges, actifs (résumé)
   - Bloc "Objectifs" : liste des objectifs (résumé)
   - Bouton "Modifier" par section → ouvre l'édition ciblée

3. **Modification `app/profile/page.tsx`**
   - Logique : `profile complet ? <ProfileView /> : <ProfileWizard />`
   - Ou : toujours `ProfileView` avec CTA "Compléter" si incomplet

4. **Fichiers touchés**
   - `app/profile/page.tsx`
   - `app/components/profile/ProfileView.tsx` (nouveau)

---

### K.4 — [TERMINÉ] Édition par section

**Objectif** : Permettre de modifier une section sans refaire tout le wizard.

**Implémentation réalisée (Option B)** :

1. **Page `/profile/edit`**
   - Choix de section via cartes : Identité | Situation financière | Stratégie
   - `?section=identity` → StepIdentity + StepSituation
   - `?section=finances` → StepFixedCosts + StepDailyLife + StepAssets
   - `?section=strategy` → StepStrategy
   - Réutilisation des steps du wizard en mode `editMode` avec `onSave`

2. **API**
   - `PATCH /api/profile` : identity, situation, strategy (payload partiel, inclut `firstName`)
   - `POST /api/user` : charges, assets (items/actifs)
   - `mapSectionToPayload` dans `ProfileWizard.mappers.ts`

3. **Fichiers**
   - `app/profile/edit/page.tsx` + `ProfileEditClient.tsx`
   - `ProfileWizard.mappers.ts` : `mapSectionToPayload`
   - `app/api/profile/route.ts` : `updateProfileSchema` avec `firstName`

---

### K.5 — [TERMINÉ] Intégration RGPD

**Objectif** : Conformité RGPD (export, suppression, consentements).

**Implémentation réalisée** :

1. **Export** : `GET /api/me/export` → JSON avec user, profile, items, assets, goals, decisions, insights, preferences (ou export minimal si pas de profil)

2. **Suppression** : `DELETE /api/me` → supprime FinancialProfile + User + compte Clerk

3. **Consentements** : dans `RgpdSection` (ContextToggle analytics, marketing), prop `saving` pour feedback

4. **Fichiers** : `app/api/me/export/route.ts`, `app/api/me/route.ts`, `RgpdSection.tsx`

---

### K.6 — [TERMINÉ] Navigation & UX

**Objectif** : Rendre la navigation claire et le ton personnalisé.

**Implémentation réalisée** :

1. **Navigation** : Lien "Paramètres" (desktop + mobile), "Profil" → ProfileView ou wizard
2. **Ton** : "Bonjour, {firstName}" dans ProfileView
3. **Liens** : Clic crayon Identité → `/profile/edit?section=identity`, Situation → `?section=finances`, Objectifs → `/goals`

---

## 6. Estimation & Priorisation

### Ordre d'exécution recommandé

| Ordre | Tâche | Raison |
|-------|-------|--------|
| 1 | K.1 Modèle UserPreferences | Prérequis pour tout le reste |
| 2 | K.2 Page Settings | Valeur immédiate (notifications, RGPD) |
| 3 | K.3 Vue Profil récap | Améliore l'expérience profil sans casser le wizard |
| 4 | K.4 Édition par section | Plus complexe, peut être itérative |
| 5 | K.5 RGPD (export, suppression) | Complète la section Settings |
| 6 | K.6 Navigation & UX | Polish final |

### Estimation effort

| Phase | Effort | Durée estimée |
|-------|--------|---------------|
| K.1 | Faible | 0.5 j |
| K.2 | Moyen | 1 j |
| K.3 | Moyen | 1 j |
| K.4 | Moyen | 1.5 j |
| K.5 | Faible | 0.5 j |
| K.6 | Faible | 0.5 j |
| **Total** | | **~5 j** |

### Dépendances

- `PushNotificationPrompt` : peut être déplacé ou réutilisé dans Settings (section Notifications)
- `profileService.updateProfile` : doit accepter les payloads partiels

---

## Annexe : Schémas Zod suggérés

```typescript
// validations.ts

export const updatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
  consentAnalytics: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
});

export const preferencesResponseSchema = z.object({
  id: z.string(),
  pushEnabled: z.boolean(),
  emailAlerts: z.boolean(),
  emailNewsletter: z.boolean(),
  consentAnalytics: z.boolean(),
  consentMarketing: z.boolean(),
  consentUpdatedAt: z.string().datetime(),
});
```

---

## Annexe : Structure des routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/preferences` | Récupère les préférences |
| PATCH | `/api/preferences` | Met à jour les préférences |
| GET | `/api/me/export` | Export RGPD (JSON) |
| DELETE | `/api/me` | Suppression du compte |

---

## État d'implémentation (10 mars 2026)

| Phase | Statut | Notes |
|-------|--------|-------|
| K.1 | ✅ Terminé | UserPreferences, preferencesService, GET/PATCH /api/preferences |
| K.2 | ✅ Terminé | Page Settings, NotificationSection, EmailSection, RgpdSection |
| K.3 | ✅ Terminé | ProfileView, profile complet → récap, incomplet → wizard |
| K.4 | ✅ Terminé | ProfileEditClient, sections identity/finances/strategy, PATCH + POST |
| K.5 | ✅ Terminé | Export, suppression compte, consentements RGPD |
| K.6 | ✅ Terminé | Navigation Paramètres, ton "Bonjour {firstName}" |

**Extensions réalisées (hors plan)** :
- Paramètres sans profil : `ensureUserAndProfile` crée User + profil minimal si absent
- Export/suppression fonctionnent même sans profil complet

---

*Document créé le 10 mars 2026. À intégrer dans TECHNICAL_EVOLUTION_PLAN.md (Phase K) après validation.*
