# 🎯 Réécriture UX — Mon Coach Financier
## Grille "Meilleur pote expert" — Voice & Tone

**Identité** : Le meilleur pote expert. Celui qui te dit la vérité avec une bière à la main, mais qui veut sincèrement que tu deviennes riche.  
**Style** : Tutoiement, empathie, une touche d'esprit, pas de langue de bois.

---

## 1. TITRES & NAVIGATION

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `app/components/Header.tsx` | `Ton bilan en temps réel.` | `Ton QG financier, en direct.` | Rendre le concept "bilan" moins administratif, ancrer l'idée de quartier général |
| `app/components/Header.tsx` | `Mon Profil` | `Ton Profil` | Cohérence tutoiement, appropriation |
| `app/components/Header.tsx` | `Ta situation pour un coach au top.` | `On a besoin de te connaître pour te conseiller au top.` | Conversation, pas formulaire |
| `app/components/Header.tsx` | `Mes objectifs` | `Tes objectifs` | Cohérence tutoiement |
| `app/components/Header.tsx` | `Définis et suis tes objectifs financiers.` | `Définis où tu veux aller, on trace la route ensemble.` | Collaboration, pas injonction |
| `app/components/Header.tsx` | `Nouveau Projet` | `Nouveau Projet` | OK, garder (déjà bien) |
| `app/components/Header.tsx` | `Un achat en tête ? On regarde.` | `Un achat qui te démange ? On décortique.` | Plus vivant, moins neutre |
| `app/components/Header.tsx` | `Historique` | `Le Rétro` | Fun, mémorisable, moins "archives" |
| `app/components/Header.tsx` | `Retrouve toutes tes décisions passées.` | `Tout ce que t'as déjà simulé, au même endroit.` | Familier, concret |
| `app/components/Header.tsx` | `Coach Fi` | `Coach Fi` | OK, garder |
| `app/components/Header.tsx` | `Prends le contrôle de ton budget.` | `Reprends les commandes de ton argent.` | Plus punchy, moins "self-help" |
| `app/components/Navigation.tsx` | `Bilan` (mobile) | `Le QG` | Cohérence avec Header |
| `app/components/Navigation.tsx` | `Objectifs` (mobile) | `Objectifs` | OK |
| `app/components/Navigation.tsx` | `Simuler` (mobile) | `Simuler` | OK |
| `app/components/Navigation.tsx` | `History` (mobile) | `Rétro` | Corriger + cohérence |
| `app/components/Navigation.tsx` | `Profil` (mobile) | `Profil` | OK |
| `app/components/Navigation.tsx` | `Param.` (mobile) | `Réglages` | Plus chaleureux que "Paramètres" |
| `app/components/Navigation.tsx` | `Coach.io` | `Coach.io` | OK |
| `app/components/Navigation.tsx` | `Pilotage` | `Pilotage` | OK (déjà bien) |
| `app/components/Navigation.tsx` | `Mon bilan` | `Le QG` | Cohérence |
| `app/components/Navigation.tsx` | `Mes objectifs` | `Tes objectifs` | Tutoiement |
| `app/components/Navigation.tsx` | `Simulateur achat` | `Simulateur achat` | OK |
| `app/components/Navigation.tsx` | `Historique` | `Le Rétro` | Cohérence |
| `app/components/Navigation.tsx` | `Configuration` | `Ton coin` | Moins technique |
| `app/components/Navigation.tsx` | `Mon profil` | `Ton profil` | Tutoiement |
| `app/components/Navigation.tsx` | `Paramètres` | `Ton jardin secret` | Fun, mémorisable |
| `app/components/Navigation.tsx` | `Version 2.0 • Coach Goals` | `v2.0 • Coach Goals` | Plus léger |
| `app/layout.tsx` | `Prenez le contrôle de votre budget.` | `Reprends les commandes de ton argent.` | Tutoiement + cohérence |
| `app/settings/layout.tsx` | `Paramètres — Mon Coach Financier` | `Réglages — Mon Coach Financier` | Cohérence |
| `app/settings/page.tsx` | `Paramètres` | `Ton jardin secret` | Cohérence |
| `app/settings/page.tsx` | `Notifications, emails et confidentialité` | `Notifications, emails et vie privée` | Moins juridique |
| `app/history/page.tsx` | `Vision Financière` | `Vision Financière` | OK ou `Ta vision` |
| `app/goals/page.tsx` | `Mes Objectifs` | `Tes objectifs` | Tutoiement |
| `app/goals/page.tsx` | `Planifie ton avenir financier.` | `Planifie où tu veux aller.` | Plus court, moins "finance" |
| `app/goals/page.tsx` | `Analyse de faisabilité...` | `On calcule...` | Moins technique |
| `app/components/AuthLayout.tsx` | `Finance OS` | `Finance OS` | OK |

