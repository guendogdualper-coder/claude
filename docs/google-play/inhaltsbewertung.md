# Google Play – Vorschlag für den Fragebogen zur Altersfreigabe (IARC)

Stand: 4. 11. 2026, Spielversion 13.76/13.77. Den Fragebogen stellt die International Age Rating Coalition (IARC). Aus den Antworten
berechnet sie die Freigaben für alle Regionen (PEGI, USK, ESRB, ClassInd usw.). Die Fragen hängen davon ab, was man vorher
beantwortet hat, und der Wortlaut ändert sich gelegentlich. Die Antworten unten sind deshalb nach Themen geordnet und begründet.
**Ehrlich antworten:** Falsche Angaben können zur Sperre der App führen. Die Behörden prüfen Stichproben und können die Freigabe ändern.

Wo in der Play Console: **App-Inhalte → Altersfreigaben → Fragebogen starten** (engl. *App content → Content ratings*).

1. **E-Mail-Adresse** für den IARC-Bescheid: `[E-MAIL-ADRESSE]` (dorthin kommt das Zertifikat).
2. **Kategorie:** „Spiel“ (*Game*).

---

## Antworten nach Themen

### Gewalt (*Violence*)

Ja, das Spiel enthält Gewalt. Die Darstellung ist comichaft (Chibi-Stil, „Fantasy-Gewalt“).

| Frage (sinngemäß) | Antwort | Begründung aus dem Spiel |
|---|---|---|
| Enthält das Spiel Gewalt? | **Ja** | Kämpfe gegen Monster mit Waffen und Zaubern, Schadenszahlen |
| Gewalt gegen Fantasiewesen bzw. comichafte Figuren? | **Ja** | Wölfe, Spinnen, Golems, Drachen, Untote, Dämonen, alle stilisiert |
| Gewalt gegen menschliche oder menschenähnliche Figuren? | **Ja, nicht realistisch** | Banditen, Orks und Naga sind menschenähnliche Gegner. Duelle zwischen Spielerfiguren (PvP) sind möglich. Alle Figuren sind Chibi-Comicfiguren. |
| Realistische Gewalt, Folter, Verstümmelung, Zerstückelung? | **Nein** | Besiegte Gegner fallen um und verschwinden. Es gibt keine abgetrennten Körperteile. |
| Blut? | **Nur stilisiert, wenig** | Der Nekromant hat Fertigkeiten mit „Blut“ im Namen (Blutsauger, Blutlarve, Blutlanzen). Sie zeigen rote, leuchtende Magie-Effekte und kleine rote Tropfen bzw. Partikel (`js/nekro-neu.js`). Es gibt keine Blutlachen und keine Wunden. Falls gefragt: „unrealistisches/stilisiertes Blut“, nicht „realistisches Blut“. |
| Belohnung für Gewalt gegen wehrlose Menschen/Zivilisten? | **Nein** | Dorfbewohner und Händler lassen sich nicht angreifen, und in Städten wird nicht gekämpft (`inVillage`) |
| Gewalt gegen Tiere? | **Ja, fantastisch** | Wölfe, Spinnen, Schlangen, Skorpione sind Monster, comichaft dargestellt |

### Angst und Horror (*Fear*)

| Frage | Antwort | Begründung |
|---|---|---|
| Szenen, die Kinder erschrecken könnten? | **Ja, leicht** | Untote, Geister, Skelette, Knochen als Deko, ein Dämonenfürst („Abaddor, der Höllenkaiser“), dunkle Nachtgebiete, Bosse mit Brüllen |
| Horror-Inhalte, die erwachsene Spieler erschrecken sollen? | **Nein** | Nichts davon ist realistisch, und es gibt keine Schockeffekte (Jumpscares) |

### Sexualität und Nacktheit

**Nein** bei allen Fragen. Figuren sind vollständig bekleidet, und es gibt keine sexuellen Inhalte oder Anspielungen.

### Sprache (*Language*)

| Frage | Antwort | Begründung |
|---|---|---|
| Schimpfwörter oder vulgäre Sprache in den Spieltexten? | **Nein** | Die Spieltexte wurden durchsucht, es gibt keine Schimpfwörter |
| Derber Humor? | **Nein** | |

Den Chat der Spieler fragt IARC separat unter „Nutzerinteraktion“ ab (siehe unten).

