/**
 * Le signataire, éprouvé avec une paire de clés ÉPHÉMÈRE : aucune clé de maison ne vit
 * dans la suite. Ce que le test tient : la signature écrite se vérifie ; un sceau mué ne se
 * vérifie plus ; une clé privée étrangère à la clé publique du dépôt est refusée AVANT
 * d'écrire ; le fichier de signature se nomme à côté du relevé.
 */
import { generateKeyPairSync } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { cheminSignature, signerSceau } from "./signer.ts";
import { verifierDetachee } from "./signature.ts";

function paire(): { privee: string; publique: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privee: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publique: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

test("la signature écrite se vérifie contre la clé publique, et plus après mutation du sceau", () => {
  const { privee, publique } = paire();
  const sceau = "692d499018e53e07";
  const sig = signerSceau(sceau, privee, publique);
  assert.equal(sig.alg, "Ed25519");
  assert.ok(verifierDetachee(sceau, sig, publique).valide, "la signature fraîche doit se vérifier");
  const mute = sceau.slice(0, 15) + (sceau.endsWith("7") ? "8" : "7");
  assert.equal(verifierDetachee(mute, sig, publique).valide, false, "un sceau mué ne se vérifie plus");
});

test("une clé privée qui n'est pas la paire de la clé publique du dépôt est refusée avant d'écrire", () => {
  const a = paire();
  const b = paire();
  assert.throws(() => signerSceau("692d499018e53e07", a.privee, b.publique), /not the pair of the public key/);
});

test("un sceau qui n'en est pas un est refusé", () => {
  const { privee, publique } = paire();
  assert.throws(() => signerSceau("pas-un-sceau", privee, publique), /sixteen hex characters/);
});

test("le fichier de signature vit à côté du relevé, même racine", () => {
  assert.equal(cheminSignature("/x/y/releve-public.json"), "/x/y/releve-public.signature.json");
  assert.equal(cheminSignature("profiles-2026-08-20-coeur-rendu.json"), "profiles-2026-08-20-coeur-rendu.signature.json");
});
