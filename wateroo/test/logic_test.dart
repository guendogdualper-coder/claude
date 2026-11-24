import 'package:flutter_test/flutter_test.dart';
import 'package:wateroo/logic/badges.dart';
import 'package:wateroo/logic/dates.dart';
import 'package:wateroo/logic/levels.dart';
import 'package:wateroo/logic/reminders.dart';
import 'package:wateroo/logic/streaks.dart';

void main() {
  group('dates', () {
    test('day keys round-trip and step back across months and years', () {
      expect(dayKey(DateTime(2026, 3, 5, 23, 59)), '2026-03-05');
      expect(previousDayKey('2026-03-01'), '2026-02-28');
      expect(previousDayKey('2026-01-01'), '2025-12-31');
      expect(dayKey(parseDayKey('2026-11-24')), '2026-11-24');
    });

    test('formats amounts', () {
      expect(formatMl(0), '0');
      expect(formatMl(250), '250');
      expect(formatMl(1250), '1,250');
      expect(formatMl(12500), '12,500');
      expect(formatLiters(2000), '2');
      expect(formatLiters(2500), '2.5');
      expect(formatLiters(1250), '1.25');
    });

    test('labels', () {
      final t = DateTime(2026, 11, 24); // a Tuesday
      expect(longDateLabel(t), 'Tuesday, Nov 24');
      expect(weekdayInitial(t), 'T');
    });
  });

  group('levels', () {
    test('250 ml gives 10 XP', () {
      expect(xpForDrink(250), 10);
      expect(xpForDrink(150), 6);
      expect(xpForDrink(500), 20);
    });

    test('level thresholds', () {
      expect(levelFor(0).level, 1);
      expect(levelFor(199).level, 1);
      expect(levelFor(200).level, 2); // L1 needs 200
      expect(levelFor(200 + 300).level, 3); // L2 needs 300
      final l = levelFor(200 + 300 + 400 + 320);
      expect(l.level, 4);
      expect(l.title, 'Steady Sipper');
      expect(l.xpIntoLevel, 320);
      expect(l.xpForNext, 500);
      expect(l.xpRemaining, 180);
      expect(l.nextTitle, 'Hydro Pro');
    });

    test('titles stop at the legend', () {
      expect(titleForLevel(1), 'Tiny Drop');
      expect(titleForLevel(9), 'Wateroo Legend');
      expect(titleForLevel(42), 'Wateroo Legend');
    });
  });

  group('streaks', () {
    final now = DateTime(2026, 11, 24, 12);

    test('counts through yesterday while today is still open', () {
      final days = {'2026-11-21', '2026-11-22', '2026-11-23'};
      expect(currentStreak(days, now), 3);
    });

    test('includes today once reached', () {
      final days = {'2026-11-22', '2026-11-23', '2026-11-24'};
      expect(currentStreak(days, now), 3);
    });

    test('a missed day breaks it', () {
      final days = {'2026-11-20', '2026-11-21', '2026-11-23'};
      expect(currentStreak(days, now), 1);
      expect(currentStreak({'2026-11-20'}, now), 0);
    });

    test('best streak across months', () {
      final days = {
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
        '2026-11-10',
        '2026-11-11',
      };
      expect(bestStreak(days), 4);
      expect(bestStreak({}), 0);
    });
  });

  group('badges', () {
    test('earned from the situation', () {
      expect(
        earnedBadges(
          hasDrunk: true,
          drinkTime: DateTime(2026, 1, 1, 8, 30),
          goalDayCount: 0,
          streak: 0,
        ),
        {'first_glass', 'early_bird'},
      );
      expect(
        earnedBadges(
          hasDrunk: true,
          drinkTime: DateTime(2026, 1, 1, 14),
          goalDayCount: 7,
          streak: 7,
        ),
        {'first_glass', 'glass_full', 'streak_3', 'streak_7'},
      );
    });
  });

  group('reminders', () {
    test('hourly from 8 to 22 gives 15 a day', () {
      const s = ReminderSettings();
      expect(s.perDay, 15);
      expect(s.minutesOfDay().first, 8 * 60);
      expect(s.minutesOfDay().last, 22 * 60);
    });

    test('custom interval', () {
      const s = ReminderSettings(
        mode: ReminderMode.custom,
        intervalMinutes: 45,
      );
      expect(s.everyMinutes, 45);
      // 08:00, 08:45, ... last one not after 22:00
      expect(s.minutesOfDay().last <= 22 * 60, isTrue);
      expect(s.perDay, 19);
    });

    test('upcoming skips the past and respects the cap', () {
      const s = ReminderSettings();
      final now = DateTime(2026, 11, 24, 21, 30);
      final list = upcomingReminders(now, s, goalReachedToday: false);
      expect(list.first, DateTime(2026, 11, 24, 22));
      expect(list[1], DateTime(2026, 11, 25, 8));
      expect(list.length, 1 + 15 + 15);

      const dense = ReminderSettings(
        mode: ReminderMode.custom,
        intervalMinutes: 15,
      );
      final capped = upcomingReminders(
        DateTime(2026, 11, 24, 6),
        dense,
        goalReachedToday: false,
      );
      expect(capped.length, 60);
    });

    test('pause when full skips the rest of today only', () {
      const s = ReminderSettings();
      final now = DateTime(2026, 11, 24, 12);
      final list = upcomingReminders(now, s, goalReachedToday: true);
      expect(list.first, DateTime(2026, 11, 25, 8));

      final noPause = upcomingReminders(
        now,
        s.copyWith(pauseWhenFull: false),
        goalReachedToday: true,
      );
      expect(noPause.first, DateTime(2026, 11, 24, 13));
    });

    test('disabled means nothing', () {
      const s = ReminderSettings(enabled: false);
      expect(
        upcomingReminders(DateTime(2026), s, goalReachedToday: false),
        isEmpty,
      );
    });

    test('settings survive JSON', () {
      const s = ReminderSettings(
        enabled: false,
        mode: ReminderMode.custom,
        intervalMinutes: 90,
        fromHour: 7,
        toHour: 21,
        pauseWhenFull: false,
      );
      final back = ReminderSettings.fromJson(s.toJson());
      expect(back.toJson(), s.toJson());
    });
  });
}
