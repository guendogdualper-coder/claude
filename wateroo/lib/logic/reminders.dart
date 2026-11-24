/// Reminder settings and the times they produce.
library;

enum ReminderMode { hourly, custom }

class ReminderSettings {
  const ReminderSettings({
    this.enabled = true,
    this.mode = ReminderMode.hourly,
    this.intervalMinutes = 45,
    this.fromHour = 8,
    this.toHour = 22,
    this.pauseWhenFull = true,
  });

  final bool enabled;
  final ReminderMode mode;

  /// Used when [mode] is [ReminderMode.custom].
  final int intervalMinutes;

  /// Active hours, e.g. 8 to 22 means 08:00 – 22:00.
  final int fromHour;
  final int toHour;

  /// Stop reminding for the rest of the day once the goal is reached.
  final bool pauseWhenFull;

  static const List<int> intervalChoices = [15, 30, 45, 60, 90, 120];

  int get everyMinutes => mode == ReminderMode.hourly ? 60 : intervalMinutes;

  /// Reminder times of a day, as minutes after midnight.
  List<int> minutesOfDay() {
    final start = fromHour * 60;
    final end = toHour * 60;
    return [for (var m = start; m <= end; m += everyMinutes) m];
  }

  int get perDay => minutesOfDay().length;

  ReminderSettings copyWith({
    bool? enabled,
    ReminderMode? mode,
    int? intervalMinutes,
    int? fromHour,
    int? toHour,
    bool? pauseWhenFull,
  }) {
    return ReminderSettings(
      enabled: enabled ?? this.enabled,
      mode: mode ?? this.mode,
      intervalMinutes: intervalMinutes ?? this.intervalMinutes,
      fromHour: fromHour ?? this.fromHour,
      toHour: toHour ?? this.toHour,
      pauseWhenFull: pauseWhenFull ?? this.pauseWhenFull,
    );
  }

  Map<String, Object> toJson() => {
    'enabled': enabled,
    'mode': mode.name,
    'intervalMinutes': intervalMinutes,
    'fromHour': fromHour,
    'toHour': toHour,
    'pauseWhenFull': pauseWhenFull,
  };

  factory ReminderSettings.fromJson(Map<String, dynamic> j) {
    const d = ReminderSettings();
    return ReminderSettings(
      enabled: j['enabled'] as bool? ?? d.enabled,
      mode: ReminderMode.values.firstWhere(
        (m) => m.name == j['mode'],
        orElse: () => d.mode,
      ),
      intervalMinutes: j['intervalMinutes'] as int? ?? d.intervalMinutes,
      fromHour: j['fromHour'] as int? ?? d.fromHour,
      toHour: j['toHour'] as int? ?? d.toHour,
      pauseWhenFull: j['pauseWhenFull'] as bool? ?? d.pauseWhenFull,
    );
  }
}

/// Reminders from [now] on, for today and the next [days] - 1 days.
///
/// Notifications are scheduled as one-off alarms and refreshed whenever the
/// app is opened, so "pause when full" can skip just the rest of today.
/// iOS keeps at most 64 pending notifications, so the list is capped at [max].
List<DateTime> upcomingReminders(
  DateTime now,
  ReminderSettings s, {
  required bool goalReachedToday,
  int days = 3,
  int max = 60,
}) {
  if (!s.enabled) return const [];
  final result = <DateTime>[];
  for (var dayOffset = 0; dayOffset < days; dayOffset++) {
    if (dayOffset == 0 && goalReachedToday && s.pauseWhenFull) continue;
    for (final m in s.minutesOfDay()) {
      final t = DateTime(
        now.year,
        now.month,
        now.day + dayOffset,
        m ~/ 60,
        m % 60,
      );
      if (t.isAfter(now)) result.add(t);
      if (result.length >= max) return result;
    }
  }
  return result;
}

/// The next reminder, or null when none is coming.
DateTime? nextReminder(
  DateTime now,
  ReminderSettings s, {
  required bool goalReachedToday,
}) {
  final list = upcomingReminders(
    now,
    s,
    goalReachedToday: goalReachedToday,
    days: 2,
    max: 1,
  );
  return list.isEmpty ? null : list.first;
}

const List<String> reminderMessages = [
  'Time for a sip! Your glass is waiting.',
  'A little water goes a long way. Take a sip!',
  'Wateroo is thirsty – are you? Fill your glass a bit more.',
  'Quick break: one glass of water, then back to it.',
  'Keep your streak alive – grab a drink!',
];
