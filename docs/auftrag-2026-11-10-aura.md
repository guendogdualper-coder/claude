## Aura | Buff-Aura beim Laufen ruhiger

- **Ursache:** Der Versatz je Figur hing am Ort (x·0,013 + y·0,007). Beim Laufen lief die Flammenzeit dadurch bis zu
  15-mal so schnell oder rückwärts, und alle ~77 px sprang sie. Außerdem hingen Hülle und Zungen am Laufzyklus, die
  Hülle wurde stark geschert, und Kern, Legenden-Aura und Schwertklinge strahlten weiß über.
- **Änderung:** fester Versatz je Figur (`kaSeed`), Hülle in der Ruhehaltung verankert, sanfte Neigung nach hinten,
  weniger additive Helligkeit, Legenden-Aura zurückhaltender, solange die Buff-Aura brennt, schlankere Schwertklinge.
- **Dateien:** js/koerperaura.js, js/legendaura.js, js/ninja-fx.js, js/magier.js
- **Messwerte, Tests, offene Punkte:** siehe docs/aura-14-41.md
