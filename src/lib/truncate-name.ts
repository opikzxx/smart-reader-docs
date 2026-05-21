/**
 * Truncates a display name to a maximum length.
 * Used in the dashboard navigation to ensure long names don't overflow the UI.
 */
export function truncateName(name: string, maxLength: number = 50): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength);
}
