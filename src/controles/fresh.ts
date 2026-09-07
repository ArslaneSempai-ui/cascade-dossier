/**
 * CONTRÔLE 4 : `fresh`. La mesure date de moins d'un rythme de recertification.
 *
 * La règle est `fraicheur()` de la couture, pas une réécriture : `fresh` sous un rythme,
 * `due` sous `staleApres` rythmes, `stale` au-delà — le contrôle ne tient QUE `fresh`,
 * mais son détail porte le mot exact et le compte de jours, parce qu'un dossier qui dit
 * seulement « pas frais » enverrait relancer une mesure d'hier comme une d'il y a un an.
 * Sans date de mesure, rien à juger : non tenu, nommé. Une date future est un REFUS de
 * `fraicheur` (« dates are not guessed ») : le verdict le transporte au lieu de planter —
 * un contrôle qui lève prive le dossier de tous ses autres verdicts.
 */
import { fraicheur, joursEntre, type Controle } from "../controle.ts";

export const fresh: Controle = {
  id: "fresh",
  rang: 4,
  description: "the measurement is younger than one declared recertification validity period",
  juger: (r, _tous, reglages) => {
    if (r.mesureLe === null) {
      return { controle: "fresh", tenu: false, detail: `${r.chemin}: no measurement day, so freshness cannot be judged` };
    }
    let etat: "fresh" | "due" | "stale";
    try {
      etat = fraicheur(r.mesureLe, reglages);
    } catch (e) {
      return { controle: "fresh", tenu: false, detail: `${r.chemin}: ${e instanceof Error ? e.message : String(e)}` };
    }
    const jours = joursEntre(r.mesureLe, reglages.auJour);
    const detail = `${r.chemin}: measured ${jours} day(s) before ${reglages.auJour}, validity period ${reglages.rythmeJours} day(s): ${etat}`;
    return { controle: "fresh", tenu: etat === "fresh", detail };
  },
};
