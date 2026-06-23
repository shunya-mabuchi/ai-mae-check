import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

const privateOut = readOption("--private-out");
const keyId = readOption("--key-id");
const includePrivate = process.argv.includes("--include-private");

const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

if (privateOut) {
  const privateOutPath = resolve(privateOut);
  await mkdir(dirname(privateOutPath), { recursive: true });
  await writeFile(privateOutPath, `${JSON.stringify(privateJwk)}\n`, { mode: 0o600 });
}

const output = {
  alg: "ECDSA-P256-SHA256",
  ...(keyId ? { keyId } : {}),
  publicJwk,
  ...(includePrivate ? { privateJwk } : {}),
  ...(privateOut ? { privateOut: resolve(privateOut) } : {})
};

console.log(JSON.stringify(output, null, 2));