---

## 2. WIZARD (ONBOARDING)

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `StepIdentity.tsx` | `Qui êtes-vous ?` | `C'est qui, toi ?` | Conversation, pas formulaire |
| `StepIdentity.tsx` | `Ces infos calibrent nos projections.` | `On en a besoin pour te donner des chiffres qui collent à ta vie.` | Expliquer le "pourquoi" sans jargon |
| `StepIdentity.tsx` | `Votre Prénom` | `Ton prénom` | Tutoiement |
| `StepIdentity.tsx` | `Ex: Thomas` | `Ex: Thomas` | OK |
| `StepIdentity.tsx` | `Votre Âge` | `Ton âge` | Tutoiement |
| `StepIdentity.tsx` | `C'est parti` | `C'est parti !` | Enthousiasme |
| `StepIdentity.tsx` | `C'est bon` | `C'est bon` | OK |
| `StepSituation.tsx` | `Statut Pro` | `Tu bosses comment ?` | Conversation |
| `StepSituation.tsx` | `Logement` | `Tu loges où ?` | Fluide |
| `StepSituation.tsx` | `Foyer` | `Tu vis seul ou à plusieurs ?` | Humain |
| `StepSituation.tsx` | `Salarié` / `Indépendant` / etc. | Garder (labels standards) | OK |
| `StepFixedCosts.tsx` | `Votre Loyer` | `Ton loyer` | Tutoiement |
| `StepFixedCosts.tsx` | `Votre Crédit Immo` | `Ton crédit immo` | Tutoiement |
| `StepFixedCosts.tsx` | `Revenus` | `Revenus` | OK |
| `StepFixedCosts.tsx` | `Charges Fixes` | `Charges fixes` | OK |
| `StepFixedCosts.tsx` | `Abonnements` | `Abonnements` | OK |
| `StepFixedCosts.tsx` | `Dépenses Annuelles` | `Dépenses annuelles` | OK |
| `StepFixedCosts.tsx` | `Crédits Conso` | `Crédits conso` | OK |
| `StepDailyLife.tsx` | `Dépenses Courantes` | `Le quotidien (courses, sorties...)` | Plus parlant |
| `StepDailyLife.tsx` | `Tout ce qui est variable et lissé (Courses, Loisirs...)` | `Tout ce qui bouge chaque mois : courses, resto, loisirs...` | Moins technique |
| `StepDailyLife.tsx` | `Dépenses Courantes & Loisirs` | `Quotidien & Loisirs` | Plus court |
| `StepStrategy.tsx` | `Où j'en suis` | `Où t'en es` | Tutoiement |
| `StepStrategy.tsx` | `Le moment de vérité.` | `Le moment de vérité.` | OK (déjà punchy) |
| `StepAssets.tsx` | `Mon argent` | `Ton argent` | Tutoiement |
| `StepAssets.tsx` | `Tes comptes et investissements.` | `Tes comptes et investissements.` | OK |
| `StepAssets.tsx` | `Qu'est-ce que tu possèdes ?` | `Qu'est-ce que tu as de côté ?` | Moins formel |
| `StepAssets.tsx` | `Détail de tes comptes` | `Détail de tes comptes` | OK |
| `StepAssets.tsx` | `Solde Actuel (Stock)` | `Solde actuel` | Simplifier |
| `StepAssets.tsx` | `Versement / Mois` | `Versement / mois` | OK |
| `StepAssets.tsx` | `Jour` | `Jour du mois` | Plus clair |
| `StepAssets.tsx` | `Total estimé` | `Total estimé` | OK |
| `StepAssets.tsx` | `Cash + investissements` | `Cash + investissements` | OK |
| `StepAssets.tsx` | `Retour` | `Retour` | OK |
| `StepAssets.tsx` | `Voir où j'en suis` | `Voir où t'en es` | Tutoiement |
| `StepAssets.tsx` | `AJOUTÉ` | `Ajouté !` | Moins criard |
| `ProfileWizardLayout.tsx` | `Votre Profil` | `Ton profil` | Tutoiement |
| `ProfileWizardLayout.tsx` | `Invité` | `Invité` | OK |
| `ProfileWizardLayout.tsx` | `Synthèse Mensuelle` | `Synthèse du mois` | Plus fluide |
| `ProfileWizardLayout.tsx` | `% Engagés` | `% engagés` | OK |
| `ProfileWizardLayout.tsx` | `Revenus` / `Charges Fixes` / etc. | Garder | OK |
| `ProfileWizardLayout.tsx` | `Vrai Reste à vivre` | `Vrai reste à vivre` | OK |
| `ProfileView.tsx` | `Identité` | `Identité` | OK |
| `ProfileView.tsx` | `Ton statut` / `Ton logement` / etc. | OK | Déjà bien |
| `ProfileView.tsx` | `Dépenses du quotidien, lissées sur le mois.` | `Courses, sorties, tout ce qui bouge chaque mois.` | Moins technique |

