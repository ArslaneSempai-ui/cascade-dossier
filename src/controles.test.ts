/**
 * LES CINQ CONTRÔLES, UN À UN — sur des RapportLu écrits à la main ici. Chaque contrôle a
 * son cas tenu, ses cas manqués, et ses bords : le sceau qui ment, la signature fausse
 * (pire qu'absente, dite à part), la date future qui ne fait pas planter le dossier, les
 * deux collisions de cohérence. Les titres n'imposent rien : chaque corps confronte
 * `tenu` ET le détail, parce que le détail est ce que le régulateur lira.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CONTROLES, fraicheur, type Reglages } from "./controle.ts";
import type { RapportLu } from "./rapport-lu.ts";
import { registre, absents } from "./controles/index.ts";
import { present } from "./controles/present.ts";
import { sealed } from "./controles/sealed.ts";
import { signed } from "./controles/signed.ts";
import { fresh } from "./controles/fresh.ts";
import { consistent } from "./controles/consistent.ts";

const REGLAGES: Reglages = { rythmeJours: 90, staleApres: 2, auJour: "2026-09-08" };

/** Un rapport lu sain par défaut ; chaque témoin ne dit que son écart. */
function lu(ecarts: Partial<RapportLu> = {}): RapportLu {
  return {
    chemin: "donnees.csv-measured.json", outil: "screening", version: "1",
    mesureLe: "2026-09-01", sceauPorte: "cafe0123cafe0123", sceauCalcule: "cafe0123cafe0123",
    relevePublic: { sceau: null, signatureValide: null }, sourceSceau: "ab".repeat(32),
    regle: null, ...ecarts,
  };
}

test("le registre porte les cinq contrôles du contrat, dans son ordre, et les absents se dérivent", () => {
  const r = registre();
  assert.deepEqual([...r.keys()], [...CONTROLES]);
  assert.deepEqual(absents(r), []);
  assert.deepEqual([...r.values()].map((c) => c.rang), [1, 2, 3, 4, 5]);
  const ampute = new Map([...r].filter(([id]) => id !== "signed"));
  assert.deepEqual(absents(ampute), ["signed"]);
  for (const c of r.values()) {
    const v = c.juger(lu(), [lu()], REGLAGES);
    assert.equal(v.controle, c.id, `${c.id} rend le verdict d'un autre contrôle`);
    assert.ok(v.detail.length > 10, `${c.id}: un verdict sans détail ne dit rien au régulateur`);
    assert.deepEqual(c.juger(lu(), [lu()], REGLAGES), v, `${c.id} n'est pas déterministe`);
  }
});

test("present : daté et versionné, sinon la marque manquante est NOMMÉE", () => {
  assert.equal(present.juger(lu(), [], REGLAGES).tenu, true);
  const sansDate = present.juger(lu({ mesureLe: null }), [], REGLAGES);
  assert.equal(sansDate.tenu, false);
  assert.match(sansDate.detail, /measurement day/);
  const sansVersion = present.juger(lu({ version: null }), [], REGLAGES);
  assert.equal(sansVersion.tenu, false);
  assert.match(sansVersion.detail, /version/);
  const niLunNiLautre = present.juger(lu({ mesureLe: null, version: null }), [], REGLAGES);
  assert.match(niLunNiLautre.detail, /measurement day.*nor.*version/);
});

test("sealed : aucun sceau, sceau démenti par le recalcul, sceau confirmé", () => {
  assert.equal(sealed.juger(lu(), [], REGLAGES).tenu, true);
  const sans = sealed.juger(lu({ sceauPorte: null }), [], REGLAGES);
  assert.equal(sans.tenu, false);
  assert.match(sans.detail, /present without sealed/);
  const menteur = sealed.juger(lu({ sceauPorte: "beef4567beef4567" }), [], REGLAGES);
  assert.equal(menteur.tenu, false);
  assert.match(menteur.detail, /moved after sealing/, "le sceau démenti doit crier, pas seulement manquer");
});

