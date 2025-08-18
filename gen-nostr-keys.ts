import { generateSecretKey, getPublicKey } from "nostr-tools";

function genKeys(name: string) {
    const sk = generateSecretKey(); // Uint8Array
    const pk = getPublicKey(sk);    // hex string (64 char)
    console.log(`${name}:`);
    console.log("  secretKey (hex):", Buffer.from(sk).toString("hex"));
    console.log("  nostr_pubkey:", pk);
    console.log("-----------");
}

["Alice", "Carol", "Dave"].forEach(genKeys);