### Validation Wizard (ProfileWizard.tsx)

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `ProfileWizard.tsx` | `Ton prénom, c'est quoi ?` | `On a besoin de ton prénom !` | Déjà bien, garder |
| `ProfileWizard.tsx` | `Indique ton âge.` | `Ton âge, c'est quoi ?` | Cohérence ton |
| `ProfileWizard.tsx` | `C'est combien ton loyer ou crédit ?` | `Combien tu paies pour te loger ?` | Plus naturel |
| `ProfileWizard.tsx` | `Quel jour du mois tu paies ? (1-31)` | `Tu paies le combien du mois ? (1-31)` | Plus oral |
| `ProfileWizard.tsx` | `Une dépense n'a pas de nom.` | `Oups, une dépense sans nom. Donne-lui un petit nom !` | Empathie, pas culpabilité |
| `ProfileWizard.tsx` | `Un de tes comptes n'a pas de nom.` | `Un compte sans nom ? On lui en trouve un ?` | Même logique |
| `ProfileWizard.tsx` | `Le solde de "${asset.name}" est invalide.` | `Le solde de "${asset.name}" a l'air bizarre. Tu peux vérifier ?` | Humain, pas "invalide" |
| `ProfileWizard.tsx` | `Quel jour tu verses sur "${asset.name}" ? (1-31)` | `Tu verses le combien sur "${asset.name}" ? (1-31)` | Plus oral |
| `ProfileWizard.tsx` | `Oups, ça n'a pas marché. Réessaie ?` | `Oups, petit bug. Tu réessaies ?` | Principe clé : jamais "erreur" |
| `ProfileWizard.tsx` | `Oups, erreur. Réessaie ?` | `Oups, petit bug. Tu réessaies ?` | Idem |

---