test("signed : jamais « valide » sans vérification, et la signature fausse est dite À PART", () => {
  const rien = signed.juger(lu(), [], REGLAGES);
  assert.equal(rien.tenu, false);
  assert.match(rien.detail, /cites no public record/);
  const citeSansSignature = signed.juger(lu({ relevePublic: { sceau: "feedface", signatureValide: null } }), [], REGLAGES);
  assert.equal(citeSansSignature.tenu, false);
  assert.match(citeSansSignature.detail, /without a signature/);
  const fausse = signed.juger(lu({ relevePublic: { sceau: "feedface", signatureValide: false } }), [], REGLAGES);
  assert.equal(fausse.tenu, false);
  assert.match(fausse.detail, /does NOT verify/, "pire qu'aucune : le détail distingue");
  const bonne = signed.juger(lu({ relevePublic: { sceau: "feedface", signatureValide: true } }), [], REGLAGES);
  assert.equal(bonne.tenu, true);
  assert.match(bonne.detail, /cle-publique\.pem/);
});

test("fresh : la règle est fraicheur(), aux bords près, et une date future ne fait pas planter", () => {
  /* Les bords de la couture d'abord, pour que le contrôle et elle ne divergent jamais.
     Les jours cités dans les messages sont ceux des réglages du cas, tenus ici. */
  assert.equal(REGLAGES.rythmeJours, 90, "le cas raisonne sur un rythme de 90 jours");
  assert.equal(REGLAGES.rythmeJours * REGLAGES.staleApres, 180, "et stale à deux rythmes : 180 jours");
  assert.equal(fraicheur("2026-06-11", REGLAGES), "fresh", "89 jours : la veille du rythme");
  assert.equal(fraicheur("2026-06-10", REGLAGES), "due", "90 jours : le rythme atteint");
  assert.equal(fraicheur("2026-03-12", REGLAGES), "stale", "180 jours : deux rythmes");
  const veille = fresh.juger(lu({ mesureLe: "2026-06-11" }), [], REGLAGES);
  assert.equal(veille.tenu, true);
  assert.match(veille.detail, /89 day\(s\).*fresh/);
  const due = fresh.juger(lu({ mesureLe: "2026-06-10" }), [], REGLAGES);
  assert.equal(due.tenu, false);
  assert.match(due.detail, /due/, "le mot exact : une mesure d'hier et une d'il y a un an ne se relancent pas pareil");
  assert.match(fresh.juger(lu({ mesureLe: "2026-03-12" }), [], REGLAGES).detail, /stale/);
  const future = fresh.juger(lu({ mesureLe: "2026-09-09" }), [], REGLAGES);
  assert.equal(future.tenu, false);
  assert.match(future.detail, /dates are not guessed/, "le refus de la couture voyage dans le verdict, il ne plante pas le dossier");
  assert.equal(fresh.juger(lu({ mesureLe: null }), [], REGLAGES).tenu, false);
});

test("consistent : une question par rapport, un jeu de données par mesure, et rien ne collide sur une absence", () => {
  const a = lu({ chemin: "a.json" });
  const seul = consistent.juger(a, [a, lu({ chemin: "b.json", outil: "monitoring", sourceSceau: "cd".repeat(32) })], REGLAGES);
  assert.equal(seul.tenu, true);
  const jumeau = lu({ chemin: "b.json", sourceSceau: "cd".repeat(32) });
  const memeQuestion = consistent.juger(a, [a, jumeau], REGLAGES);
  assert.equal(memeQuestion.tenu, false);
  assert.match(memeQuestion.detail, /2 reports answer the screening question.*b\.json/);
  const memeJeu = lu({ chemin: "c.json", outil: "monitoring" });
  const memeSource = consistent.juger(a, [a, memeJeu], REGLAGES);
  assert.equal(memeSource.tenu, false);
  assert.match(memeSource.detail, /same measured dataset.*c\.json/, "le même jeu compté deux fois, même sous un autre outil");
  const sansEmpreinte = lu({ chemin: "d.json", outil: "routing", sourceSceau: null });
  const autreSans = lu({ chemin: "e.json", outil: "scoring", sourceSceau: null });
  assert.equal(consistent.juger(sansEmpreinte, [sansEmpreinte, autreSans], REGLAGES).tenu, true,
    "deux absences d'empreinte ne sont pas le même jeu : on ne compare pas des riens");
});
