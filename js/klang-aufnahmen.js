// Echte Tieraufnahmen (seit 9.8): Klangblätter je Familie in snd/tier-*.mp3, hier die Lage jedes Lauts
// [Start, Dauer] in Sekunden. Gebaut aus gemeinfreien Aufnahmen des National Park Service (Yellowstone: Wolf,
// Grizzly, Wapiti, Kojote, Rotfuchs, Bison) und CC0-Aufnahmen von BigSoundBank.com (Joseph Sardin: Hunde,
// Schweine, Raubkatze, Sikahirsch, Zombie-Stimmen, Grunzer). Quellen und Schnitte: docs/klang-prompts.md.
// Seit 14.5 sind Wolf, Bär, Keiler, Katze, Riese, Untote und Orks durch neue Dateien ersetzt (snd/sfx, klang-dateien.js);
// hier bleiben Hund, Fuchs, Hyäne, Hirsch und das Pferd.
const REC_SPRITES = {
  dog: {aggro: [[0.05, 0.75], [1.05, 1.05], [2.35, 0.77]], attack: [[3.37, 0.35], [3.97, 0.368], [4.589, 0.95]], hurt: [[5.789, 0.254], [6.292, 0.2], [6.742, 0.192]], death: [[7.185, 1.441], [8.875, 1.619]]},
  fox: {aggro: [[0.05, 0.7], [1.0, 0.8]], attack: [[2.05, 0.55], [2.85, 0.55]], hurt: [[3.65, 0.392]], death: [[4.292, 1.023]]},
  hyena: {aggro: [[0.05, 2.45], [2.75, 2.45]], attack: [[5.45, 1.0], [6.7, 1.0]], hurt: [[7.95, 0.565]], death: [[8.765, 2.278]]},
  deer: {aggro: [[0.05, 3.95], [4.25, 1.95]], attack: [[6.45, 1.55], [8.25, 1.632]], hurt: [[10.132, 0.826]], death: [[11.208, 2.176]]},
  // seit 10.6: das eigene Pferd (BigSoundBank, CC0): Wiehern beim Aufsitzen, Schnauben beim Absteigen
  horse: {neigh: [[0.05, 1.58], [1.933, 1.18]], snort: [[3.413, 0.49]]}
};
