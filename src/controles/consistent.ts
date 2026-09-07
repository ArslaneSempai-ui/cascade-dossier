/**
 * CONTRÔLE 5 : `consistent`. Le rapport est cohérent avec le RESTE du dossier.
 *
 * Le seul contrôle qui lise `tous` : les quatre premiers jugent un rapport seul, celui-ci
 * juge sa place dans l'ensemble. Deux collisions, chacune nommée :
 *   · deux rapports pour la MÊME QUESTION (même outil) — le dossier ne peut pas dire
 *     lequel fait foi, et choisir en silence serait choisir pour le régulateur ;
 *   · deux rapports sur le MÊME JEU DE DONNÉES (même empreinte de source) — la même mesure
 *     comptée deux fois, quel que soit l'outil qui la présente (contrat §2).
 * Un rapport sans empreinte de source ne déclenche pas la seconde collision : on ne
 * compare pas des absences. Le détail compte les collisions, jamais une valeur client.
 */
import type { Controle } from "../controle.ts";

export const consistent: Controle = {
  id: "consistent",
  rang: 5,
  description: "the report collides with no other: one report per question, one per measured dataset",
  juger: (r, tous) => {
    const memeOutil = tous.filter((x) => x !== r && x.outil === r.outil);
    const memeSource = r.sourceSceau === null ? []
      : tous.filter((x) => x !== r && x.sourceSceau === r.sourceSceau);
    if (memeOutil.length > 0) {
      return { controle: "consistent", tenu: false,
        detail: `${r.chemin}: ${memeOutil.length + 1} reports answer the ${r.outil} question (${memeOutil.map((x) => x.chemin).join(", ")}); the dossier cannot say which one stands` };
    }
    if (memeSource.length > 0) {
      return { controle: "consistent", tenu: false,
        detail: `${r.chemin}: the same measured dataset also appears in ${memeSource.map((x) => x.chemin).join(", ")}; one measurement must not count twice` };
    }
    return { controle: "consistent", tenu: true,
      detail: `${r.chemin}: alone on the ${r.outil} question${r.sourceSceau === null ? ", source content hash not carried (nothing to cross-check)" : ", alone on its dataset"}` };
  },
};
