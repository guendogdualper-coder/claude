#!/usr/bin/env bash
# Erzeugt alle Symbole der Desktop-App aus dem vorhandenen Spielsymbol icons/icon-512.png.
# Nur nötig, wenn sich das Spielsymbol ändert. Die erzeugten Dateien sind eingecheckt.
# Braucht ImageMagick 6 („convert“). Aufruf aus dem Ordner desktop/:  bash build/symbole-erzeugen.sh
set -euo pipefail
cd "$(dirname "$0")"
QUELLE=../../icons/icon-512.png
HG='#12100C'   # Hintergrundfarbe aus manifest.webmanifest
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 1) Runde Fassung ohne dunkle Ecken: Kreis um den Goldring ausschneiden (Ring: Mitte 256/255, Radius ~216 px)
convert "$QUELLE" \( -size 512x512 xc:black -fill white -draw 'circle 256,255 256,36' \) \
  -alpha off -compose CopyOpacity -composite -crop 446x446+33+32 +repage "$TMP/rund.png"

# 2) Programmsymbol (.exe, Taskleiste, Startmenü des Installers): mehrere Größen in einer .ico
for s in 16 20 24 32 40 48 64 96 128 256; do
  convert "$TMP/rund.png" -filter Lanczos -resize ${s}x${s} -background none -gravity center -extent ${s}x${s} -depth 8 -strip "$TMP/ico-$s.png"
done
convert "$TMP"/ico-{16,20,24,32,40,48,64,96,128,256}.png icon.ico
convert "$TMP/rund.png" -filter Lanczos -resize 512x512 -depth 8 -strip icon.png   # Linux-Testbau

# 3) Microsoft-Store-Paket (appx): Kacheln und Logos in den Skalierungen 100/125/150/200
#    (400 % fehlt absichtlich: das Ausgangsbild hat nur 446 px, Windows nimmt dann die 200-%-Fassung)
mkdir -p appx
rm -f appx/*.png
kachel() { # name breite hoehe anteil(Symbolgröße relativ zur Höhe, Prozent)
  local name=$1 w=$2 h=$3 p=$4
  for sc in 100 125 150 200; do
    local W=$(( w * sc / 100 )) H=$(( h * sc / 100 ))
    local S=$(( H * p / 100 ))
    convert -size ${W}x${H} "xc:$HG" \( "$TMP/rund.png" -filter Lanczos -resize ${S}x${S} \) \
      -gravity center -composite -depth 8 -strip "appx/$name.scale-$sc.png"
  done
}
kachel StoreLogo 50 50 92
kachel Square44x44Logo 44 44 100
kachel SmallTile 71 71 80
kachel Square150x150Logo 150 150 72
kachel Wide310x150Logo 310 150 78
kachel LargeTile 310 310 64
kachel SplashScreen 620 300 70

# Taskleisten-Symbole ohne Hintergrund (Windows nimmt sie für Taskleiste und Startmenü-Liste)
for t in 16 24 32 48 256; do
  convert "$TMP/rund.png" -filter Lanczos -resize ${t}x${t} -depth 8 -strip "appx/Square44x44Logo.targetsize-${t}.png"
  cp "appx/Square44x44Logo.targetsize-${t}.png" "appx/Square44x44Logo.targetsize-${t}_altform-unplated.png"
done
echo "Symbole erzeugt."