## 3. DÉCISIONS (MOTEUR D'ACHAT)

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `app/lib/scenarios.ts` | `Feu vert` | `Feu vert` | OK (déjà bien) |
| `app/lib/scenarios.ts` | `Tout est ok.` | `Tout roule.` | Plus vivant |
| `app/lib/scenarios.ts` | `Mise à jour` | `Mis à jour` | OK |
| `app/lib/scenarios.ts` | `Historique mis à jour.` | `C'est enregistré.` | Plus simple |
| `app/lib/scenarios.ts` | `Fonds insuffisants` | `Pas assez de côté` | Moins bancaire |
| `app/lib/scenarios.ts` | `Manque X d'épargne.` | `Il te manque X pour y arriver.` | Empathie |
| `app/lib/scenarios.ts` | `Fonce !` | `Fonce !` | OK (déjà punchy) |
| `app/lib/scenarios.ts` | `Validé : Budget et Trésorerie OK.` | `Budget OK, trésorerie OK. Tu peux y aller.` | Plus direct |
| `app/lib/scenarios.ts` | `Attends un peu` | `Aïe, ton compte va faire la tête` | Exemple donné dans le brief ! |
| `app/lib/scenarios.ts` | `Risque de découvert. Attends une rentrée d'argent.` | `Risque de découvert. On attend une rentrée d'argent ?` | Proposition, pas ordre |
| `app/lib/scenarios.ts` | `Attention au budget` | `Budget un peu tendu` | Moins alarmiste |
| `app/lib/scenarios.ts` | `Reste à vivre trop faible.` | `Ton reste à vivre serait trop juste ce mois-ci.` | Explication, pas verdict sec |
| `app/lib/scenarios.ts` | `Impossible` | `Pas cette fois` | Moins brutal |
| `app/lib/scenarios.ts` | `Ni budget, ni trésorerie.` | `Budget et trésorerie : les deux disent non. On repousse ?` | Proposer une issue |
| `app/lib/scenarios.ts` | `Matelas en danger : il ne couvrirait plus que X mois de dépenses.` | `Ton matelas passerait sous X mois de sécu. Un peu risqué.` | Alerter sans paniquer |
| `app/lib/scenarios.ts` | `Coût du crédit élevé : X d'intérêts, soit Y% du prix.` | `Le crédit te coûterait X d'intérêts (Y% du prix). À garder en tête.` | Info, pas jugement |
| `app/lib/scenarios.ts` | `Cet argent investi vaudrait X dans 10 ans.` | `Cet argent placé vaudrait X dans 10 ans. Food for thought.` | Touche d'esprit |
| `app/lib/scenarios.ts` | `Pensez à suivre le remboursement.` | `Pense à suivre qui te doit quoi.` | Tutoiement + concret |
| `DiagnosticCard.tsx` | `Moyens Théoriques` | `Budget mensuel` | Moins jargonneux |
| `DiagnosticCard.tsx` | `Validé` | `OK` | Plus court |
| `DiagnosticCard.tsx` | `Risqué` | `Risqué` | OK |
| `DiagnosticCard.tsx` | `Budget Mensuel` | `Budget mensuel` | OK |
| `DiagnosticCard.tsx` | `Cet achat rentre dans ton niveau de vie global.` | `Cet achat rentre dans ton budget.` | Plus direct |
| `DiagnosticCard.tsx` | `Attention, tu vis au-dessus de tes revenus ce mois-ci.` | `Ce mois-ci, tu dépenses plus que tu gagnes.` | Factuel, pas moralisateur |
| `DiagnosticCard.tsx` | `Réalité Compte` | `Trésorerie` | Plus clair |
| `DiagnosticCard.tsx` | `Trésorerie J+45` | `Trésorerie J+45` | OK |
| `DiagnosticCard.tsx` | `Aucun découvert prévu sur les 45 prochains jours.` | `Pas de découvert en vue sur 45 jours.` | Plus court |
| `DiagnosticCard.tsx` | `Risque de découvert (Min: X).` | `Découvert possible (min: X).` | Moins technique |
| `DiagnosticCard.tsx` | `Points d'attention :` | `À garder en tête :` | Moins alarmiste |
| `HistoryStats.tsx` | `Résumé Global` | `Résumé` | Plus court |
| `HistoryStats.tsx` | `Total Projets` | `Projets` | OK |
| `HistoryStats.tsx` | `Volume Cumulé` | `Volume total` | OK |
| `HistoryStats.tsx` | `Feux verts` | `Feux verts` | OK |
| `HistoryStats.tsx` | `Projets risqués` | `Projets risqués` | OK |
| `HistoryStats.tsx` | `Ces achats ont été marqués comme regrettés.` | `Achats que t'as regrettés.` | Plus direct |
| `HistoryItemCard.tsx` | `Cet achat valait le coup ?` | `Tu regrettes ou pas ?` | Plus direct |
| `HistoryItemCard.tsx` | `J'ai bien fait` | `J'ai bien fait` | OK |
| `HistoryItemCard.tsx` | `Je regrette` | `Je regrette` | OK |
| `HistoryItemCard.tsx` | `Réinitialiser` | `Réinitialiser` | OK |
| `HistoryItemCard.tsx` | `Satisfait` / `Regretté` / `À évaluer` | OK | OK |
| `HistoryItemCard.tsx` | `Supprimer cette simulation` | `Supprimer` | Plus court |

