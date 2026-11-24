/// XP and levels: every sip moves you forward, a full glass gives a bonus.
library;

/// XP for logging a drink: 1 XP per 25 ml (250 ml = 10 XP).
int xpForDrink(int ml) => (ml / 25).round();

/// Bonus XP the first time the daily goal is reached on a day.
const int goalBonusXp = 50;

const List<String> levelTitles = [
  'Tiny Drop', // 1
  'Little Splash', // 2
  'First Wave', // 3
  'Steady Sipper', // 4
  'Hydro Pro', // 5
  'Glass Master', // 6
  'River Runner', // 7
  'Ocean Keeper', // 8
  'Wateroo Legend', // 9+
];

String titleForLevel(int level) =>
    levelTitles[(level - 1).clamp(0, levelTitles.length - 1)];

/// XP needed to go from [level] to the next one.
int xpToAdvance(int level) => 100 * level + 100;

class LevelInfo {
  const LevelInfo({
    required this.level,
    required this.xpIntoLevel,
    required this.xpForNext,
  });

  final int level;
  final int xpIntoLevel;
  final int xpForNext;

  String get title => titleForLevel(level);
  String get nextTitle => titleForLevel(level + 1);
  int get xpRemaining => xpForNext - xpIntoLevel;
  double get progress => xpForNext == 0 ? 0 : xpIntoLevel / xpForNext;
}

LevelInfo levelFor(int totalXp) {
  var level = 1;
  var remaining = totalXp < 0 ? 0 : totalXp;
  while (remaining >= xpToAdvance(level)) {
    remaining -= xpToAdvance(level);
    level++;
  }
  return LevelInfo(
    level: level,
    xpIntoLevel: remaining,
    xpForNext: xpToAdvance(level),
  );
}
