import 'dates.dart';

/// Days in a row on which the goal was reached.
///
/// The streak stays alive through today: if today's glass isn't full yet,
/// it is counted up to yesterday.
int currentStreak(Set<String> goalDays, DateTime now) {
  var key = dayKey(now);
  if (!goalDays.contains(key)) key = previousDayKey(key);
  var count = 0;
  while (goalDays.contains(key)) {
    count++;
    key = previousDayKey(key);
  }
  return count;
}

/// Longest run of consecutive goal days ever.
int bestStreak(Set<String> goalDays) {
  var best = 0;
  for (final day in goalDays) {
    // Only start counting at the first day of a run.
    if (goalDays.contains(previousDayKey(day))) continue;
    var length = 0;
    var d = parseDayKey(day);
    while (goalDays.contains(dayKey(d))) {
      length++;
      d = DateTime(d.year, d.month, d.day + 1);
    }
    if (length > best) best = length;
  }
  return best;
}
