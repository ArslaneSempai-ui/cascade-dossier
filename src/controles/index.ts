/**
 * LE REGISTRE DES CONTRÔLES (lot D1 le remplit ; ce fichier n'est que sa place). Tant
 * qu'aucun contrôle n'est livré, le registre est vide et `absents()` DÉRIVE les cinq ids du
 * contrat : rien n'est récité, et la garde de la frontière voit un sous-dossier à énumérer.
 */
import { CONTROLES, type ControleId, type Registre, type Controle } from "../controle.ts";
import { present } from "./present.ts";
import { sealed } from "./sealed.ts";
import { signed } from "./signed.ts";
import { fresh } from "./fresh.ts";
import { consistent } from "./consistent.ts";

const LISTE: Controle[] = [present, sealed, signed, fresh, consistent];

export function registre(): Registre {
  const r = new Map<ControleId, Controle>();
  for (const c of LISTE) {
    if (r.has(c.id)) throw new Error(`control "${c.id}" registered twice`);
    r.set(c.id, c);
  }
  return r;
}

export function absents(r: Registre = registre()): ControleId[] {
  return CONTROLES.filter((c) => !r.has(c));
}
