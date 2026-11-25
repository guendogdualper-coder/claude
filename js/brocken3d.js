'use strict';

// Brocken in 3D (seit 15.32): schwerer Gang für Oger, Yetis, Trolle, Ghule, Minotauren und Riesen – und für die Oger
// eine ordentliche Keulenhaltung samt Überkopfschlag.
//
// Vorher liefen alle Zweibeiner gleich: Beine und Arme pendelten starr im schnellen Takt (11 je Sekunde), der Rumpf
// blieb gerade. Ein Oger trippelte so wie ein Bandit, und weil die Keule fest im Handgelenk saß, schlug sie mit dem
// pendelnden Arm bei jedem Schritt von hinten-oben nach unten durch.
//
// Jetzt:
//  - Gang: langsamer Takt nach dem Lauftempo, das Gewicht wandert über das Standbein (Becken seitlich, Rumpf dreht und
//    neigt gegen), der Körper sackt bei jedem Auftreten ein, der Kopf bleibt nach vorn gerichtet, die freie Hand
//    schwingt schwer nach. Anlaufen und Stehenbleiben blenden weich (a.brK).
//  - Stand: Atmen, Gewicht von einem Bein aufs andere, langsamer Blick in die Runde.
//  - Keule (nur Oger, a.model.ogre): Die Richtung der Keule wird im Raum der Figur vorgegeben und das Handgelenk
//    danach gestellt (ogerKeule3) – so bleibt sie ruhig, egal wie der Arm schwingt. Im Stand ruht der Kopf der Keule
//    neben dem Fuß am Boden, im Gehen schleift der Oger sie hinter sich her.
//  - Schlag (ogerSchlag3): beim Ausholen wuchtet er die Keule hinter den Kopf (Rumpf lehnt zurück, die freie Hand
//    geht als Gegengewicht nach vorn), dann fährt sie in einem Bogen über den Kopf vor ihm in den Boden; er geht dabei
//    in die Knie, hält kurz und zieht die Keule außen herum wieder nach hinten.
// Form und Größe der Figuren bleiben, wie sie sind.

const BROCKEN3 = { stand: [-0.55, -0.62, -0.45], gang: [-0.18, -0.62, -0.76] };
const _bkQ = new THREE.Quaternion();
const _bkD = new THREE.Vector3();
const _bkU = new THREE.Vector3();

// Gang und Stand; ersetzt für Brocken das einfache Pendeln in animateCreature
function brockenGang3(a, e, B, t, dt, moving, frozen) {
  if (a.brK == null) a.brK = moving ? 1 : 0;
  if (!frozen) a.brK += ((moving ? 1 : 0) - a.brK) * (1 - Math.exp(-Math.min(0.1, dt) * 7));
  const k = a.brK;
  const sp = (e.type && e.type.speed) || 80;
  const w = t * (4.6 + sp / 32);
  const s = Math.sin(w);
  const c = Math.cos(w);
  const hips = B[BH.hips];
  const chest = B[BH.chest];
  const head = B[BH.head];
  const idle = 1 - k;
  // Beine: weit ausgreifen, das hintere Bein drückt etwas länger nach
  B[BH.legL].rotation.x = (s * 0.55 + 0.06) * k;
  B[BH.legR].rotation.x = (-s * 0.55 + 0.06) * k;
  B[BH.legL].rotation.z = 0.05 * k;
  B[BH.legR].rotation.z = -0.05 * k;
  // Gewicht über das Standbein, bei jedem Auftreten sackt der Körper ein
  hips.position.x += -s * 0.035 * k + Math.sin(t * 0.6) * 0.018 * idle;
  hips.position.y += (Math.abs(c) - 1) * 0.055 * k;
  hips.rotation.z = s * 0.075 * k + Math.sin(t * 0.6) * 0.025 * idle;
  hips.rotation.y = s * 0.1 * k;
  // Rumpf dreht und neigt gegen, lehnt sich im Gehen vor; im Stand atmet er
  chest.rotation.y = -s * 0.2 * k;
  chest.rotation.z = -s * 0.07 * k - Math.sin(t * 0.6) * 0.02 * idle;
  chest.rotation.x = 0.07 * k + Math.cos(w * 2) * 0.025 * k + Math.sin(t * 1.8) * 0.035 * idle;
  // Kopf bleibt nach vorn gerichtet und nickt mit dem Tritt; im Stand schaut er sich langsam um
  head.rotation.y = s * 0.1 * k + Math.sin(t * 0.47 + 1.3) * 0.28 * idle;
  head.rotation.z = s * 0.03 * k;
  head.rotation.x += Math.cos(w * 2) * 0.03 * k;
  // Die Arme hängen am vorgebeugten Rumpf: ohne Ausgleich stünden sie steif nach hinten ab. hang dreht sie zurück
  // ins Lot (der Buckel a.model.hunch kommt in animateCreature noch auf den Rumpf).
  const hang = -(chest.rotation.x + (a.model.hunch || 0));
  // freie Hand: schwerer Schwung, das Handgelenk hängt nach
  B[BH.armL].rotation.set(hang - s * 0.38 * k + 0.05, 0, 0.13 + 0.03 * Math.sin(t * 1.8) * idle);
  B[BH.handL].rotation.x = (-0.18 - c * 0.16) * k;
  if (a.model.ogre) {
    // Keulenarm: hängt leicht nach hinten außen und geht nur wenig mit
    B[BH.armR].rotation.set(hang + 0.06 + 0.12 * k + s * 0.07 * k, 0, -0.16 - 0.04 * k);
    a.brBoden = true;
    const d = a.brDir || (a.brDir = new THREE.Vector3());
    const S = BROCKEN3.stand;
    const G = BROCKEN3.gang;
    d.set(S[0] + (G[0] - S[0]) * k, S[1] + (G[1] - S[1]) * k, S[2] + (G[2] - S[2]) * k);
    d.normalize();
    // die Keule hüpft beim Schleifen ein wenig über den Boden (ogerKeule3 legt ihren Kopf sonst genau auf)
    a.brHupf = Math.max(0, Math.sin(w * 2 + 0.6)) * 0.05 * k;
  } else {
    B[BH.armR].rotation.set(hang + s * 0.38 * k + 0.05, 0, -0.13 - 0.03 * Math.sin(t * 1.8) * idle);
    B[BH.handR].rotation.x = (-0.18 + c * 0.16) * k;
  }
}

