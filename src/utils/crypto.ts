/**
 * Generates a SHA-256 hash of the input string for secure comparison.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    // Fallback standard custom hashing if crypto is unavailable in older/sandboxed environments
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `fb-${hash.toString(16)}`;
  }
}

// Pre-computed hash values
export const ADMIN_USERNAME = "Ahmed";
// Hash for "01278150"
export const ADMIN_PASSWORD_HASH = "8ba7b309f485dbf2ff6078fbe1752b0f4961db5e305417855bfa95f3b7d159be"; // We will dynamically compute/match
