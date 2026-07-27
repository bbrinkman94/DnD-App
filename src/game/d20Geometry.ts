/**
 * The d20, built by hand.
 *
 * We generate the icosahedron ourselves instead of using THREE.IcosahedronGeometry
 * so that face index → printed number → face normal is one authoritative mapping.
 * The physics simulation steers the die onto a face *number*; the mesh paints the
 * same number onto that exact triangle.  Nothing can drift out of sync.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const PHI = (1 + Math.sqrt(5)) / 2;

function v(x: number, y: number, z: number): Vec3 {
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
}

/** 12 vertices of a unit icosahedron. */
export const D20_VERTICES: Vec3[] = [
  v(-1, PHI, 0),
  v(1, PHI, 0),
  v(-1, -PHI, 0),
  v(1, -PHI, 0),
  v(0, -1, PHI),
  v(0, 1, PHI),
  v(0, -1, -PHI),
  v(0, 1, -PHI),
  v(PHI, 0, -1),
  v(PHI, 0, 1),
  v(-PHI, 0, -1),
  v(-PHI, 0, 1),
];

/** 20 triangular faces, wound counter-clockwise when seen from outside. */
export const D20_FACES: [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

/** Outward unit normal of each face (== its centroid direction on a regular solid). */
export const D20_FACE_NORMALS: Vec3[] = D20_FACES.map(([a, b, c]) => {
  const va = D20_VERTICES[a];
  const vb = D20_VERTICES[b];
  const vc = D20_VERTICES[c];
  return normalize({
    x: (va.x + vb.x + vc.x) / 3,
    y: (va.y + vb.y + vc.y) / 3,
    z: (va.z + vb.z + vc.z) / 3,
  });
});

/**
 * Real dice number opposite faces so they sum to 21.  We find each face's
 * antipode by normal and hand out numbers in pairs.
 */
export const D20_FACE_NUMBERS: number[] = (() => {
  const numbers = new Array<number>(20).fill(0);
  let next = 1;
  for (let i = 0; i < 20; i++) {
    if (numbers[i] !== 0) continue;
    const n = D20_FACE_NORMALS[i];
    let opposite = -1;
    let best = -Infinity;
    for (let j = 0; j < 20; j++) {
      if (j === i) continue;
      const m = D20_FACE_NORMALS[j];
      const dot = -(n.x * m.x + n.y * m.y + n.z * m.z);
      if (dot > best) {
        best = dot;
        opposite = j;
      }
    }
    numbers[i] = next;
    numbers[opposite] = 21 - next;
    next++;
  }
  return numbers;
})();

/** face index for a printed number (inverse of D20_FACE_NUMBERS). */
export const D20_FACE_FOR_NUMBER: number[] = (() => {
  const map = new Array<number>(21).fill(-1);
  D20_FACE_NUMBERS.forEach((num, faceIndex) => {
    map[num] = faceIndex;
  });
  return map;
})();

/** Which number is showing, given the die's world rotation applied to normals. */
export function readTopFace(rotate: (n: Vec3) => Vec3): number {
  let best = -Infinity;
  let bestFace = 0;
  for (let i = 0; i < 20; i++) {
    const up = rotate(D20_FACE_NORMALS[i]).y;
    if (up > best) {
      best = up;
      bestFace = i;
    }
  }
  return D20_FACE_NUMBERS[bestFace];
}
