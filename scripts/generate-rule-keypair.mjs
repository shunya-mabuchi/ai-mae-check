const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

console.log(
  JSON.stringify(
    {
      alg: "ECDSA-P256-SHA256",
      publicJwk,
      privateJwk
    },
    null,
    2
  )
);
