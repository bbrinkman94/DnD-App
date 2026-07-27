/**
 * Builds the d20 mesh from the same face table the physics uses, and gives each
 * triangle the atlas cell that carries its printed number.  Face index, printed
 * number and physical normal therefore agree by construction.
 */

import * as THREE from 'three';
import { D20_FACES, D20_FACE_NUMBERS, D20_VERTICES } from '@/game/d20Geometry';

const ATLAS_COLS = 5;
const ATLAS_ROWS = 4;

/** Where a face's triangle sits inside its atlas cell. */
const TRI_UV: [number, number][] = [
  [0.5, 0.94],
  [0.06, 0.14],
  [0.94, 0.14],
];

export function createD20Geometry(radius = 1): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  D20_FACES.forEach((face, faceIndex) => {
    const number = D20_FACE_NUMBERS[faceIndex];
    // Cell for the *printed number*, so the atlas can be read as 1..20 in order.
    const cell = number - 1;
    const col = cell % ATLAS_COLS;
    const row = Math.floor(cell / ATLAS_COLS);

    const verts = face.map((index) => D20_VERTICES[index]);
    const normal = new THREE.Vector3(
      (verts[0].x + verts[1].x + verts[2].x) / 3,
      (verts[0].y + verts[1].y + verts[2].y) / 3,
      (verts[0].z + verts[1].z + verts[2].z) / 3,
    ).normalize();

    verts.forEach((vertex, i) => {
      positions.push(vertex.x * radius, vertex.y * radius, vertex.z * radius);
      normals.push(normal.x, normal.y, normal.z);
      const [tu, tv] = TRI_UV[i];
      uvs.push((col + tu) / ATLAS_COLS, 1 - (row + 1 - tv) / ATLAS_ROWS);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}
