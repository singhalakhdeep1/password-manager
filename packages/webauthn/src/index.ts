/** WebAuthn credential metadata stored in vault (Module 8). */
export interface StoredPasskey {
  id: string;
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer;
  counter: number;
  rpId: string;
  userHandle: ArrayBuffer;
  createdAt: number;
}

/** Creates a WebAuthn credential registration request (Module 8). */
export async function createPasskeyOptions(
  rpId: string,
  userName: string,
  userId: Uint8Array,
): Promise<CredentialCreationOptions> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  return {
    publicKey: {
      challenge,
      rp: { id: rpId, name: "Password Manager" },
      user: {
        id: userId,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },   // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  };
}

/** Authenticates with a stored passkey (Module 8). */
export async function authenticateWithPasskey(
  rpId: string,
  credentialIds: ArrayBuffer[],
): Promise<Credential | null> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  return navigator.credentials.get({
    publicKey: {
      challenge,
      rpId,
      allowCredentials: credentialIds.map((id) => ({
        id,
        type: "public-key" as const,
      })),
      userVerification: "required",
      timeout: 60_000,
    },
  }) as Promise<Credential | null>;
}

/** Registers a new passkey via WebAuthn (Module 8). */
export async function registerPasskey(
  rpId: string,
  userName: string,
  userId: Uint8Array,
): Promise<{ credential: PublicKeyCredential; stored: StoredPasskey } | null> {
  const options = await createPasskeyOptions(rpId, userName, userId);
  const credential = (await navigator.credentials.create(options)) as PublicKeyCredential | null;
  if (!credential) return null;

  const response = credential.response as AuthenticatorAttestationResponse;
  const stored: StoredPasskey = {
    id: crypto.randomUUID(),
    credentialId: credential.rawId,
    publicKey: response.getPublicKey()?.buffer ?? new ArrayBuffer(0),
    counter: 0,
    rpId,
    userHandle: userId.buffer,
    createdAt: Date.now(),
  };

  return { credential, stored };
}

/** Extracts credential ID from WebAuthn response for storage lookup. */
export function credentialIdToBase64(credentialId: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(credentialId)));
}

/** Checks if WebAuthn is available in this browser (Module 8). */
export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    typeof PublicKeyCredential === "function"
  );
}

/** Checks if platform authenticator (biometric) is available. */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}
