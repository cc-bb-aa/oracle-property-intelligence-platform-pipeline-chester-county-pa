import { createHash, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, basename } from "node:path";

const require = createRequire(import.meta.url);

export function contentCid(bytes: Buffer): string {
  const hex = createHash("sha256").update(bytes).digest("hex");
  return `sha256-${hex}`;
}

export async function ipfsCid(bytes: Buffer): Promise<string> {
  try {
    const Hash = require("ipfs-only-hash") as { of: (c: Buffer) => Promise<string> };
    return await Hash.of(bytes);
  } catch {
    return contentCid(bytes);
  }
}

function filebaseEnv() {
  const accessKey = process.env.FILEBASE_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID;
  const secretKey = process.env.FILEBASE_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.FILEBASE_BUCKET || process.env.S3_BUCKET;
  const endpoint = (process.env.FILEBASE_ENDPOINT || process.env.S3_ENDPOINT || "https://s3.filebase.io").replace(
    /\/$/,
    "",
  );
  const region = process.env.FILEBASE_REGION || "us-east-1";
  if (!accessKey || !secretKey || !bucket) return null;
  return { accessKey, secretKey, bucket, endpoint, region };
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Minimal AWS SigV4 PUT to Filebase S3. Captures x-amz-meta-cid when present. */
export async function pinToFilebase(
  bytes: Buffer,
  key: string,
): Promise<{ cid?: string; etag?: string; url: string } | null> {
  const cfg = filebaseEnv();
  if (!cfg) return null;
  const host = new URL(cfg.endpoint).host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(bytes);
  const canonicalUri = `/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${cfg.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const url = `${cfg.endpoint}/${cfg.bucket}/${key}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "content-type": "application/json",
      "content-length": String(bytes.length),
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Filebase PUT ${key} HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return {
    cid: res.headers.get("x-amz-meta-cid") ?? undefined,
    etag: res.headers.get("etag") ?? undefined,
    url,
  };
}

export async function publishArtifact(
  filePath: string,
  destManifest: string,
  artifactName: string,
): Promise<{ artifact: string; cid: string }> {
  const bytes = await readFile(filePath);
  const localCid = await ipfsCid(bytes);
  let pin = localCid.startsWith("sha256-") ? "local-content-address" : "ipfs-only-hash";
  let cid = localCid;
  let filebaseUrl: string | undefined;
  if (filebaseEnv()) {
    const pinned = await pinToFilebase(bytes, `chester-pa/${basename(filePath)}`);
    if (pinned) {
      pin = "filebase";
      cid = pinned.cid || localCid;
      filebaseUrl = pinned.cid
        ? `https://ipfs.filebase.io/ipfs/${pinned.cid}`
        : pinned.url;
    }
  }
  await mkdir(dirname(destManifest), { recursive: true });
  const rec = {
    artifact: artifactName,
    path: filePath,
    cid,
    bytes: bytes.length,
    publishedAt: new Date().toISOString(),
    pin,
    filebaseUrl,
  };
  await writeFile(destManifest, JSON.stringify(rec, null, 2));
  return { artifact: artifactName, cid };
}
