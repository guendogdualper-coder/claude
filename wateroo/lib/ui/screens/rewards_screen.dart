import 'package:material_ui/material_ui.dart';

import '../../logic/badges.dart';
import '../../logic/dates.dart';
import '../app_scope.dart';
import '../theme.dart';

class RewardsScreen extends StatelessWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.stateOf(context);
    final lvl = state.level;
    final unlocked = state.unlockedBadges;
    final today = state.now;
    final last7 = [
      for (var i = 6; i >= 0; i--)
        DateTime(today.year, today.month, today.day - i),
    ];

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Rewards', style: display(32)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: WColors.deepWater,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LEVEL ${lvl.level}',
                            style: body(
                              13,
                              weight: 600,
                              color: WColors.onDeepMuted,
                            ),
                          ),
                          Text(
                            lvl.title,
                            style: display(26, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.star_rounded,
                      size: 48,
                      color: WColors.sparkle,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: lvl.progress,
                    minHeight: 12,
                    backgroundColor: WColors.deepWaterLight,
                    color: WColors.splash,
                    semanticsLabel: 'XP to next level',
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '${lvl.xpIntoLevel} / ${lvl.xpForNext} XP · '
                  '${lvl.xpRemaining} XP to ${lvl.nextTitle}',
                  style: body(14, color: WColors.onDeepMuted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Expanded(
                      child: Text(
                        state.streak == 1
                            ? '1-day streak'
                            : '${state.streak}-day streak',
                        style: display(20),
                      ),
                    ),
                    Text(
                      state.longestStreak == 1
                          ? 'Best: 1 day'
                          : 'Best: ${state.longestStreak} days',
                      style: body(13, color: WColors.textSubtle),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    for (final d in last7)
                      _DayDot(
                        label: dayKey(d) == state.todayKey
                            ? 'Today'
                            : weekdayInitial(d),
                        done: state.goalReachedOn(dayKey(d)),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Badges · ${unlocked.length} of ${allBadges.length}',
            style: body(15, weight: 600),
          ),
          const SizedBox(height: 10),
          // Rows of three; each row grows with its text (large font sizes).
          for (var i = 0; i < allBadges.length; i += 3)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var j = i; j < i + 3; j++) ...[
                      if (j > i) const SizedBox(width: 10),
                      Expanded(
                        child: j < allBadges.length
                            ? _BadgeTile(
                                name: allBadges[j].name,
                                sub: unlocked.containsKey(allBadges[j].id)
                                    ? shortDateLabel(
                                        parseDayKey(unlocked[allBadges[j].id]!),
                                      )
                                    : allBadges[j].hint,
                                on: unlocked.containsKey(allBadges[j].id),
                              )
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot({required this.label, required this.done});

  final String label;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: ${done ? 'goal reached' : 'goal not reached'}',
      excludeSemantics: true,
      child: Column(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done ? WColors.brightBlue : Colors.white,
              border: done
                  ? null
                  : Border.all(color: WColors.brightBlue, width: 2.5),
            ),
            child: done
                ? const Icon(Icons.check_rounded, color: Colors.white, size: 18)
                : null,
          ),
          const SizedBox(height: 6),
          Text(label, style: body(12, color: WColors.textSubtle)),
        ],
      ),
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.name, required this.sub, required this.on});

  final String name;
  final String sub;
  final bool on;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$name, ${on ? 'unlocked $sub' : 'locked: $sub'}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: on ? WColors.ice : const Color(0xFFEEF2F5),
              ),
              child: Icon(
                on ? Icons.water_drop : Icons.lock_outline_rounded,
                color: on ? WColors.brightBlue : const Color(0xFF8C9BA8),
                size: 24,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              name,
              textAlign: TextAlign.center,
              style: body(13, weight: 600, height: 1.2),
            ),
            const SizedBox(height: 2),
            Text(
              sub,
              textAlign: TextAlign.center,
              style: body(11, color: WColors.textSubtle),
            ),
          ],
        ),
      ),
    );
  }
}
