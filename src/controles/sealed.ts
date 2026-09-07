/**
 * CONTRÔLE 2 : `sealed`. Le rapport porte un sceau, et le sceau RECALCULÉ le confirme.
 *
 * Jamais « vérifié » sans recalcul (contrat §4) : `lireRapport` a recalculé l'empreinte du
 * contenu avec l'`empreinte.ts` de la maison (la même fonction que les quatre outils), et
 * ce contrôle ne fait que confronter les deux chaînes. Trois issues, chacune dite :
 * aucun sceau porté (l'état du contrat « present sans sealed ») ; un sceau porté que le
 * contenu dément (le rapport a bougé APRÈS son émission — c'est précisément ce que le
 * sceau existe pour crier) ; un sceau confirmé.
 */
import type { Controle } from "../controle.ts";

export const sealed: Controle = {
  id: "sealed",
  rang: 2,
  description: "the report carries a seal and its recomputed content hash confirms it",
  juger: (r) => {
    if (r.sceauPorte === null) {
      return { controle: "sealed", tenu: false, detail: `${r.chemin}: carries no seal: present without sealed, as the contract names it` };
    }
    if (r.sceauPorte !== r.sceauCalcule) {
      return { controle: "sealed", tenu: false,
        detail: `${r.chemin}: the carried seal ${r.sceauPorte} does not match the recomputed ${r.sceauCalcule}: the content moved after sealing` };
    }
    return { controle: "sealed", tenu: true, detail: `${r.chemin}: seal ${r.sceauPorte} recomputed and matching` };
  },
};
