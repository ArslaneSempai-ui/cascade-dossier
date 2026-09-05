/**
 * LE LECTEUR, ÉPROUVÉ CONTRE LES QUATRE FORMATS — des rapports factices MINIMAUX, modelés
 * sur ce que les writers des dépôts écrivent vraiment (your-cases.ts du vert, your-alerts.ts
 * du rouge et du bleu, relevés du 8/09), et la convention de famille pour l'améthyste tant
 * que L3 n'a pas livré. Puis la signature : la forme détachée et la forme document, avec
 * une paire Ed25519 engendrée ICI — la vraie clé de la maison n'a rien à faire dans un test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signerBrut } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lireRapport } from "./rapport-lu.ts";
import { empreinteDuReleve } from "./empreinte.ts";
import { empreinteDeCle, verifier, verifierDetachee } from "./signature.ts";

const dossier = mkdtempSync(join(tmpdir(), "dossier-lu-"));
test.after(() => rmSync(dossier, { recursive: true, force: true }));

/** Un rapport factice minimal du format réel de chaque outil, scellé ou non. */
function rapportFactice(kind: string, ecarts: Record<string, unknown> = {}, sceller = true): string {
  const r: Record<string, unknown> = {
    kind, version: 1, measuredAt: "2026-09-01T22:00:00.000Z",
    source: { file: "donnees.csv", sha256: "ab".repeat(32), cases: 120 },
    ...ecarts,
  };
  if (sceller) r.empreinte = empreinteDuReleve(r);
  const chemin = join(dossier, `${kind}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(chemin, JSON.stringify(r));
  return chemin;
}

test("les quatre formats de la suite se lisent, chacun vers son outil", () => {
  const attendus: [string, string][] = [
    ["cascade-client-record", "routing"],
    ["screening-client-record", "screening"],
    ["monitoring-client-record", "monitoring"],
    /* L3 de l'améthyste n'a pas livré : la convention de famille, remplacée par son message. */
    ["scoring-client-record", "scoring"],
  ];
  for (const [kind, outil] of attendus) {
    const r = lireRapport(rapportFactice(kind));
    assert.equal(r.outil, outil);
    assert.equal(r.version, "1");
    assert.equal(r.mesureLe, "2026-09-01", "le JOUR de measuredAt, jamais l'heure");
    assert.equal(r.sceauPorte, r.sceauCalcule, "le sceau recalculé confirme le sceau posé");
    assert.equal(r.sourceSceau, "ab".repeat(32));
    assert.equal(r.relevePublic.sceau, null);
    assert.equal(r.relevePublic.signatureValide, null, "aucun relevé cité : rien à vérifier, jamais « valide »");
    assert.ok(!r.chemin.includes("/"), "le NOM du fichier seulement : un chemin porterait le nom d'utilisateur");
  }
});

test("les refus du lecteur disent quoi corriger, sans citer que le nom du fichier", () => {
  assert.throws(() => lireRapport(join(dossier, "absent.json")), /unreadable file/);
  const pasJson = join(dossier, "pas.json");
  writeFileSync(pasJson, "{coupé");
  assert.throws(() => lireRapport(pasJson), /not readable JSON/);
  const sansKind = join(dossier, "sans-kind.json");
  writeFileSync(sansKind, JSON.stringify({ version: 1 }));
  assert.throws(() => lireRapport(sansKind), /no "kind" field[\s\S]*cascade-client-record/);
  const horsSuite = join(dossier, "hors.json");
  writeFileSync(horsSuite, JSON.stringify({ kind: "invoicing-client-record" }));
  assert.throws(() => lireRapport(horsSuite), /not a tool of this suite/);
});

test("une marque absente est un null nommé, jamais deviné", () => {
  const r = lireRapport(rapportFactice("screening-client-record",
    { measuredAt: "pas une date", version: undefined, source: undefined }, false));
  assert.equal(r.mesureLe, null, "une date illisible n'est pas une date");
  assert.equal(r.version, null);
  assert.equal(r.sceauPorte, null);
  assert.equal(r.sourceSceau, null);
  assert.ok(r.sceauCalcule.length === 16, "le sceau se recalcule même sur un rapport qui n'en porte pas");
});

/* ─── la signature : une paire engendrée ici, jamais la clé de la maison ─── */

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const pemPublique = publicKey.export({ type: "spki", format: "pem" }) as string;
const signer = (octets: string): string =>
  signerBrut(null, Buffer.from(octets, "utf8"), privateKey).toString("base64");
const blocDe = (message: string) => ({ alg: "Ed25519", cle: empreinteDeCle(pemPublique), valeur: signer(message) });

test("la forme détachée : la signature du sceau cité se vérifie, et chaque refus est nommé", () => {
  const sceau = "0123456789abcdef";
  assert.equal(verifierDetachee(sceau, blocDe(sceau), pemPublique).valide, true);
  assert.equal(verifierDetachee("autre-sceau", blocDe(sceau), pemPublique).valide, false,
    "la signature d'un autre message ne vaut rien ici");
  assert.match(verifierDetachee(sceau, { ...blocDe(sceau), alg: "RSA" }, pemPublique).motif, /only Ed25519/);
  assert.match(verifierDetachee(sceau, { ...blocDe(sceau), extra: 1 } as never, pemPublique).motif, /nothing signs/,
    "une quatrième clé dans le bloc est un canal, refusé avant de le devenir");
  assert.match(verifierDetachee(sceau, { ...blocDe(sceau), cle: "beef".repeat(8) }, pemPublique).motif, /other than the one/);
});

test("un rapport qui cite son relevé public signé passe par la vérification, dans les deux sens", () => {
  const sceau = "feedfacefeedface";
  const bon = lireRapport(rapportFactice("monitoring-client-record",
    { publicRecord: { seal: sceau, signature: blocDe(sceau) } }), pemPublique);
  assert.equal(bon.relevePublic.sceau, sceau);
  assert.equal(bon.relevePublic.signatureValide, true);
  const faux = lireRapport(rapportFactice("monitoring-client-record",
    { publicRecord: { seal: "autre-sceau-cite-", signature: blocDe(sceau) } }), pemPublique);
  assert.equal(faux.relevePublic.signatureValide, false, "un sceau retouché fait mentir la signature");
  const muet = lireRapport(rapportFactice("monitoring-client-record",
    { publicRecord: { seal: sceau } }), pemPublique);
  assert.equal(muet.relevePublic.signatureValide, null, "cité sans signature : rien à vérifier");
});

test("la forme document : le rapport signé entier, et les gardes payées tiennent encore", () => {
  const donnees = '<script type="application/json" id="rapport">{"n":42}</script>';
  const construire = (prefixe: string, suffixe: string): string => {
    const corps = prefixe + donnees + suffixe;
    const bloc = JSON.stringify(blocDe(corps));
    return prefixe + donnees + '<script type="application/json" id="signature">' + bloc + "</script>" + suffixe;
  };
  const authentique = construire("<html>", "</html>");
  assert.equal(verifier(authentique, pemPublique).valide, true);
  /* Un octet ajouté APRÈS le bloc de signature tombe dans le corps signé : refusé. */
  assert.equal(verifier(authentique + "<style>.x{}</style>", pemPublique).valide, false,
    "ce qui suit la signature est signé aussi : le style ajouté a déjà réécrit un chiffre une fois");
  /* Un chiffre changé dans le document : refusé. */
  assert.equal(verifier(authentique.replace('{"n":42}', '{"n":43}'), pemPublique).valide, false);
  const sansBloc = verifier("<html>rien</html>", pemPublique);
  assert.ok(!sansBloc.valide && /not a signed report/.test(sansBloc.motif));
});
