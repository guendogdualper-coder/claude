/// Calendar-day helpers. Days are stored as `yyyy-MM-dd` keys in local time.
library;

String dayKey(DateTime t) {
  final m = t.month.toString().padLeft(2, '0');
  final d = t.day.toString().padLeft(2, '0');
  return '${t.year}-$m-$d';
}

DateTime parseDayKey(String key) {
  final parts = key.split('-');
  return DateTime(
    int.parse(parts[0]),
    int.parse(parts[1]),
    int.parse(parts[2]),
  );
}

/// The key of the day before [key]. Uses calendar arithmetic, so it is safe
/// across daylight-saving changes.
String previousDayKey(String key) {
  final d = parseDayKey(key);
  return dayKey(DateTime(d.year, d.month, d.day - 1));
}

const _weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// "Tuesday, Nov 24"
String longDateLabel(DateTime t) =>
    '${_weekdays[t.weekday - 1]}, ${_months[t.month - 1]} ${t.day}';

/// "Nov 24"
String shortDateLabel(DateTime t) => '${_months[t.month - 1]} ${t.day}';

/// One-letter weekday label: M T W T F S S.
String weekdayInitial(DateTime t) => _weekdays[t.weekday - 1][0];

/// 1250 -> "1,250"
String formatMl(int ml) {
  final s = ml.abs().toString();
  final buf = StringBuffer(ml < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}

/// 2000 -> "2", 2500 -> "2.5", 1250 -> "1.25"
String formatLiters(int ml) {
  final l = ml / 1000;
  var s = l.toStringAsFixed(2);
  s = s.replaceFirst(RegExp(r'0+$'), '');
  s = s.replaceFirst(RegExp(r'\.$'), '');
  return s;
}
