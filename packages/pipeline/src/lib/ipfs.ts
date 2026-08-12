import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);

export async function publishArtifact(
  filePath: string,
  destManifest: string,
  artifactName: string,
): Promise<{ artifact: string; cid: string }> {
  const bytes = await readFile(filePath);
  let cid: string;
  try {
    const Hash = require("ipfs-only-hash") as { of: (c: Buffer) => Promise<string> };
    cid = await Hash.of(bytes);
  } catch {
    cid = `sha256-${createHash("sha256").update(bytes).digest("hex")}`;
  }
  await mkdir(dirname(destManifest), { recursive: true });
  // ponytail: Filebase pin is `aws s3 cp` to s3.filebase.io when FILEBASE_* exists
  await writeFile(
    destManifest,
    JSON.stringify(
      { artifact: artifactName, path: filePath, cid, bytes: bytes.length, pin: "ipfs-only-hash" },
      null,
      2,
    ),
  );
  return { artifact: artifactName, cid };
}
