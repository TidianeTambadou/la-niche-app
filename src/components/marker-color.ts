/**
 * Hash a fragrance key to a stable HSL color. Each perfume gets its own hue
 * (same hue every time so users build memory). Saturation/lightness fixed
 * for ATELIER consistency: vibrant but slightly desaturated, never neon.
 *
 * Kept in a standalone file so callers (markers in the 3D scene, list chips
 * in 2D React) can import the color without dragging three.js into the
 * caller's client bundle.
 */
export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 48%)`;
}