### Drogen, Alkohol, Tabak (*Controlled substances*)

**Nein.** Tränke („Drachenblut“ für Leben, „Mondtau“ für Mana) heilen nur, es gibt keinen Alkohol und keine Drogen. Gift kommt als Effekt
von Monstern und Fertigkeiten vor, ist aber keine Droge.

### Glücksspiel (*Gambling*)

| Frage | Antwort | Begründung |
|---|---|---|
| Glücksspiel mit echtem Geld? | **Nein** | Es gibt keine Käufe und keine Auszahlung |
| Simuliertes Glücksspiel (Casino, Spielautomaten, Karten um Einsatz)? | **Nein** | Es gibt keine Casino-Spiele |
| Lootboxen oder Zufallsgegenstände **gegen Geld**? | **Nein** | Es gibt keine In-App-Käufe. Zufällige Beute, die Erfolgschance beim Schmied und das Neuwürfeln von Boni nutzen nur Spielgold und Spielmaterial, das man nicht kaufen kann. |

### Sonstiges / interaktive Elemente (*Miscellaneous*)

| Frage | Antwort | Begründung |
|---|---|---|
| Können Nutzer miteinander interagieren oder Inhalte austauschen (Chat usw.)? | **Ja** | Text-Chat (Global, Gilde, Ort), Post mit Text, Handel, Duelle, Gruppen, Gilden, Auktionshaus. Melden und Blockieren sind vorhanden. |
| Gibt die App den Standort des Nutzers an andere weiter? | **Nein** | Es wird nur die Position der Figur in der Spielwelt übertragen, kein echter Standort |
| Kann man digitale Güter kaufen (In-App-Käufe)? | **Nein** | Es gibt keine Käufe und kein Play Billing |
| Enthält die App Werbung? | **Nein** | |
| Gibt die App persönliche Daten an Dritte weiter? | **Nein** | siehe `datensicherheit.md` |
| Uneingeschränkter Internetzugang (Webbrowser)? | **Nein** | Die App zeigt nur das Spiel und die eigenen Seiten (Wiki, Datenschutz) |
| Verfassungsfeindliche Symbole oder Inhalte (wird für Deutschland gefragt)? | **Nein** | |
| Verherrlichung von Diskriminierung, Selbstverletzung, Kriminalität? | **Nein** | |

---

## Zu erwartendes Ergebnis

Das ist eine Schätzung. Das tatsächliche Ergebnis berechnet IARC aus den Antworten.

| System | Erwartung | Warum |
|---|---|---|
| **PEGI** (Europa) | **PEGI 12**, möglicherweise PEGI 7 | Comichafte Gewalt gegen menschenähnliche Figuren (Banditen, Spieler-Duelle) und stilisiertes Blut ergeben eher 12. Ginge es nur um Fantasiewesen, wäre 7 denkbar. Hinweis „In-Game-Interaktion“ bzw. „Nutzer interagieren“. |
| **USK** (Deutschland) | **USK ab 12**, möglicherweise ab 6 | Die Fantasy-Kämpfe sind comichaft, die Gewalt aber ständig und das Spiel will spannend sein. Zusätzlich: „Chats“ |
| ESRB (Nordamerika) | Everyone 10+ oder Teen | Fantasy Violence, Mild Blood; Users Interact |
| IARC allgemein | 12+ | Users Interact |

Interaktive Hinweise, die im Store erscheinen: **„Nutzer interagieren“** (*Users Interact*). „Käufe in der App“ erscheint nicht, und
„Standort wird geteilt“ auch nicht.

## Was sich auf die Freigabe auswirkt (bei späteren Updates beachten)

Der Fragebogen muss **neu ausgefüllt** werden, wenn eines davon dazukommt:
- In-App-Käufe, Lootboxen gegen Geld, Werbung
- deutlich blutigere Effekte, Hinrichtungsanimationen, realistischere Figuren
- Sprach- oder Bild-Chat, Teilen von Fotos oder Standort
- Glücksspiel-Minispiele (auch ohne echtes Geld)

Da Spiel-Updates über die Website ohne neues App-Bundle live gehen, muss der Inhaber das selbst im Blick behalten. Google und IARC
merken es nicht automatisch, ahnden falsche Angaben aber trotzdem.
