const VERIFY_ENDPOINT =
  import.meta.env.VITE_VERIFY_ENDPOINT ||
  'https://verifyattendee-xxxxx.cloudfunctions.net/verifyAttendee';

export interface VerifiedAttendee {
  uid: string;
  displayName: string;
  organization?: string;
  photoURL?: string;
  verifiedAt: Date;
  expiresAt: Date;
}

export async function verifyWithCJS2026(
  cjs2026IdToken: string
): Promise<{ verified: boolean; attendee?: VerifiedAttendee }> {
  const response = await fetch(VERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: cjs2026IdToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Verification failed');
  }

  return response.json();
}

export function getCJS2026Token(): string | null {
  // Get from localStorage where CJS2026 app stores it
  // Or use postMessage if game is in iframe
  return localStorage.getItem('cjs2026_id_token');
}

export function storeCJS2026Token(token: string): void {
  localStorage.setItem('cjs2026_id_token', token);
}

export function clearCJS2026Token(): void {
  localStorage.removeItem('cjs2026_id_token');
}
