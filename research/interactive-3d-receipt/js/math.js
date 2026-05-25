
export function normalize(v) { 
  const l = Math.hypot(v.x, v.y, v.z) || 1; 
  return { x: v.x/l, y: v.y/l, z: v.z/l }; 
}
export function dot(a, b) { 
  return a.x*b.x + a.y*b.y + a.z*b.z; 
}
export function getNormal(a, b, c) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  return normalize({ x: uy*vz - uz*vy, y: uz*vx - ux*vz, z: ux*vy - uy*vx });
}