// Handgelenk so stellen, dass die Keule im Raum der Figur in Richtung d zeigt (vorn = +z, oben = +y, Keulenhand = −x).
// Dazu wird die Lage der Hand aus Becken, Rumpf und Arm nachgerechnet: Ruht die Keule am Boden (a.brBoden), liegt ihr
// Kopf genau auf; sonst wird nur verhindert, dass sie in den Boden sticht.
const _bkH = new THREE.Vector3();
const _bkT = new THREE.Vector3();
function ogerKeule3(a, B, d) {
  const ax = a.model.weaponAxis;
  if (!ax || !d) return;
  const hips = B[BH.hips];
  const chest = B[BH.chest];
  const arm = B[BH.armR];
  _bkU.copy(ax.tip).sub(ax.base);
  const len = _bkU.length() || 0.6;
  _bkU.multiplyScalar(1 / len);
  // Hand im Raum der Figur
  _bkQ.copy(hips.quaternion);
  _bkH.copy(a.rest[BH.chest]);
  _bkT.copy(a.rest[BH.armR]).applyQuaternion(chest.quaternion);
  _bkH.add(_bkT);
  _bkQ.multiply(chest.quaternion).multiply(arm.quaternion);
  _bkH.applyQuaternion(hips.quaternion).add(hips.position);
  _bkT.copy(a.rest[BH.handR]).applyQuaternion(_bkQ);
  _bkH.add(_bkT);
  const yMin = (0.035 + (a.brHupf || 0) - _bkH.y) / len;
  if ((a.brBoden || d.y < yMin) && yMin > -0.98 && yMin < 0.2) {
    const h = Math.hypot(d.x, d.z) || 1;
    const r = Math.sqrt(1 - yMin * yMin) / h;
    d.set(d.x * r, yMin, d.z * r);
  }
  _bkD.copy(d).applyQuaternion(_bkQ.invert()).normalize();
  B[BH.handR].quaternion.setFromUnitVectors(_bkU, _bkD);
}

// Überkopfschlag des Ogers; wind 0…1 beim Ausholen, strike 1…0 während des Hiebs (wie creatureAttackPose)
function ogerSchlag3(a, B, wind, strike) {
  const p = strike > 0 ? 1 - strike : 0;
  const eo = (x) => 1 - (1 - x) * (1 - x);
  const w = wind > 0 ? eo(wind) : 0;
  const arc = strike > 0 ? (p < 0.3 ? eo(p / 0.3) : 1) : 0;
  const ret = strike > 0 && p > 0.6 ? (p - 0.6) / 0.4 : 0;
  // Gewicht der Schlaghaltung gegenüber Gang/Stand
  const k = strike > 0 ? 1 - ret * ret : w;
  if (k <= 0) return;
  // im Schlag liegt die Keule nicht mehr auf (nur noch: nicht durch den Boden)
  a.brBoden = k < 0.15;
  a.brHupf = 0;
  const armR = B[BH.armR];
  const armL = B[BH.armL];
  const chest = B[BH.chest];
  const hips = B[BH.hips];
  const mix = (v, to) => v + (to - v) * k;
  // Winkel der Keule in der Ebene vorn/oben: 147° = hinter dem Kopf, −46° = vor ihm im Boden
  const up = strike > 0 ? 1 : w;
  const th = (147 - 193 * arc) * Math.PI / 180;
  const armX = strike > 0 ? -2.9 + 2.35 * arc : -2.9 * w;
  armR.rotation.x = mix(armR.rotation.x, armX);
  armR.rotation.z = mix(armR.rotation.z, -0.3 * up * (1 - arc) - 0.05) - 0.55 * Math.sin(Math.PI * ret);
  armL.rotation.x = mix(armL.rotation.x, -0.95 * up + 1.25 * arc);
  armL.rotation.z = mix(armL.rotation.z, 0.3);
  chest.rotation.x += (-0.32 * up + 0.85 * arc) * k;
  chest.rotation.y = mix(chest.rotation.y, -0.38 * up + 0.5 * arc);
  B[BH.head].rotation.x += (0.2 * up - 0.3 * arc) * k;
  hips.position.y += (0.05 * up - 0.14 * arc) * k;
  hips.position.z += 0.14 * arc * k;
  B[BH.legL].rotation.x = mix(B[BH.legL].rotation.x, -0.35 * arc);
  B[BH.legR].rotation.x = mix(B[BH.legR].rotation.x, 0.3 * arc + 0.15 * up);
  const d = a.brDir;
  if (!d) return;
  // Ziel der Keule: beim Zurückziehen außen herum statt durch den Boden
  const tx = -0.08 - 0.75 * Math.sin(Math.PI * ret);
  const ty = Math.sin(th);
  const tz = Math.cos(th);
  const l = Math.hypot(tx, ty, tz) || 1;
  d.set(d.x + (tx / l - d.x) * k, d.y + (ty / l - d.y) * k, d.z + (tz / l - d.z) * k).normalize();
}
