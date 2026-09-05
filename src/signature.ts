/**
 * VÉRIFIER UNE SIGNATURE DE LA MAISON — la bibliothèque que les contrôles emploient.
 *
 * REPRIS de `verifier-rapport.mjs`, à l'identique dans la logique : ce fichier-là reste le
 * script PUBLIC autonome qu'un auditeur lit en entier avant de le lancer ; celui-ci est le
 * même verdict, importable par le contrôle `signed`. Chaque garde ci-dessous a été payée
 * par une tentative de faux réelle (quinze, lors du durcissement du vert) : la fermeture
 * de bloc à la règle du NAVIGATEUR (`</script` + espace passait), le corps signé = le
 * document PRIVÉ de son seul bloc de signature (un `<style>` ajouté après réécrivait les
 * chiffres affichés), l'interdiction du `<` dans le bloc, les trois clés attendues et pas
 * une de plus (des octets non signés dans un document « vérifié » sont un canal), la
 * dernière ouverture de bloc (une césure déplaçable est une césure choisie par l'attaquant).
 * Les alléger ici referait le chemin inverse.
 *
 * S'y AJOUTE la forme DÉTACHÉE : un rapport client qui cite son relevé public peut porter
 * `publicRecord.signature = { alg, cle, valeur }` sur les octets du SCEAU cité. Même
 * algorithme, même clé, mêmes refus ; seule la matière signée change (une chaîne courte au
 * lieu d'un document). Rien ne se dit « valide » sans recalcul contre `cle-publique.pem`.
 */