---

## 4. NOTIFICATIONS PUSH (PROACTIVES)

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `app/lib/proactive.ts` | `Déficit structurel de X. Vos charges dépassent vos revenus.` | `Tes charges dépassent tes revenus (X). On en parle ?` | Invitation, pas verdict |
| `app/lib/proactive.ts` | `Fin de mois en négatif. Vous investissez trop...` | `Fin de mois en rouge. Tu mets trop dans l'épargne par rapport à ce que tu gagnes.` | Tutoiement, clarté |
| `app/lib/proactive.ts` | `Pas d'épargne de précaution...` | `Pas encore de matelas de sécu. On vise 1000€ pour commencer ?` | Proposition, pas culpabilité |
| `app/lib/proactive.ts` | `Solde courant (X) proche du seuil critique...` | `Ton solde (X) frôle la zone rouge. On garde un œil ?` | Vigilance sans panique |
| `app/lib/proactive.ts` | `Votre matelas a baissé de X...` | `Ton matelas a pris X en moins. Tu sais pourquoi ?` | Curiosité, pas accusation |
| `app/lib/proactive.ts` | `Votre solde de fin de mois a diminué...` | `Ton solde de fin de mois a baissé. Tout va bien ?` | Empathie |
| `app/lib/proactive.ts` | `Votre capacité d'épargne a diminué...` | `Tu épargnes moins qu'avant. Normal ou à surveiller ?` | Question ouverte |
| `app/lib/proactive.ts` | `Ton matelas a atteint X mois !` | `Ton matelas couvre X mois ! Tu gères.` | Célébration, encouragement |
| `app/lib/proactive.ts` | `Ton matelas couvre 1 mois de charges ! Continue vers X mois.` | `1 mois de sécu atteint ! Prochaine étape : X mois.` | Progression, pas pression |
| `app/lib/proactive.ts` | `Tu as dépassé le seuil de sécurité de X.` | `Tu as passé le cap des X€ de sécu. Bien joué.` | Célébration |
| `app/lib/proactive.ts` | `Dans X jour(s), Y prélèvement(s) pour Z. Solde projeté : W.` | `Dans X jour(s) : Y prélèvements (Z€). Solde prévu : W€.` | Plus court, clair |
| `NotificationSection.tsx` | `Notifications push` | `Notifications push` | OK |
| `NotificationSection.tsx` | `Recevez les alertes (découvert, calendrier) sur votre appareil` | `Reçois les alertes (découvert, calendrier) sur ton téléphone` | Tutoiement |
| `EmailSection.tsx` | `Alertes par email` | `Alertes par email` | OK |
| `EmailSection.tsx` | `Recevez les alertes importantes (solde bas, prélèvements à venir)` | `Reçois les alertes importantes (solde bas, prélèvements à venir)` | Tutoiement |
| `EmailSection.tsx` | `Newsletter` | `Newsletter` | OK |
| `EmailSection.tsx` | `Conseils et astuces pour optimiser votre budget` | `Conseils et astuces pour optimiser ton budget` | Tutoiement |
| `ProactiveInsightsCard.tsx` | `Alertes & Insights` | `Alertes & Pépites` | Plus fun |
| `ProactiveInsightsCard.tsx` | `alerte(s)` | `alerte(s)` | OK |
| `ProactiveInsightsCard.tsx` | `Cliquez sur × pour masquer X — réapparaît le Y` | `Clique sur × pour masquer — réapparaît le Y` | Tutoiement |
| `ProactiveInsightsCard.tsx` | `Masquer X` | `Masquer` | Plus court |

