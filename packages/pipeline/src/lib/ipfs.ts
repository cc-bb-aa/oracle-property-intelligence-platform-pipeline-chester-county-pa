import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/** Content-addressed id (sha256 hex). Real IPFS CIDv1 can replace this when Filebase is configured. */
export function contentCid(bytes: Buffer): string {
  const hex = createHash("sha256").update(bytes).digest("hex");
  return `sha256-${hex}`;
}

export async function publishArtifact(
  filePath: string,
  destManifest: string,
  artifactName: string,
): Promise<{ artifact: string; cid: string }> {
  const bytes = await readFile(filePath);
  const cid = contentCid(bytes);
  await mkdir(dirname(destManifest), { recursive: true });
  const rec = {
    artifact: artifactName,
    path: filePath,
    cid,
    bytes: bytes.length,
    publishedAt: new Date().toISOString(),
    pin: process.env.FILEBASE_BUCKET ? "filebase-pending" : "local-content-address",
  };
  await writeFile(destManifest, JSON.stringify(rec, null, 2));
  return { artifact: artifactName, cid };
}
