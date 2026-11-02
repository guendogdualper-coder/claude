// Rang-Namen (seit 13.39): Jede Fertigkeit heißt auf jedem Rang anders, damit man das Hochstufen auch am Namen
// sieht. Stufe 1–15 trägt den Grundnamen (klassen.js), danach [Erwacht E1–E10, Heroisch H1–H10,
// Legendär L1–L10, Vollendet V]. Anzeige über skillRankName(sk, stufe).
const RANK_NAMES = {
  // Krieger – Weg der Klinge
  sichelwelle: ['Mondsichelwelle', 'Sturmsichel', 'Sichel der Verdammnis', 'Weltenteiler'],
  schwertwirbel: ['Klingensturm', 'Stählerner Orkan', 'Wirbel der tausend Klingen', 'Mahlstrom des Kriegsgottes'],
  kampfrausch: ['Blutrausch', 'Berserkerwut', 'Zorn der Ahnen', 'Unsterblicher Furor'],
  sprungschlag: ['Sturzangriff', 'Meteorsprung', 'Himmelssturz', 'Fall des Kriegsgottes'],
  schwertaura: ['Aura der Klingen', 'Stahlseele', 'Glanz des Schwertkönigs', 'Göttliche Schneide'],
  // Krieger – Weg des Leibes
  felsenfaust: ['Bergfaust', 'Titanenfaust', 'Faust des Erdriesen', 'Weltenbrecher'],
  erdbeben: ['Erdstoß', 'Bergbeben', 'Kontinentalbeben', 'Weltenbeben'],
  starkerkoerper: ['Eiserner Körper', 'Stahlhaut', 'Unbeugsamer Koloss', 'Unsterblicher Leib'],
  geistesschlag: ['Seelenschlag', 'Geisterhammer', 'Schlag des Urgeistes', 'Hieb des Weltgeistes'],
  kriegsschrei: ['Schlachtruf', 'Donnerruf', 'Schrei des Kriegsherrn', 'Ruf der Apokalypse'],
  // Ninja
  hinterhalt: ['Schattenstich', 'Meuchelstoß', 'Todesschatten', 'Lautloser Tod'],
  tarnung: ['Nebelschleier', 'Schattengestalt', 'Geist der Nacht', 'Herr der Schatten'],
  wirbelklinge: ['Klingentanz', 'Dolchsturm', 'Tanz der tausend Schnitte', 'Todeswirbel'],
  blitzangriff: ['Donnerstoß', 'Phantomangriff', 'Schatten des Blitzes', 'Augenblick des Todes'],
  leichtfuessigkeit: ['Windschritt', 'Sturmfuß', 'Schwingen des Windes', 'Schritt der Ewigkeit'],
  schattensprung: ['Nachtsprung', 'Schattenflug', 'Sprung durch die Leere', 'Wanderer der Schatten'],
  laehmklinge: ['Nervenklinge', 'Giftzahn', 'Klinge der Starre', 'Todesstarre'],
  schattenmantel: ['Nachtmantel', 'Mantel der Finsternis', 'Umhang der Leere', 'Mantel der ewigen Nacht'],
  // Schamane – Weg des Drachen
  talisman: ['Sturmdrache', 'Donnerdrache', 'Himmelsdrache', 'Drachenkaiser des Sturms'],
  drachengebruell: ['Drachenzyklon', 'Drachensturm', 'Mahlstrom des Drachen', 'Wirbel des Drachengottes'],
  drachenkraft: ['Drachenblut', 'Drachenherz', 'Seele des Drachen', 'Macht des Drachengottes'],
  blitzschlag: ['Eissturm', 'Frostorkan', 'Ewiger Winter', 'Weltenfrost'],
  donnersturm: ['Donnergrollen', 'Himmelszorn', 'Zorn der Götter', 'Götterdämmerung'],
  // Schamane – Weg der Heilung
  geisterfaust: ['Sonnensturz', 'Strahlenfall', 'Himmelslicht', 'Fall der Sonne'],
  windfessel: ['Sturmfessel', 'Orkanketten', 'Fesseln des Himmels', 'Ketten der Ewigkeit'],
  segen: ['Großer Segen', 'Segen der Ahnen', 'Segen des Himmels', 'Göttlicher Segen'],
  heilung: ['Lebensquell', 'Strom des Lebens', 'Wunder der Heilung', 'Wiedergeburt'],
  schutzgeist: ['Sturmfalke', 'Goldfalke', 'Himmelsfalke', 'Falke der Götter'],
  // Nekromant – Weg der Seelen
  blutsauger: ['Blutdurst', 'Vampirkuss', 'Blutfürst', 'Herr des Blutes'],
  seelenkaefig: ['Seelenkerker', 'Seelengruft', 'Kerker der Verdammten', 'Gefängnis der Ewigkeit'],
  totenbeschwoerung: ['Ruf der Gruft', 'Heer der Toten', 'Legion der Verdammten', 'Armee der Unterwelt'],
  totenruf: ['Gräberruf', 'Weckruf der Toten', 'Auferstehung der Gefallenen', 'Tag der Toten'],
  geisterflut: ['Geistersturm', 'Seelenflut', 'Flut der Verdammten', 'Sintflut der Seelen'],
  // Nekromant – Weg der Knochen
  lebensentzug: ['Lebensraub', 'Seelenentzug', 'Hauch des Todes', 'Kuss des Todes'],
  knochenwurf: ['Knochenspeer', 'Knochenlanze', 'Speer des Totengräbers', 'Knochen des Titanen'],
  blutlarve: ['Blutbrut', 'Blutschwarm', 'Mutter der Brut', 'Seuche des Blutes'],
  totenhand: ['Gruftgriff', 'Klaue der Gruft', 'Hand der Unterwelt', 'Griff des Todes'],
  blutlanzen: ['Blutspeere', 'Blutregen', 'Lanzen des Blutfürsten', 'Blutgericht'],
  // Magier – Feuer
  glutfeld: ['Glutgrube', 'Flammenschlund', 'Höllenboden', 'Pforte zur Hölle'],
  feuerball: ['Großer Feuerball', 'Flammenkomet', 'Sonnenkugel', 'Sternenfeuer'],
  brand: ['Glutbrand', 'Höllenbrand', 'Ewiges Feuer', 'Seelenbrand'],
  phoenix: ['Feuerphönix', 'Sonnenphönix', 'Ewiger Phönix', 'Phönix der Wiedergeburt'],
  feuertornado: ['Glutwirbel', 'Flammenzyklon', 'Höllenmahlstrom', 'Weltenbrand'],
  // Magier – Frost
  frostnova: ['Eisnova', 'Gletscherbruch', 'Herz des Winters', 'Absoluter Nullpunkt'],
  eisstrahl: ['Froststrahl', 'Gletscherstrahl', 'Strahl des ewigen Eises', 'Atem des Winters'],
  eisschritt: ['Frostschritt', 'Gletscherschritt', 'Schritt des Winters', 'Geist des Eises'],
  frostpanzer: ['Eispanzer', 'Gletscherpanzer', 'Panzer des Winters', 'Ewiges Eis'],
  kristallgrab: ['Kristallgruft', 'Eisgruft', 'Grab des Winters', 'Ewige Kristallgruft'],
  // Magier – Blitz
  blitzspeer: ['Donnerspeer', 'Sturmlanze', 'Speer des Donnergottes', 'Himmelsspeer'],
  kettenblitz: ['Kettendonner', 'Blitzkaskade', 'Sturm der Ketten', 'Göttlicher Kettenblitz'],
  blitzschritt: ['Donnerschritt', 'Sturmschritt', 'Schritt des Blitzes', 'Lichtgeschwindigkeit'],
  gewitter: ['Sturmwolke', 'Donnerwolke', 'Himmelsgewitter', 'Weltengewitter'],
  kugelblitz: ['Plasmakugel', 'Sturmkugel', 'Kugel des Donnergottes', 'Sonnensturm'],
  // Magier – Erde
  steinschlag: ['Felsschlag', 'Bergschlag', 'Titanenschlag', 'Weltenschlag'],
  steingeschoss: ['Felsbrocken', 'Bergsplitter', 'Meteorgeschoss', 'Sternenfels'],
  erdspitzen: ['Felsspitzen', 'Bergzacken', 'Dornen der Erde', 'Zähne des Weltenbergs'],
  bergsturz: ['Lawine', 'Bergeinsturz', 'Meteorregen', 'Weltenfall'],
  schwerkraft: ['Schwerkraftfeld', 'Schwerkraftsturm', 'Singularität', 'Schwarzes Loch']
};

// Name einer Fertigkeit auf ihrer Stufe (Rang aus skillRank, spieler.js)
function skillRankName(sk, lvl) {
  if (!sk) return '';
  const r = typeof skillRank === 'function' && lvl != null ? skillRank(lvl) : -1;
  const names = RANK_NAMES[sk.id];
  return r >= 0 && names && names[r] ? names[r] : sk.name;
}
// Name der Fertigkeit am Platz i des eigenen Charakters
function skillNameAt(p, i) {
  const sk = classSkills(p)[i];
  return skillRankName(sk, p.skillLevels ? p.skillLevels[i] : 1);
}
