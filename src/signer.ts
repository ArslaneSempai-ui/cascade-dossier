/**
 * SIGNER un relevé public de la suite : la forme détachée que `signature.ts` vérifie.
 *
 *   npm run signer -- <releve.json> [--cle ~/.cascade/cle-privee.pem]
 *   → écrit <releve>.signature.json = { alg: "Ed25519", cle: <empreinte de cle-publique.pem>,
 *     valeur: <signature Ed25519, base64, des octets UTF-8 du sceau `empreinte` du relevé> }
 *
 * Pourquoi le SCEAU et pas le fichier : le sceau est déjà l'empreinte canonique du contenu
 * (empreinte.ts, la même dans les cinq outils) ; signer ses octets signe le contenu sans
 * dépendre de l'indentation ou de l'ordre des clés du JSON sur disque. Le Dossier (lot D2,
 * `lireRelevePublic`) lit le fichier de signature à côté du relevé et le vérifie contre
 * `cle-publique.pem` : le contrôle `signed` ne tient que si la vérification passe.
 *
 * La clé privée n'est jamais lue ailleurs qu'ici, jamais écrite, jamais affichée : une
 * commande qui la citerait dans une erreur la ferait transiter par un journal. Le chemin par
 * défaut est celui de la maison (~/.cascade/cle-privee.pem), hors de tout dépôt.
 * La clé publique vérifiée est celle DU DÉPÔT où le relevé vit (cle-publique.pem à côté), et
 * la signature est relue immédiatement avec elle : un relevé signé par une autre clé que
 * celle publiée n'est jamais écrit.
 */
import { createPrivateKey, createPublicKey, sign as signerBrut } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { empreinteDeCle, verifierDetachee, type SignatureDetachee } from "./signature.ts";

export type SignatureEcrite = { alg: "Ed25519"; cle: string; valeur: string };

/** La signature détachée d'un sceau : pure, testable avec une paire de clés éphémère. */
export function signerSceau(sceau: string, clePriveePem: string, clePubliquePem: string): SignatureEcrite {
  if (typeof sceau !== "string" || !/^[0-9a-f]{16}$/.test(sceau)) {
    throw new Error(`a seal is sixteen hex characters; got ${JSON.stringify(sceau)}`);
  }
  const privee = createPrivateKey(clePriveePem);
  const publique = createPublicKey(clePubliquePem);
  // la clé privée donnée doit être celle de la clé publique du dépôt : sinon la signature
  // écrite ne se vérifierait jamais, et on ne le saurait qu'au premier Dossier
  const derivee = createPublicKey(privee).export({ type: "spki", format: "pem" }).toString();
  const publiee = publique.export({ type: "spki", format: "pem" }).toString();
  if (derivee.trim() !== publiee.trim()) {
    throw new Error("the private key given is not the pair of the public key published in this repository; nothing is signed.");
  }
  const valeur = signerBrut(null, Buffer.from(sceau, "utf8"), privee).toString("base64");
  const sig: SignatureEcrite = { alg: "Ed25519", cle: empreinteDeCle(clePubliquePem), valeur };
  const relue = verifierDetachee(sceau, sig as SignatureDetachee, clePubliquePem);
  if (!relue.valide) throw new Error(`the signature just written does not verify: ${relue.motif}`);
  return sig;
}

/** Le nom du fichier de signature d'un relevé : à côté, même racine, `.signature.json`. */
export function cheminSignature(releve: string): string {
  return join(dirname(releve), basename(releve).replace(/\.json$/, "") + ".signature.json");
}

function principal(): void {
  // deux arguments, lus à la main : le relevé, et --cle=<pem> ; tout autre drapeau est refusé
  const argv = process.argv.slice(2);
  const libres = argv.filter((a) => !a.startsWith("--"));
  const drapeaux = argv.filter((a) => a.startsWith("--"));
  const inconnus = drapeaux.filter((a) => !a.startsWith("--cle="));
  if (inconnus.length > 0) {
    console.error(`unknown flag(s): ${inconnus.join(", ")}. Only --cle=<private key PEM> is read.`);
    process.exit(2);
  }
  const args = { libres, valeurs: { cle: drapeaux.find((a) => a.startsWith("--cle="))?.slice("--cle=".length) } };
  const releve = args.libres[0];
  if (!releve) {
    console.error("usage: npm run signer -- <releve.json> [--cle <private key PEM>]");
    process.exit(2);
  }
  if (!existsSync(releve)) {
    console.error(`${releve}: no such file.`);
    process.exit(2);
  }
  const brut = JSON.parse(readFileSync(releve, "utf8")) as { empreinte?: unknown };
  if (typeof brut.empreinte !== "string") {
    console.error(`${releve} carries no seal (\`empreinte\`): seal it first (npm run sceller), then sign.`);
    process.exit(1);
  }
  const cheminCle = args.valeurs.cle ?? join(homedir(), ".cascade", "cle-privee.pem");
  if (!existsSync(cheminCle)) {
    console.error("the private key is not on this machine; the signing gesture belongs to whoever holds it.");
    process.exit(1);
  }
  const clePublique = join(dirname(releve), "cle-publique.pem");
  if (!existsSync(clePublique)) {
    console.error(`${clePublique}: the repository holding the record must publish its cle-publique.pem beside it.`);
    process.exit(1);
  }
  const sig = signerSceau(brut.empreinte, readFileSync(cheminCle, "utf8"), readFileSync(clePublique, "utf8"));
  const sortie = cheminSignature(releve);
  writeFileSync(sortie, JSON.stringify(sig, null, 2) + "\n");
  console.log(`${sortie} written: Ed25519 over seal ${brut.empreinte}, key ${sig.cle}, verified against ${basename(clePublique)}.`);
}

if (process.argv[1] && /signer\.ts$/.test(process.argv[1])) principal();
