/**
 * LA COUTURE DE LA CINQUIÈME PIERRE : un CONTRÔLE juge un rapport lu, et rend un verdict
 * d'une ligne sans jamais citer une valeur du client. Cinq contrôles (lot D1), du plus
 * simple (le rapport existe) au plus exigeant (il est cohérent avec les autres), dans
 * `src/controles/`, enregistrés par `src/controles/index.ts` (`registre()`). Le dossier
 * (lot D2) les applique à chaque question de la suite et écrit l'état atteint.
 *
 * Déterministe, sans réseau, sans état : le même rapport, les mêmes réglages, le même jour
 * de référence rendent le même verdict sur toute machine.
 */
import type { RapportLu } from "./rapport-lu.ts";

export const OUTILS = ["routing", "screening", "monitoring", "scoring"] as const;
export type OutilId = (typeof OUTILS)[number];

export const CONTROLES = ["present", "sealed", "signed", "fresh", "consistent"] as const;
export type ControleId = (typeof CONTROLES)[number];

export type Fraicheur = "fresh" | "due" | "stale";

export interface Reglages {
  /** le rythme de recertification déclaré par la banque, en jours (hypothèse nommée, assumptions.ts) */
  rythmeJours: number;
  /** au-delà de ce nombre de rythmes, une mesure est `stale` (2 par défaut) */
  staleApres: number;
  /** le jour de référence, ISO (AAAA-MM-JJ) ; écrit dans le dossier, jamais deviné en silence */
  auJour: string;
}

export interface Verdict {
  controle: ControleId;
  tenu: boolean;
  /** une ligne pour le dossier : ce qui est tenu, ou ce qui manque ; jamais une valeur client */
  detail: string;
}

export interface Controle {
  readonly id: ControleId;
  /** 1 (le rapport existe) → 5 (il est cohérent avec les autres) */
  readonly rang: number;
  readonly description: string;
  juger(r: RapportLu, tous: readonly RapportLu[], reglages: Reglages): Verdict;
}

const ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Les jours entiers entre deux jours ISO ; refuse une date illisible plutôt que de rendre NaN. */
export function joursEntre(de: string, a: string): number {
  if (!ISO_JOUR.test(de) || !ISO_JOUR.test(a)) throw new Error(`a day is ISO YYYY-MM-DD, got "${de}" and "${a}"`);
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(de + "T00:00:00Z")) / 86_400_000);
}

/** `fresh` sous une période de validité, `due` sous staleApres périodes, `stale` au-delà ; une
 *  mesure future est refusée. */
export function fraicheur(mesureLe: string, reglages: Reglages): Fraicheur {
  if (!(Number.isInteger(reglages.rythmeJours) && reglages.rythmeJours > 0)) throw new Error(`the validity period must be a positive integer of days, got ${reglages.rythmeJours}`);
  if (!(reglages.staleApres > 1)) throw new Error(`staleApres must exceed 1 validity period, got ${reglages.staleApres}`);
  const jours = joursEntre(mesureLe, reglages.auJour);
  if (jours < 0) throw new Error(`a measurement dated ${mesureLe} lies after the reference day ${reglages.auJour}: dates are not guessed`);
  if (jours < reglages.rythmeJours) return "fresh";
  if (jours < reglages.rythmeJours * reglages.staleApres) return "due";
  return "stale";
}

export type Registre = ReadonlyMap<ControleId, Controle>;
