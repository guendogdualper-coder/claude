# Werbung (seit 15.72)

## Was im Spiel passiert

**Tagesbelohnung:** Ohne Werbung gibt es die Hälfte der Tagesliste (aufgerundet, mindestens 1 Stück). Wer eine kurze
Werbung bis zum Ende ansieht, bekommt das Doppelte davon, also wieder die volle Liste. Das geht

- **vor dem Abholen:** Knopf „Mit Werbung doppelt abholen“ – die doppelte Menge kommt auf einmal, oder
- **nach dem Abholen:** Knopf „Mit Werbung verdoppeln“ – die zweite Hälfte kommt dazu.

Einmal am Tag. Ein Ausrüstungsteil (Tag 7) bleibt ein Teil, es gibt kein zweites. Ungerade Mengen werden aufgerundet
(1 Erfahrungsring ohne Werbung, 2 mit Werbung; 5 Tränke werden zu 3 bzw. 6).

Regeln der Werbepause:

- Die Belohnung gibt es nur nach dem vollen Zähler (30 s). ✕ fragt nach; „Abbrechen“ heißt: keine Verdopplung.
- Der Zähler hält an, solange die Seite nicht sichtbar ist (App im Hintergrund, anderer Tab) oder die Abbruch-Frage offen ist.
- Spielklänge und Musik sind währenddessen stumm und kommen danach in der eingestellten Lautstärke zurück.
- Tasten gehen nicht ans Spiel (Escape = Abbruch-Frage, Enter = Belohnung abholen, wenn fertig).
- Der Platz in der Tasche wird **vor** der Werbung geprüft. Eine gesehene Werbung bleibt bis Mitternacht gezählt
  (`p.daily.ad`), falls die Tasche danach doch voll war – dann reicht ein Tipp auf „Doppelt abholen“ / „Verdopplung abholen“.

Gespeichert wird in `p.daily`: `last` und `streak` wie bisher, dazu `ad` (Tag der gesehenen Werbung) und `x2` (Tag der
Verdopplung), beides als Datumstext – es gilt also nur am selben Tag.

## Woher die Werbung kommt

`werbungZeigen(grund)` in `js/werbung.js` gibt ein Promise zurück: `true` nur, wenn die Werbung bis zum Ende lief.

1. **Werbenetz im Browser** (Google „Ad Placement API“ für Spiele) – nur, wenn `WERBUNG.h5Kunde` eingetragen ist und
   das Netz gerade eine Werbung hat. Sonst nach höchstens 8 s weiter mit 2.
2. **Eigene Werbepause** (jetzt immer): 30 Sekunden Spiel-Trailer `video/werbung.mp4` mit Vorschaubild `video/werbung.jpg`
   – im Wechsel mit einer zweiten Fassung aus Szenen des Spiels und Abschlusskarte „Folge uns auf Instagram und TikTok“
   (`docs/werbung-ladebilder.md`).
   Lädt das Video nicht (offline), laufen Spieltipps mit demselben Zähler.

Die eigene Werbepause bringt **kein Geld** und sammelt keine Daten. Sie macht die Verdopplung schon jetzt spielbar,
bis ein echtes Werbenetz eingerichtet ist.

Das Video wird nicht vorab gespeichert: Der Service-Worker lässt `/video/` durch (Safari lädt Videos in Stücken).

### Video tauschen

Quelle ist der Trailer `docs/trailer/seelenstein-trailer-1080p.mp4` (Ausschnitte 6,0–29,5 s und 39,0–46,6 s, ohne die
alte Stadt „Vlotho“), 854 × 480, H.264/AAC, etwa 3 MB:

```bash
ffmpeg -i docs/trailer/seelenstein-trailer-1080p.mp4 -filter_complex \
 "[0:v]trim=6.0:29.5,setpts=PTS-STARTPTS,scale=854:480:flags=lanczos,fps=30[v1];\
  [0:v]trim=39.0:46.6,setpts=PTS-STARTPTS,scale=854:480:flags=lanczos,fps=30[v2];\
  [v1][v2]xfade=transition=fade:duration=0.4:offset=23.1,fade=t=out:st=30.3:d=0.4[v];\
  [0:a]atrim=6.0:29.5,asetpts=PTS-STARTPTS[a1];[0:a]atrim=39.0:46.6,asetpts=PTS-STARTPTS[a2];\
  [a1][a2]acrossfade=d=0.4,afade=t=out:st=30.0:d=0.7[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 29 -profile:v main -pix_fmt yuv420p \
 -c:a aac -b:a 80k -ac 2 -movflags +faststart video/werbung.mp4
ffmpeg -ss 1.2 -i video/werbung.mp4 -frames:v 1 -q:v 5 video/werbung.jpg
```

## Echte Werbung (bringt Geld) – was dafür nötig ist

Das kann nur der Betreiber selbst einrichten (eigenes Konto, eigene Steuer- und Bankdaten – die gehören nie in einen Chat
oder ins Repo). Die Kennungen unten sind dagegen **keine** Geheimnisse: Sie stehen später öffentlich im Spiel.

### Browser und Windows-App (seelenstein.online)

1. Google-AdSense-Konto anlegen und die Website bestätigen lassen.
2. Zugang zur **Ad Placement API** (Werbung für H5-Spiele) beantragen – nicht jedes Konto bekommt ihn.
3. Die Publisher-Kennung (`ca-pub-…`) in `js/werbung.js` bei `WERBUNG.h5Kunde` eintragen; zum Ausprobieren
   `WERBUNG.h5Test = true` (Google zeigt dann Testwerbung).
4. Datei `ads.txt` ins Hauptverzeichnis (Inhalt gibt AdSense vor).
5. **Einwilligung (EU/DSGVO):** Vor personalisierter Werbung braucht es einen Einwilligungsdialog (zertifizierte CMP,
   z. B. die Datenschutz-Meldungen in AdSense). Ohne Einwilligung nur nicht personalisierte Werbung.
6. `datenschutz.html` ergänzen (Werbepartner, Cookies/Kennungen, Widerruf).

### iPhone- und Android-App

1. AdMob-Konto, je Plattform eine App und einen Anzeigenblock **„Prämie“ (rewarded)** anlegen → App-ID und
   Anzeigenblock-ID je Plattform.
2. Natives Modul einbauen (z. B. `@capacitor-community/admob`) und in `werbung.js` als erste Quelle vor dem Browser-Netz
   anschließen. **Erst einbauen, wenn die App-ID da ist:** Ohne `GADApplicationIdentifier` (iOS, Info.plist) bzw. die
   App-ID im Android-Manifest stürzt die App beim Start ab.
3. iOS: `SKAdNetworkItems` in der Info.plist, Abfrage „App-Tracking-Transparenz“ mit `NSUserTrackingUsageDescription`.
4. Einwilligungsdialog (Google UMP) für Nutzer in der EU.
5. Store-Angaben ändern: Google Play „Enthält Werbung“ und Datensicherheit, App Store „App-Datenschutz“.
6. Zum Testen nur die Test-Anzeigenblöcke von Google benutzen und nie die eigene Werbung anklicken (Kontosperre).

### Grenzen

Alles läuft im Gerät des Spielers. Wer am Spielcode bastelt, kann sich die Verdopplung ohne Werbung holen – das gilt für
die ganze Tagesbelohnung. Echte Prüfung bräuchte einen eigenen Server (bei AdMob: serverseitige Bestätigung, „SSV“).

## Wiki

Die Seite „Tagesbelohnung“ zeigt beide Spalten (ohne Werbung / mit Werbung, Beispiel Stufe 30) – `tools/wiki-sammeln.js`.