import { createPublicKey, verify as verifierBrut, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEBUT_DONNEES = '<script type="application/json" id="rapport">';
const DEBUT_SIGNATURE = '<script type="application/json" id="signature">';
const FIN = "</script>";

/** La clé publique de la maison, lue depuis le dépôt : jamais une clé par défaut en dur. */
export function clePubliqueMaison(): string {
  return readFileSync(fileURLToPath(new URL("../cle-publique.pem", import.meta.url)), "utf8");
}

/** Extrait la chaîne exacte d'un bloc, sans la reconstruire. */
export function bloc(contenu: string, ouverture: string): string | null {
  const i = contenu.indexOf(ouverture);
  if (i === -1) return null;
  const j = contenu.indexOf(FIN, i + ouverture.length);
  if (j === -1) return null;
  return contenu.slice(i + ouverture.length, j);
}

export function empreinteDeCle(pem: string): string {
  return createHash("sha256").update(pem.replace(/\r\n/g, "\n").trim() + "\n").digest("hex").slice(0, 32);
}

export type VerdictSignature =
  | { valide: true; donnees: unknown; octets: number }
  | { valide: false; motif: string };

export type SignatureDetachee = { alg?: unknown; cle?: unknown; valeur?: unknown };

/** Les trois clés attendues d'un bloc de signature ; une quatrième est un canal, refusé. */
const ATTENDUES = ["alg", "cle", "valeur"];

/** Les refus communs aux deux formes : algorithme, clés du bloc, empreinte de la clé. */
function refusDeBloc(sig: Record<string, unknown>, clePubliquePem: string): string | null {
  if (sig.alg !== "Ed25519") return `unexpected algorithm "${String(sig.alg)}" — only Ed25519 is recognised.`;
  const inconnues = Object.keys(sig).filter((k) => !ATTENDUES.includes(k));
  if (inconnues.length > 0) {
    return `the signature block carries ${inconnues.length} field(s) nothing signs: ${inconnues.join(", ")}.\n`
      + `  Only ${ATTENDUES.join(", ")} are expected: unsigned bytes inside a document presented\n`
      + `  as verified are a channel, refused before they become one.`;
  }
  const attendue = empreinteDeCle(clePubliquePem);
  if (sig.cle !== attendue) {
    return `signed by a key other than the one in this repository.\n`
      + `  carried    : ${String(sig.cle)}\n  repository : ${attendue}`;
  }
  return null;
}

/**
 * La forme DÉTACHÉE : la signature porte sur les octets UTF-8 du message donné (le sceau
 * d'un relevé public cité). Le message vient de l'appelant, jamais du bloc lui-même : une
 * signature qui transporterait sa propre matière se vérifierait toute seule.
 */
export function verifierDetachee(
  message: string, sig: SignatureDetachee, clePubliquePem: string = clePubliqueMaison(),
): { valide: boolean; motif: string } {
  if (typeof sig !== "object" || sig === null) return { valide: false, motif: "the signature is not a block." };
  const refus = refusDeBloc(sig as Record<string, unknown>, clePubliquePem);
  if (refus !== null) return { valide: false, motif: refus };
  if (typeof sig.valeur !== "string" || sig.valeur.length === 0) {
    return { valide: false, motif: "the signature block carries no value." };
  }
  let ok: boolean;
  try {
    ok = verifierBrut(null, Buffer.from(message, "utf8"), createPublicKey(clePubliquePem), Buffer.from(sig.valeur, "base64"));
  } catch (e) {
    return { valide: false, motif: `verification failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  return ok
    ? { valide: true, motif: "Ed25519 signature over the cited seal, verified against the repository key." }
    : { valide: false, motif: "the signature does not match the cited seal." };
}

/**
 * La forme DOCUMENT : le rapport HTML signé de la maison. Logique identique au script
 * public, commentaire par commentaire là-bas ; ici seule la conclusion de chaque garde.
 */
export function verifier(contenu: string, clePubliquePem: string = clePubliqueMaison()): VerdictSignature {
  const donnees = bloc(contenu, DEBUT_DONNEES);
  if (donnees === null) return { valide: false, motif: "no data block: this file is not a signed report." };
  if (contenu.lastIndexOf(DEBUT_SIGNATURE) === -1) return { valide: false, motif: "the report carries no signature." };

  /* La fin du bloc à la règle du NAVIGATEUR (`</script` + espace/tab/saut/slash/>) : les
     deux frontières divergent sinon, et l'écart est exactement l'espace de l'attaque. */
  const debut = contenu.lastIndexOf(DEBUT_SIGNATURE);
  const apres = contenu.slice(debut + DEBUT_SIGNATURE.length);
  const m = apres.match(/<\/script[\s/>]/i);
  if (!m) return { valide: false, motif: "the signature block is never closed." };
  const finBloc = debut + DEBUT_SIGNATURE.length + m.index!;
  const finFermeture = finBloc + apres.slice(m.index!).indexOf(">") + 1;
  if (finFermeture <= finBloc) return { valide: false, motif: "the signature block's closing tag is truncated." };

  /* Aucun `<` dans le bloc : une signature authentique n'en porte jamais, et c'est le
     caractère qui rouvre une balise depuis les octets exclus. */
  if (contenu.slice(debut + DEBUT_SIGNATURE.length, finBloc).includes("<")) {
    return { valide: false, motif:
      "the signature block contains a \"<\": an authentic signature never carries one.\n"
      + "  That character is what reopens a tag from inside the excluded bytes." };
  }

  const brutSignature = contenu.slice(debut + DEBUT_SIGNATURE.length, finBloc);
  let sig: Record<string, unknown>;
  try { sig = JSON.parse(brutSignature) as Record<string, unknown>; }
  catch { return { valide: false, motif: "the signature block is not readable JSON." }; }
  const refus = refusDeBloc(sig, clePubliquePem);
  if (refus !== null) return { valide: false, motif: refus };

  /* Le corps signé : le document PRIVÉ de son seul bloc de signature — ce qui précède ET
     ce qui suit, coupé au DERNIER bloc pour qu'un bloc ajouté ne déplace pas la césure. */
  const corps = contenu.slice(0, debut) + contenu.slice(finFermeture);
  if (corps.trim().length === 0) return { valide: false, motif: "the signed document is empty." };

  let ok: boolean;
  try {
    ok = verifierBrut(null, Buffer.from(corps, "utf8"), createPublicKey(clePubliquePem), Buffer.from(String(sig.valeur), "base64"));
  } catch (e) {
    return { valide: false, motif: `verification failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!ok) return { valide: false, motif: "the signature does not match the content: this report was altered after it was issued." };

  let data: unknown;
  try { data = JSON.parse(donnees); }
  catch { return { valide: false, motif: "the signature is good but the data is not readable JSON." }; }
  return { valide: true, donnees: data, octets: Buffer.byteLength(corps, "utf8") };
}