---

## 5. MESSAGES D'ERREUR & SUCCÈS

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `app/services/errors.ts` | `introuvable` | `introuvable` | OK (contexte technique) |
| `app/services/errors.ts` | `Ressource introuvable ou non autorisée` | `Oups, on ne trouve pas ou t'as pas accès.` | Humain |
| `app/services/errors.ts` | `Erreur interne` | `Oups, petit bug de notre côté. Réessaie dans un instant ?` | Principe clé |
| API routes | `Non autorisé` | `Tu n'as pas accès à ça.` | Direct |
| API routes | `Erreur interne` | `Oups, petit bug. Réessaie ?` | Cohérence |
| API routes | `Erreur interne lors de la sauvegarde` | `Oups, la sauvegarde a planté. Tu réessaies ?` | Humain |
| API routes | `Erreur lors de l'export` | `L'export a coincé. Tu réessaies ?` | Humain |
| API routes | `Erreur lors de la suppression` | `La suppression a coincé. Tu réessaies ?` | Humain |
| `useFinancialData.ts` | `Données incohérentes reçues du serveur.` | `On a reçu des données bizarres. Rafraîchis la page ?` | Pas technique |
| `useFinancialData.ts` | `Impossible de charger les données.` | `On n'arrive pas à charger tes données. Tu réessaies ?` | Proposition |
| `useFinancialData.ts` | `Erreur de connexion.` | `Connexion perdue. Vérifie ton réseau et réessaie.` | Actionnable |
| `ErrorBoundary.tsx` | `n'a pas pu se charger` | `n'a pas pu se charger` | OK |
| `ErrorBoundary.tsx` | `Une erreur de calcul s'est produite. Vos données sont intactes.` | `Oups, un petit bug de calcul. Tes données sont intactes, pas de panique.` | Rassurer |
| `ErrorBoundary.tsx` | `Réessayer` | `Réessayer` | OK |
| `AssetChart.tsx` | `Non autorisé` | `Accès refusé` | OK |
| `AssetChart.tsx` | `Accès refusé` | `Accès refusé` | OK |
| `AssetChart.tsx` | `Erreur de chargement` | `Oups, ça n'a pas chargé. Réessaie ?` | Humain |
| `AssetChart.tsx` | `Erreur` | `Oups` | Principe clé |
| `api/me/export/route.ts` | `Données non trouvées` | `Aucune donnée à exporter.` | Factuel |
| `api/me/export/route.ts` | `Profil financier non complété` | `Ton profil n'est pas encore complet.` | Tutoiement |
| `lib/validations.ts` | `Ce champ est requis` | `Ce champ est obligatoire` | Moins sec |

### Toasts Succès / Échec

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `settings/page.tsx` | `Paramètres enregistrés` | `C'est enregistré !` | Plus chaleureux |
| `settings/page.tsx` | `Oups, ça n'a pas marché. Réessaie ?` | `Oups, petit bug. Tu réessaies ?` | Cohérence |
| `settings/page.tsx` | `Impossible de charger les paramètres` | `On n'arrive pas à charger tes réglages. Rafraîchis ?` | Actionnable |
| `RgpdSection.tsx` | `Export non disponible` | `Rien à exporter pour l'instant.` | Factuel |
| `RgpdSection.tsx` | `Oups, l'export a échoué. Réessaie ?` | `Oups, l'export a coincé. Tu réessaies ?` | Cohérence |
| `RgpdSection.tsx` | `Oups, la suppression a échoué.` | `Oups, la suppression a coincé. Tu réessaies ?` | Cohérence |
| `RgpdSection.tsx` | `Export téléchargé` | `Export téléchargé !` | Célébration |
| `RgpdSection.tsx` | `Compte supprimé` | `C'est fait. À bientôt !` | Empathie |
| `ProfileView.tsx` | `C'est enregistré !` | `C'est enregistré !` | OK (déjà bien) |
| `goals/page.tsx` | `Impossible de sauvegarder l'objectif.` | `Oups, on n'a pas pu sauvegarder. Tu réessaies ?` | Humain |
| `goals/page.tsx` | `Oups, la suppression a échoué.` | `Oups, la suppression a coincé. Tu réessaies ?` | Cohérence |
| `simulator/page.tsx` | `Impossible de sauvegarder la décision.` | `Oups, on n'a pas pu enregistrer ta décision. Tu réessaies ?` | Humain |

