// Echte Tieraufnahmen (seit 9.8): Klangblätter je Familie in snd/tier-*.mp3, hier die Lage jedes Lauts
// [Start, Dauer] in Sekunden. Gebaut aus gemeinfreien Aufnahmen des National Park Service (Yellowstone: Wolf,
// Grizzly, Wapiti, Kojote, Rotfuchs, Bison) und CC0-Aufnahmen von BigSoundBank.com (Joseph Sardin: Hunde,
// Schweine, Raubkatze, Sikahirsch, Zombie-Stimmen, Grunzer). Quellen und Schnitte: docs/klang-prompts.md.
const REC_SPRITES = {
  dog: {aggro: [[0.05, 0.75], [1.05, 1.05], [2.35, 0.77]], attack: [[3.37, 0.35], [3.97, 0.368], [4.589, 0.95]], hurt: [[5.789, 0.254], [6.292, 0.2], [6.742, 0.192]], death: [[7.185, 1.441], [8.875, 1.619]]},
  wolf: {aggro: [[0.05, 3.25], [3.55, 3.45], [7.25, 4.05]], attack: [[11.55, 0.438], [12.238, 0.449], [12.936, 0.75]], hurt: [[13.936, 0.306], [14.492, 0.227]], death: [[14.969, 1.977], [17.196, 2.579]]},
  fox: {aggro: [[0.05, 0.7], [1.0, 0.8]], attack: [[2.05, 0.55], [2.85, 0.55]], hurt: [[3.65, 0.392]], death: [[4.292, 1.023]]},
  hyena: {aggro: [[0.05, 2.45], [2.75, 2.45]], attack: [[5.45, 1.0], [6.7, 1.0]], hurt: [[7.95, 0.565]], death: [[8.765, 2.278]]},
  boar: {aggro: [[0.05, 1.737], [2.037, 2.053]], attack: [[4.339, 0.389], [4.978, 0.367], [5.595, 0.722]], hurt: [[6.567, 0.462], [7.279, 0.487]], death: [[8.016, 0.531], [8.797, 0.441]]},
  bear: {aggro: [[0.05, 2.65], [2.95, 2.85]], attack: [[6.05, 0.8], [7.1, 0.9]], hurt: [[8.25, 0.826], [9.326, 0.826]], death: [[10.402, 3.389]]},
  cat: {aggro: [[0.05, 1.05], [1.35, 0.93]], attack: [[2.53, 0.886], [3.666, 0.853]], hurt: [[4.769, 0.5]], death: [[5.519, 1.28]]},
  deer: {aggro: [[0.05, 3.95], [4.25, 1.95]], attack: [[6.45, 1.55], [8.25, 1.632]], hurt: [[10.132, 0.826]], death: [[11.208, 2.176]]},
  brute: {aggro: [[0.05, 1.421], [1.721, 1.526]], attack: [[3.497, 1.19]], hurt: [[4.938, 0.773]], death: [[5.961, 1.706]]},
  undead: {aggro: [[0.05, 1.45], [1.75, 2.15]], attack: [[4.15, 1.35], [5.75, 1.15]], hurt: [[7.15, 0.955]], death: [[8.355, 1.722]]},
  orc: {aggro: [[0.05, 1.859]], attack: [[2.159, 0.549], [2.958, 0.89]], hurt: [[4.098, 0.671]], death: [[5.019, 1.628]]}
};
