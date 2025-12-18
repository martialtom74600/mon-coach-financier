// app/lib/logic.ts

// On exporte tout depuis definitions (Types, Enums, Constantes)
export * from './definitions';

// On exporte le moteur de calcul (SAUF s'il y a des conflits, mais là on a nettoyé engine.ts)
export * from './engine';

// On exporte les scénarios (Timeline, Analyse d'achat)
export * from './scenarios';