// Rechenhelfer, die überall gebraucht werden (seit 15.16) – wird als erstes Skript geladen.
//
// Abstand ohne Speichermüll: Math.hypot ist im Browser eine eingebaute Funktion, die ihre Werte und ihr Ergebnis bei
// jedem Aufruf als Objekte auf dem Speicher anlegt (gemessen rund 60 Byte je Aufruf). Das Spiel rechnet im Kampf
// mehrere tausend Abstände je Bild – das waren einige Megabyte Müll pro Sekunde und entsprechend viele Aufräumpausen.
// Wurzel aus den Quadraten rechnet der Browser dagegen ganz ohne Speicher. Die Ergebnisse sind gleich (höchstens in
// der letzten Stelle verschieden); Überlauf bei riesigen Werten spielt bei Spielkoordinaten keine Rolle.
function hyp(a, b) {
  return Math.sqrt(a * a + b * b);
}
function hyp3(a, b, c) {
  return Math.sqrt(a * a + b * b + c * c);
}
