export function randomRange(low, high) {
  return Math.random() * (high - low) + low;
}

export function rotation(mag, rad) {
  return [Math.cos(rad) * mag, Math.sin(rad) * mag];
}
