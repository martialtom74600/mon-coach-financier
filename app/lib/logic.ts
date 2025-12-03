// app/lib/logic.ts

// Ce fichier sert de point d'entrée unique pour toute la logique.
// Il re-exporte les fonctions des sous-modules pour simplifier les imports ailleurs.

export * from './constants';
export * from './utils';
export * from './timeline';

// Les modules principaux refactorisés
export * from './finance';    // Le chef d'orchestre
export * from './goals';      // Le cerveau des objectifs
export * from './analyser';   // Le juge des achats
export * from './simulator';  // Le moteur de transformation

// ✅ INDISPENSABLE : On exporte les définitions de types
// Cela permet à ton UI de faire : import { Profile, Goal } from '@/lib/logic';
export * from './types';