---

## 6. AUTRES UI (SIMULATEUR, OBJECTIFS, ETC.)

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `simulator/page.tsx` | `Profil manquant` | `Profil manquant` | OK |
| `simulator/page.tsx` | `Pour simuler un achat, nous avons besoin de connaître ton budget.` | `Pour simuler un achat, on a besoin de connaître ton budget.` | "Nous" → "on" |
| `simulator/page.tsx` | `Configurer mon Profil` | `Configurer mon profil` | OK |
| `simulator/page.tsx` | `Mon Contexte` | `Ton contexte` | Tutoiement |
| `simulator/page.tsx` | `Noter ma décision` | `Noter ma décision` | OK |
| `SimulatorForm.tsx` | `Simulateur d'Achat` | `Simulateur d'achat` | OK |
| `SimulatorForm.tsx` | `Est-ce que cet achat rentre dans ton budget sans casser tes objectifs ?` | `Cet achat, il rentre dans ton budget sans casser tes objectifs ?` | Plus direct |
| `SimulatorForm.tsx` | `C'est quoi ?` | `C'est quoi ?` | OK |
| `SimulatorForm.tsx` | `Quel type d'achat ?` | `Quel type d'achat ?` | OK |
| `SimulatorForm.tsx` | `Comment tu paies ?` | `Comment tu paies ?` | OK |
| `SimulatorForm.tsx` | `Analyser l'achat` | `Analyser l'achat` | OK |
| `goals/page.tsx` | `Profil manquant...` | `Profil manquant...` | OK |
| `goals/page.tsx` | `Aucun objectif pour le moment.` | `Aucun objectif pour l'instant.` | Plus doux |
| `goals/page.tsx` | `Créer mon premier objectif` | `Créer mon premier objectif` | OK |
| `goals/page.tsx` | `Supprimer cet objectif ?` | `Supprimer cet objectif ?` | OK |
| `goals/page.tsx` | `Cette action est irréversible.` | `C'est définitif.` | Plus court |
| `GoalForm.tsx` | `Paramètres avancés` | `Options avancées` | Moins technique |
| `GoalForm.tsx` | `J'ai déjà une somme` | `J'ai déjà une somme` | OK |
| `GoalSimulation.tsx` | `Attention : Votre budget sera en négatif.` | `Attention : ton budget passerait en négatif.` | Tutoiement |
| `GoalBudgetSidebar.tsx` | `Attention : Tes projets coûtent plus cher que ce que tu peux épargner.` | `Tes projets coûtent plus que ce que tu peux épargner.` | Moins "Attention" |
| `GoalBudgetSidebar.tsx` | `Excellent : Tu finances tes projets et tu gardes une marge de sécurité.` | `Tu finances tes projets et tu gardes une marge. Bien joué.` | Célébration |
| `GoalCard.tsx` | `Objectif atteint !` | `Objectif atteint !` | OK |
| `GoalCard.tsx` | `Attention : Objectif difficile` | `Objectif ambitieux` | Moins alarmiste |
| `history/page.tsx` | `C'est encore vide ici` | `C'est encore vide ici` | OK |
| `history/page.tsx` | `Tes futures simulations s'afficheront ici.` | `Tes prochaines simulations s'afficheront ici.` | "Futures" → "prochaines" |
| `history/page.tsx` | `Faire une simulation` | `Faire une simulation` | OK |
| `history/page.tsx` | `Supprimer cette simulation ?` | `Supprimer cette simulation ?` | OK |
| `history/page.tsx` | `Veux-tu vraiment supprimer cette simulation ?` | `Tu es sûr de vouloir supprimer ?` | Plus direct |
| `settings/page.tsx` | `Complétez votre profil pour accéder aux paramètres.` | `Complète ton profil pour accéder aux réglages.` | Tutoiement |
| `settings/page.tsx` | `Aller au profil →` | `Aller au profil →` | OK |
| `RgpdSection.tsx` | `Statistiques anonymes` | `Statistiques anonymes` | OK |
| `RgpdSection.tsx` | `Nous utilisons des données agrégées pour améliorer le service` | `On utilise des données agrégées pour améliorer le service` | "Nous" → "on" |
| `RgpdSection.tsx` | `Prospection commerciale` | `Offres et actualités` | Moins juridique |
| `RgpdSection.tsx` | `Recevoir des offres et actualités (optionnel)` | `Recevoir des offres et actualités (optionnel)` | OK |
| `RgpdSection.tsx` | `Vos données` | `Tes données` | Tutoiement |
| `RgpdSection.tsx` | `Exporter mes données` | `Exporter mes données` | OK |
| `RgpdSection.tsx` | `Supprimer mon compte` | `Supprimer mon compte` | OK |
| `RgpdSection.tsx` | `Cette action est irréversible. Toutes vos données...` | `C'est définitif. Toutes tes données seront supprimées.` | Tutoiement + plus court |
| `RgpdSection.tsx` | `Supprimer définitivement` | `Supprimer définitivement` | OK |
| `DashboardClient.tsx` | `Pour construire votre GPS financier...` | `Pour construire ton GPS financier...` | Tutoiement |
| `DashboardClient.tsx` | `Lancer l'analyse` | `Lancer l'analyse` | OK |
| `DashboardClient.tsx` | `Excellente forme` / `Bon état général` / etc. | OK | OK |
| `SafeToSpendGauge.tsx` | `Fin de mois à découvert` | `Fin de mois à découvert` | OK |
| `SafeToSpendGauge.tsx` | `Libre pour le plaisir` | `Libre pour le plaisir` | OK (déjà bien) |

