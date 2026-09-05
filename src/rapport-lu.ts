/**
 * CE QUE LE DOSSIER LIT D'UN RAPPORT, quel que soit l'outil : jamais son contenu client,
 * seulement ses marques : l'outil, la version, le jour de mesure, le sceau porté et le sceau
 * recalculé, le relevé public cité et sa signature, l'empreinte du jeu de données mesuré,
 * la règle de recommandation en une ligne. Le lot D1 livre `lireRapport(chemin)` contre les
 * formats RÉELS des quatre dépôts de la suite ; cette interface est ce que D2 consomme.
 */
import type { OutilId } from "./controle.ts";

export interface RapportLu {
  /** le NOM du fichier seulement (basename) : le chemin complet ne sort jamais */
  chemin: string;
  outil: OutilId;
  /** null si le rapport ne la porte pas : nommé, pas deviné */
  version: string | null;
  /** ISO jour ; null si absent */
  mesureLe: string | null;
  /** l'empreinte écrite dans le rapport ; null si absente */
  sceauPorte: string | null;
  /** l'empreinte recalculée sur le contenu par empreinte.ts (la même fonction que les quatre outils) */
  sceauCalcule: string;
  /** le relevé public cité par le rapport, et sa signature vérifiée avec cle-publique.pem ; null = rien à vérifier */
  relevePublic: { sceau: string | null; signatureValide: boolean | null };
  /** l'empreinte du jeu de données mesuré, si le rapport la porte : deux rapports sur la même source sont un doublon */
  sourceSceau: string | null;
  /** la règle de recommandation, en une ligne, si le rapport la porte */
  regle: string | null;
}
