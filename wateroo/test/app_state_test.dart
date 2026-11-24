import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wateroo/logic/reminders.dart';
import 'package:wateroo/state/app_state.dart';

class FakeScheduler implements ReminderScheduler {
  int calls = 0;
  bool? lastGoalReached;

  @override
  Future<void> reschedule(
    ReminderSettings settings, {
    required bool goalReachedToday,
    required DateTime now,
  }) async {
    calls++;
    lastGoalReached = goalReachedToday;
  }
}

void main() {
  late DateTime clock;
  late FakeScheduler scheduler;

  Future<AppState> makeState() async {
    final prefs = await SharedPreferences.getInstance();
    return AppState(prefs: prefs, scheduler: scheduler, clock: () => clock);
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    clock = DateTime(2026, 11, 24, 10);
    scheduler = FakeScheduler();
  });

  test('drinks add up, give XP and reach the goal once', () async {
    final s = await makeState();
    await s.completeOnboarding(
      goalMl: 1000,
      reminders: const ReminderSettings(),
    );

    final r1 = await s.addDrink(500);
    expect(s.todayMl, 500);
    expect(r1.xpGained, 20);
    expect(r1.goalJustReached, isFalse);
    expect(r1.newBadges, ['first_glass']);

    final r2 = await s.addDrink(500);
    expect(r2.goalJustReached, isTrue);
    expect(r2.xpGained, 20 + 50);
    expect(r2.newBadges, ['glass_full']);
    expect(s.goalReachedToday, isTrue);
    expect(scheduler.lastGoalReached, isTrue);

    final r3 = await s.addDrink(250);
    expect(r3.goalJustReached, isFalse, reason: 'bonus only once a day');
    expect(s.totalXp, 20 + 70 + 10);
  });

  test('each full glass unlocks the next love note', () async {
    final s = await makeState();
    await s.completeOnboarding(
      goalMl: 500,
      reminders: const ReminderSettings(),
    );
    expect(s.notesUnlocked, 0);
    final r1 = await s.addDrink(500);
    expect(r1.noteIndex, 0);
    expect((await s.addDrink(250)).noteIndex, isNull, reason: 'one per day');
    clock = DateTime(2026, 11, 25, 10);
    expect((await s.addDrink(500)).noteIndex, 1);
    expect(s.notesUnlocked, 2);
  });

  test('undo takes back the drink, XP and goal', () async {
    final s = await makeState();
    await s.completeOnboarding(
      goalMl: 500,
      reminders: const ReminderSettings(),
    );
    await s.addDrink(500);
    expect(s.goalReachedToday, isTrue);
    expect(s.canUndo, isTrue);

    await s.undoLastDrink();
    expect(s.todayMl, 0);
    expect(s.totalXp, 0);
    expect(s.goalReachedToday, isFalse);
    expect(s.canUndo, isFalse);
  });

  test('a new day starts empty and the streak continues', () async {
    final s = await makeState();
    await s.completeOnboarding(
      goalMl: 500,
      reminders: const ReminderSettings(),
    );
    for (var day = 0; day < 3; day++) {
      clock = DateTime(2026, 11, 22 + day, 10);
      await s.addDrink(500);
    }
    expect(s.streak, 3);
    expect(s.unlockedBadges.containsKey('streak_3'), isTrue);

    clock = DateTime(2026, 11, 25, 9);
    expect(s.todayMl, 0);
    expect(s.streak, 3, reason: 'today is still open');
    expect(s.canUndo, isFalse, reason: "yesterday's drink can't be undone");

    clock = DateTime(2026, 11, 26, 9);
    expect(s.streak, 0);
    expect(s.longestStreak, 3);
  });

  test('level up is reported', () async {
    final s = await makeState();
    await s.completeOnboarding(
      goalMl: 5000,
      reminders: const ReminderSettings(),
    );
    DrinkResult? levelUp;
    for (var i = 0; i < 10 && levelUp == null; i++) {
      final r = await s.addDrink(500); // 20 XP each
      if (r.levelUpTo != null) levelUp = r;
    }
    expect(levelUp?.levelUpTo, 2);
    expect(s.level.level, 2);
  });

  test('everything is saved and restored', () async {
    final s = await makeState();
    await s.completeOnboarding(
      goalMl: 2500,
      reminders: const ReminderSettings(
        mode: ReminderMode.custom,
        intervalMinutes: 30,
      ),
    );
    await s.addDrink(250);

    final restored = await makeState();
    expect(restored.onboarded, isTrue);
    expect(restored.goalMl, 2500);
    expect(restored.todayMl, 250);
    expect(restored.totalXp, 10);
    expect(restored.reminders.intervalMinutes, 30);
    expect(restored.unlockedBadges.keys, contains('first_glass'));
  });

  test('broken saved data does not crash the app', () async {
    SharedPreferences.setMockInitialValues({'wateroo_state_v1': '{not json'});
    final s = await makeState();
    expect(s.onboarded, isFalse);
    expect(s.todayMl, 0);
  });

  test('reminders are not scheduled before onboarding', () async {
    final s = await makeState();
    await s.setGoal(1500);
    expect(scheduler.calls, 0);
    await s.completeOnboarding(
      goalMl: 1500,
      reminders: const ReminderSettings(),
    );
    expect(scheduler.calls, 1);
  });
}
