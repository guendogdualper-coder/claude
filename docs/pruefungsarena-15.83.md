# Prüfungsarena: sanftere Wellen (15.83)

Wunsch eines Spielers: Ab Welle 8 „springen die Monster immer auf einen drauf, und dann stirbt man gefühlt immer“.
Man soll ein paar Wellen weiter kommen. Am Anfang sollen es etwas weniger Monster sein, danach nach und nach mehr.

## Änderungen (`js/herausforderung.js`, `js/gegner.js`)

| | vorher | jetzt |
|---|---|---|
| Monster je Welle (allein) | 12 + 2,2 × (Welle − 1), höchstens 36 (ab Welle 12) | 10 + 2 × (Welle − 1), höchstens 36 (ab Welle 14) |
| Stärke Welle 2–8 | 0,72 · 0,82 · 0,9 · 0,95 · 1,0 · 1,05 · 1,15 | 0,7 · 0,78 · 0,85 · 0,9 · 0,95 · 1,0 · 1,06 |
| Leben je Welle ab Welle 9 | +4,5 % | +4 % |
| Jagd wie im Dungeon (aufholen, Ansturm) | ab Welle 8, alle Monster, 95 % des Lauftempos, Ansturm alle 4,5–7 s | ab Welle 10 |
| Jagd Welle 10–13 (sanft) | – | 85 % des Lauftempos, nur 40 % stürmen, halb so oft (alle 9–14 s) |
| Jagd ab Welle 14 | – | 90 % des Lauftempos, 70 % stürmen, Abstand × 1,4 |
| erster Ansturm | sofort möglich | frühestens 2–6 s nach dem Erscheinen |

Wellenmeister stürmen weiterhin immer. Die Werte stehen in `ARENA` (`nStart`, `nPer`, `strPer`, `huntFrom`,
`huntHard`, `hunt`). `gegner.js` kennt dafür drei Felder je Monster:

- `m.chaseMul`: Tempo beim Aufholen
- `m.noRush`: Monster stürmt nie
- `m.rushCdMul`: längerer Abstand zwischen zwei Anstürmen

## Monsterzahl allein auf Stufe 80 (gemessen mit `arenaWave`)

Welle 1–16: 10, 12, 14, 16, 11 (Wellenmeister), 20, 22, 24, 26, 17 (Wellenmeister), 30, 32, 34, 36, 22
(Wellenmeister), 36.

Gold je Welle und je Monster ist unverändert. Weil man weiter kommt, bringt ein Lauf insgesamt mehr Gold. Je Stunde
bleibt es ungefähr gleich, denn es sind weniger Monster je Welle.
