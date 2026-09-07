/**
 * CONTRÔLE 3 : `signed`. Le relevé public que le rapport cite porte une signature de la
 * maison, VÉRIFIÉE contre `cle-publique.pem`.
 *
 * La vérification a eu lieu dans `lireRapport` (forme détachée de `signature.ts`, Ed25519
 * sur les octets du sceau cité) ; ce contrôle lit son verdict et refuse les deux silences :
 *   · aucun relevé cité, ou cité sans signature — RIEN n'est « valide » par défaut : les
 *     quatre dépôts n'écrivent pas encore `publicRecord`, et l'échelle s'arrête là pour
 *     eux, dit tel quel (contrat : un champ absent est un état nommé, pas un trou) ;
 *   · une signature présente mais fausse — pire qu'aucune, et le détail le distingue.
 */
import type { Controle } from "../controle.ts";

export const signed: Controle = {
  id: "signed",
  rang: 3,
  description: "the cited public record's signature verifies against the repository's public key",
  juger: (r) => {
    if (r.relevePublic.signatureValide === null) {
      const pourquoi = r.relevePublic.sceau === null
        ? "cites no public record" : "cites a public record without a signature";
      return { controle: "signed", tenu: false, detail: `${r.chemin}: ${pourquoi}: nothing to verify, and nothing is called valid unverified` };
    }
    if (r.relevePublic.signatureValide === false) {
      return { controle: "signed", tenu: false,
        detail: `${r.chemin}: the cited record's signature does NOT verify against this repository's key: worse than none, and said apart` };
    }
    return { controle: "signed", tenu: true,
      detail: `${r.chemin}: cited record ${r.relevePublic.sceau}, Ed25519 signature verified against cle-publique.pem` };
  },
};
