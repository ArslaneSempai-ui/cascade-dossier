/**
 * LE REGISTRE DES CONTRÔLES (lot D1 le remplit ; ce fichier n'est que sa place). Tant
 * qu'aucun contrôle n'est livré, le registre est vide et `absents()` DÉRIVE les cinq ids du
 * contrat : rien n'est récité, et la garde de la frontière voit un sous-dossier à énumérer.
 */
import { CONTROLES, type ControleId, type Registre } from "../controle.ts";

export function registre(): Registre {
  return new Map();
}

export function absents(r: Registre = registre()): ControleId[] {
  return CONTROLES.filter((c) => !r.has(c));
}
