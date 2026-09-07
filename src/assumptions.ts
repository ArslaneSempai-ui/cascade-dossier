/**
 * What is not measured — and never dressed as if it were.
 *
 * The dossier verifies seals, dates and signatures; the three figures it cannot know are
 * declared here: the recertification VALIDITY PERIOD the bank commits to (90 days by
 * default, the same default the suite's recertify commands print), how many validity periods
 * may pass before a measurement is STALE rather than merely due, and what a reviewer's minute
 * costs when
 * the report prices the reading of a question. Each is assumed, with unit and bounds,
 * and the dossier WRITES the settings it judged under: a verdict without its yardstick
 * would read as an absolute.
 */
import type { Reglages } from "./controle.ts";

export type Provenance = "retrieved" | "measured" | "assumed" | "chosen" | "synthetic";

export type Assumptions = {
  /** The recertification validity period, in days. Assumed: the figure the bank declares. */
  rythmeJours: number;
  /** After this many validity periods without a fresh measurement, a question is stale. Assumed. */
  staleApres: number;
  /** Minutes a reviewer spends reading one question of the dossier. Assumed. */
  minutesParQuestion: number;
};

export const ASSUMPTIONS: Assumptions = {
  rythmeJours: 90,
  staleApres: 2,
  minutesParQuestion: 15,
};

export const STATUSES: Record<keyof Assumptions, Provenance> = {
  rythmeJours: "assumed",
  staleApres: "assumed",
  minutesParQuestion: "assumed",
};

export const UNITS: Record<keyof Assumptions, string> = {
  rythmeJours: "days/validity period",
  staleApres: "validity periods until stale",
  minutesParQuestion: "minutes/question",
};

export const BOUNDS: Record<keyof Assumptions, [number, number]> = {
  rythmeJours: [7, 365],
  staleApres: [2, 12],
  minutesParQuestion: [1, 240],
};

const ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Les réglages d'une passe : la période de validité du client (`--validity`, entier strict :
 * le motif décide, la conversion ne voit que ce qu'il accepte), le jour de référence (`--as-of`,
 * ISO strict ; défaut : aujourd'hui, ET ÉCRIT dans le dossier : une date devinée en
 * silence est une date que personne ne peut contester).
 */
export function reglagesAvec(brutRythme?: string, brutAsOf?: string,
  aujourdHui = new Date().toISOString().slice(0, 10)): Reglages {
  let rythmeJours = ASSUMPTIONS.rythmeJours;
  if (brutRythme !== undefined) {
    if (!/^\d{1,4}$/.test(brutRythme) || Number(brutRythme) < 1) {
      throw new Error(`--validity=${brutRythme} is not a validity period this tool reads. It\n`
        + `  wants a whole number of days, like --validity=90, the recertification validity\n`
        + `  period your bank declares.`);
    }
    rythmeJours = Number(brutRythme);
  }
  let auJour = aujourdHui;
  if (brutAsOf !== undefined) {
    if (!ISO_JOUR.test(brutAsOf) || Number.isNaN(Date.parse(brutAsOf))) {
      throw new Error(`--as-of=${brutAsOf} is not a day this tool reads. It wants ISO YYYY-MM-DD,\n`
        + `  the reference day freshness is judged against, written into the dossier.`);
    }
    auJour = brutAsOf;
  }
  return { rythmeJours, staleApres: ASSUMPTIONS.staleApres, auJour };
}

export function ligneDHypothese(cle: keyof Assumptions, a: Assumptions = ASSUMPTIONS): string {
  return `${cle} = ${a[cle]} ${UNITS[cle]} (${STATUSES[cle]})`;
}
