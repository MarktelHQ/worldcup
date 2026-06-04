import { randomBytes } from "crypto";

// Long, unguessable owner token = the secret edit key for a profile (~32 url-safe chars).
export const newOwnerToken = () => randomBytes(24).toString("base64url");

// Short, shareable group invite code, e.g. SWAP-9F3A2C
export const newInviteCode = () => "SWAP-" + randomBytes(3).toString("hex").toUpperCase();
