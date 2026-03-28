export function getEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    // In production, we want to throw if a required env var is missing
    if (import.meta.env.PROD) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    // In development, we might return a placeholder or empty string to avoid crashing immediately
    console.warn(`Missing environment variable: ${key}`);
    return '';
  }
  return value;
}