---

## 7. MOTEUR / DÉFINITIONS (lib)

| Fichier | Texte Actuel | Nouvelle Proposition | Intention Psychologique |
|---------|--------------|----------------------|-------------------------|
| `app/lib/engine.ts` | `Budget OK.` | `Budget OK.` | OK |
| `app/lib/engine.ts` | `Impossible.` | `Pas possible.` | Moins sec |
| `app/lib/engine.ts` | `Manque X€/mois.` | `Il manque X€/mois.` | Plus naturel |
| `app/lib/engine.ts` | `Zone Rouge` | `Zone rouge` | OK |
| `app/lib/engine.ts` | `Pas d'épargne de précaution.` | `Pas de matelas de sécu.` | Cohérence vocabulaire |
| `app/lib/engine.ts` | `Sécurité Fragile` | `Sécu fragile` | Plus court |
| `app/lib/definitions.ts` | Labels catégories (Immobilier, Véhicule...) | Garder (standards) | OK |
| `app/lib/definitions.ts` | `Matelas de Sécurité` | `Matelas de sécu` | Plus court, familier |

---

## RÉSUMÉ DES PRINCIPES APPLIQUÉS

1. **Jamais "Erreur"** → "Oups, petit bug" ou variantes ("a coincé", "a planté")
2. **Tutoiement systématique** → "Votre" / "Vous" → "Ton" / "Tu"
3. **"Nous"** → "On" (plus proche)
4. **Décisions refusées** → Formulations qui proposent une issue ("On repousse ?", "On attend ?")
5. **Jargon bancaire** → Langage du quotidien ("Fonds insuffisants" → "Pas assez de côté")
6. **Célébrations** → "Bien joué", "Tu gères" pour les milestones
7. **Questions ouvertes** → Inviter au dialogue plutôt qu'énoncer des verdicts

---

*Document généré pour l'application Mon Coach Financier — Voice & Tone "Meilleur pote expert"*
