/**
 * CONTRÔLE 1 : `present`. Le rapport est là, et il est daté et versionné.
 *
 * Le premier barreau de l'échelle, et il n'est pas un vert vide : un JSON lisible qui dit
 * son outil (c'est `lireRapport` qui l'exige) mais qui ne sait dire NI quand il a mesuré
 * NI quelle version l'a écrit n'est pas une mesure présente — c'est un fichier. La date
 * conditionne `fresh` trois barreaux plus haut ; sans elle, l'échelle n'a pas de sol.
 * Le détail nomme la marque manquante, jamais une valeur du client.
 */
import type { Controle } from "../controle.ts";

export const present: Controle = {
  id: "present",
  rang: 1,
  description: "the report exists as a measurement: readable, tool-identified, dated and versioned",
  juger: (r) => {
    const manques = [
      ...(r.mesureLe === null ? ["its measurement day"] : []),
      ...(r.version === null ? ["its version"] : []),
    ];
    return manques.length === 0
      ? { controle: "present", tenu: true, detail: `${r.chemin}: a ${r.outil} report, measured ${r.mesureLe}, version ${r.version}` }
      : { controle: "present", tenu: false, detail: `${r.chemin}: a ${r.outil} report that cannot state ${manques.join(" nor ")}` };
  },
};
