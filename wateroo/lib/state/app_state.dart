import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../logic/badges.dart';
import '../logic/dates.dart';
import '../logic/levels.dart';
import '../logic/reminders.dart';
import '../logic/streaks.dart';
import '../personal.dart';

/// Something that turns reminder settings into scheduled notifications.
abstract class ReminderScheduler {
  Future<void> reschedule(
    ReminderSettings settings, {
    required bool goalReachedToday,
    required DateTime now,
  });
}

/// What happened when a drink was logged – used for the celebrations.
class DrinkResult {
  const DrinkResult({
    required this.ml,
    required this.xpGained,
    required this.goalJustReached,
    required this.newBadges,
    required this.levelUpTo,
    this.noteIndex,
  });

  final int ml;
  final int xpGained;
  final bool goalJustReached;
  final List<String> newBadges;

  /// The new level if this drink caused a level-up, otherwise null.
  final int? levelUpTo;

  /// The love note this drink unlocked (index into [loveNotes]), if any.
  final int? noteIndex;
}

class _UndoEntry {
  _UndoEntry(this.day, this.ml, this.xp, this.goalJustReached);
  final String day;
  final int ml;
  final int xp;
  final bool goalJustReached;
}

class AppState extends ChangeNotifier {
  AppState({required this._prefs, this._scheduler, DateTime Function()? clock})
    : _clock = clock ?? DateTime.now {
    _load();
  }

  static const _storageKey = 'wateroo_state_v1';

  final SharedPreferences _prefs;
  final ReminderScheduler? _scheduler;
  final DateTime Function() _clock;

  bool _onboarded = false;
  int _goalMl = 2000;
  ReminderSettings _reminders = const ReminderSettings();
  final Map<String, int> _dayTotals = {};
  final Set<String> _goalDays = {};
  int _totalXp = 0;
  final Map<String, String> _badges = {}; // badge id -> day key
  _UndoEntry? _lastDrink;

  // ---- Read access -------------------------------------------------------

  DateTime get now => _clock();
  String get todayKey => dayKey(now);

  bool get onboarded => _onboarded;
  int get goalMl => _goalMl;
  ReminderSettings get reminders => _reminders;

  int get todayMl => _dayTotals[todayKey] ?? 0;
  int mlOn(String day) => _dayTotals[day] ?? 0;
  double get todayProgress => _goalMl == 0 ? 0 : todayMl / _goalMl;
  bool get goalReachedToday => _goalDays.contains(todayKey);
  bool goalReachedOn(String day) => _goalDays.contains(day);

  int get totalXp => _totalXp;
  LevelInfo get level => levelFor(_totalXp);

  int get streak => currentStreak(_goalDays, now);
  int get longestStreak => bestStreak(_goalDays);

  Map<String, String> get unlockedBadges => Map.unmodifiable(_badges);

  /// Love notes unlocked so far: one per day the glass was filled.
  int get notesUnlocked =>
      _goalDays.length < loveNotes.length ? _goalDays.length : loveNotes.length;

  bool get canUndo => _lastDrink != null && _lastDrink!.day == todayKey;

  DateTime? get nextReminderTime =>
      nextReminder(now, _reminders, goalReachedToday: goalReachedToday);

  // ---- Actions -----------------------------------------------------------

  Future<void> completeOnboarding({
    required int goalMl,
    required ReminderSettings reminders,
  }) async {
    _onboarded = true;
    _goalMl = goalMl;
    _reminders = reminders;
    await _commit();
  }

  Future<void> setGoal(int ml) async {
    _goalMl = ml.clamp(500, 5000);
    await _commit();
  }

  Future<void> setReminders(ReminderSettings settings) async {
    _reminders = settings;
    await _commit();
  }

  Future<DrinkResult> addDrink(int ml) async {
    final t = now;
    final day = dayKey(t);
    final levelBefore = level.level;

    _dayTotals[day] = (_dayTotals[day] ?? 0) + ml;
    var xp = xpForDrink(ml);

    var goalJustReached = false;
    if (!_goalDays.contains(day) && _dayTotals[day]! >= _goalMl) {
      _goalDays.add(day);
      xp += goalBonusXp;
      goalJustReached = true;
    }
    _totalXp += xp;

    final earned = earnedBadges(
      hasDrunk: true,
      drinkTime: t,
      goalDayCount: _goalDays.length,
      streak: currentStreak(_goalDays, t),
    );
    final newBadges = [
      for (final b in allBadges)
        if (earned.contains(b.id) && !_badges.containsKey(b.id)) b.id,
    ];
    for (final id in newBadges) {
      _badges[id] = day;
    }

    _lastDrink = _UndoEntry(day, ml, xp, goalJustReached);
    final levelAfter = level.level;
    await _commit();

    return DrinkResult(
      ml: ml,
      xpGained: xp,
      goalJustReached: goalJustReached,
      newBadges: newBadges,
      levelUpTo: levelAfter > levelBefore ? levelAfter : null,
      noteIndex: goalJustReached && _goalDays.length <= loveNotes.length
          ? _goalDays.length - 1
          : null,
    );
  }

  /// Takes back the last drink of today. Badges already earned are kept.
  Future<void> undoLastDrink() async {
    final last = _lastDrink;
    if (last == null || last.day != todayKey) return;
    _dayTotals[last.day] = ((_dayTotals[last.day] ?? 0) - last.ml).clamp(
      0,
      1 << 30,
    );
    _totalXp = (_totalXp - last.xp).clamp(0, 1 << 30);
    if (last.goalJustReached) _goalDays.remove(last.day);
    _lastDrink = null;
    await _commit();
  }

  /// Call when the app comes back to the foreground: a new day may have
  /// started, and reminders need refreshing.
  Future<void> refresh() async {
    notifyListeners();
    await _reschedule();
  }

  // ---- Persistence -------------------------------------------------------

  void _load() {
    final raw = _prefs.getString(_storageKey);
    if (raw == null) return;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      _onboarded = j['onboarded'] as bool? ?? false;
      _goalMl = j['goalMl'] as int? ?? 2000;
      _reminders = ReminderSettings.fromJson(
        (j['reminders'] as Map?)?.cast<String, dynamic>() ?? const {},
      );
      _dayTotals.addAll(
        (j['dayTotals'] as Map? ?? const {}).map(
          (k, v) => MapEntry(k as String, v as int),
        ),
      );
      _goalDays.addAll((j['goalDays'] as List? ?? const []).cast<String>());
      _totalXp = j['totalXp'] as int? ?? 0;
      _badges.addAll(
        (j['badges'] as Map? ?? const {}).map(
          (k, v) => MapEntry(k as String, v as String),
        ),
      );
    } catch (e) {
      debugPrint('Wateroo: could not read saved state ($e). Starting fresh.');
    }
  }

  Future<void> _commit() async {
    notifyListeners();
    await _prefs.setString(
      _storageKey,
      jsonEncode({
        'onboarded': _onboarded,
        'goalMl': _goalMl,
        'reminders': _reminders.toJson(),
        'dayTotals': _dayTotals,
        'goalDays': _goalDays.toList()..sort(),
        'totalXp': _totalXp,
        'badges': _badges,
      }),
    );
    await _reschedule();
  }

  Future<void> _reschedule() async {
    if (!_onboarded) return;
    try {
      await _scheduler?.reschedule(
        _reminders,
        goalReachedToday: goalReachedToday,
        now: now,
      );
    } catch (e) {
      debugPrint('Wateroo: could not schedule reminders ($e).');
    }
  }
}
