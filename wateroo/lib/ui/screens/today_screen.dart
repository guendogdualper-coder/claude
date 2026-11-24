import 'package:material_ui/material_ui.dart';

import '../../logic/badges.dart';
import '../../logic/dates.dart';
import '../../logic/levels.dart';
import '../../personal.dart';
import '../../state/app_state.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/glass.dart';

class TodayScreen extends StatelessWidget {
  const TodayScreen({super.key, required this.onOpenRewards});

  final VoidCallback onOpenRewards;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.stateOf(context);
    final pct = (state.todayProgress * 100).round().clamp(0, 999);
    final full = state.goalReachedToday;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greetingFor(state.now),
                      style: body(14, weight: 500, color: WColors.textSubtle),
                    ),
                    Text('Today', style: display(32)),
                  ],
                ),
              ),
              _LevelChip(level: state.level.level, onTap: onOpenRewards),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(
                icon: Icons.water_drop,
                text: state.streak == 0
                    ? 'Start a streak today'
                    : '${state.streak}-day streak',
              ),
              _InfoChip(
                icon: Icons.schedule,
                text: _reminderText(context, state),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: WColors.deepWater,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Column(
              children: [
                GlassView(fill: state.todayProgress, sparkle: full),
                const SizedBox(height: 8),
                Text(
                  '${formatMl(state.todayMl)} ml',
                  style: display(36, color: Colors.white, height: 1),
                ),
                const SizedBox(height: 6),
                InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => _editGoal(context, state),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'of ${formatMl(state.goalMl)} ml · $pct%',
                          style: body(15, color: WColors.onDeepMuted),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.edit_outlined,
                          size: 16,
                          color: WColors.onDeepMuted,
                          semanticLabel: 'Edit daily goal',
                        ),
                      ],
                    ),
                  ),
                ),
                if (full) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Glass full! Great job.',
                    style: body(15, weight: 600, color: WColors.sparkle),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Text('Add a drink', style: body(15, weight: 600)),
              ),
              if (state.canUndo)
                TextButton(
                  onPressed: state.undoLastDrink,
                  child: Text(
                    'Undo last',
                    style: body(14, weight: 500, color: WColors.actionBlue),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final (ml, primary) in const [
                (150, false),
                (250, true),
                (500, false),
              ]) ...[
                if (ml != 150) const SizedBox(width: 10),
                Expanded(
                  child: _AddButton(
                    ml: ml,
                    primary: primary,
                    onPressed: () => _add(context, state, ml),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _reminderText(BuildContext context, AppState state) {
    if (!state.reminders.enabled) return 'Reminders off';
    final next = state.nextReminderTime;
    if (next == null) return 'No reminders planned';
    if (state.goalReachedToday && dayKey(next) != state.todayKey) {
      return 'Done for today';
    }
    final time = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay.fromDateTime(next),
      alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context),
    );
    return 'Next reminder $time';
  }

  Future<void> _add(BuildContext context, AppState state, int ml) async {
    final messenger = ScaffoldMessenger.of(context);
    final result = await state.addDrink(ml);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            '+$ml ml · +${result.xpGained} XP',
            style: body(15, weight: 600, color: Colors.white),
          ),
          action: SnackBarAction(
            label: 'Undo',
            textColor: WColors.splash,
            onPressed: state.undoLastDrink,
          ),
        ),
      );
    final worthCelebrating =
        result.goalJustReached ||
        result.levelUpTo != null ||
        result.newBadges.isNotEmpty;
    if (worthCelebrating && context.mounted) {
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: WColors.deepWater,
        showDragHandle: true,
        // Lets the sheet grow past half the screen when a love note is shown.
        isScrollControlled: true,
        builder: (_) => _CelebrationSheet(result: result),
      );
    }
  }

  Future<void> _editGoal(BuildContext context, AppState state) {
    return showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => _GoalSheet(initial: state.goalMl, onSave: state.setGoal),
    );
  }
}

class _LevelChip extends StatelessWidget {
  const _LevelChip({required this.level, required this.onTap});

  final int level;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: WColors.deepWater,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.star_rounded,
                  size: 18,
                  color: WColors.sparkle,
                ),
                const SizedBox(width: 6),
                Text(
                  'Level $level',
                  style: body(14, weight: 600, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: WColors.brightBlue),
          const SizedBox(width: 6),
          Text(text, style: body(13, weight: 600)),
        ],
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({
    required this.ml,
    required this.primary,
    required this.onPressed,
  });

  final int ml;
  final bool primary;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: primary ? WColors.actionBlue : WColors.ice,
          foregroundColor: primary ? Colors.white : WColors.deepWater,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: EdgeInsets.zero,
          textStyle: body(16, weight: 600),
        ),
        onPressed: onPressed,
        child: Text('+$ml ml'),
      ),
    );
  }
}

class _CelebrationSheet extends StatelessWidget {
  const _CelebrationSheet({required this.result});

  final DrinkResult result;

  @override
  Widget build(BuildContext context) {
    final lines = <(IconData, String, String)>[
      if (result.goalJustReached)
        (
          Icons.local_drink_rounded,
          'Glass full!',
          'Daily goal reached · +$goalBonusXp XP bonus',
        ),
      if (result.levelUpTo != null)
        (
          Icons.star_rounded,
          'Level up!',
          'Level ${result.levelUpTo} · ${titleForLevel(result.levelUpTo!)}',
        ),
      for (final id in result.newBadges)
        (Icons.military_tech_rounded, 'New badge', badgeById(id).name),
    ];
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const GlassView(fill: 1, size: 120, sparkle: true),
            const SizedBox(height: 8),
            for (final (icon, title, sub) in lines)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Icon(icon, color: WColors.sparkle, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: display(20, color: Colors.white)),
                          Text(
                            sub,
                            style: body(14, color: WColors.onDeepMuted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            if (result.noteIndex != null) ...[
              const SizedBox(height: 12),
              LoveNoteCard(
                number: result.noteIndex! + 1,
                text: loveNotes[result.noteIndex!],
              ),
            ],
            const SizedBox(height: 16),
            PrimaryButton(
              label: 'Keep going',
              background: WColors.splash,
              foreground: WColors.deepWater,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}

/// A love note card: shown when the glass gets full and in Rewards.
class LoveNoteCard extends StatelessWidget {
  const LoveNoteCard({super.key, required this.number, required this.text});

  final int number;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F6),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.favorite_rounded,
            color: Color(0xFFE0446A),
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Note #$number for $friendName',
                  style: body(12, weight: 600, color: const Color(0xFFB0284F)),
                ),
                const SizedBox(height: 4),
                Text(text, style: body(16, weight: 500, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GoalSheet extends StatefulWidget {
  const _GoalSheet({required this.initial, required this.onSave});

  final int initial;
  final Future<void> Function(int) onSave;

  @override
  State<_GoalSheet> createState() => _GoalSheetState();
}

class _GoalSheetState extends State<_GoalSheet> {
  late int _goal = widget.initial;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Daily goal', style: display(24)),
            const SizedBox(height: 16),
            GoalStepper(
              value: _goal,
              onChanged: (v) => setState(() => _goal = v),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Save',
              onPressed: () async {
                await widget.onSave(_goal);
                if (context.mounted) Navigator.of(context).pop();
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// − 2,000 ml + control, shared by onboarding and the goal sheet.
class GoalStepper extends StatelessWidget {
  const GoalStepper({super.key, required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget step(IconData icon, String label, int delta) => IconButton.filled(
      style: IconButton.styleFrom(
        backgroundColor: WColors.deepWaterLight,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      tooltip: label,
      onPressed: () => onChanged((value + delta).clamp(500, 5000)),
      icon: Icon(icon),
    );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: WColors.deepWater,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          step(Icons.remove, 'Decrease by 250 ml', -250),
          Expanded(
            child: Column(
              children: [
                Text(
                  formatMl(value),
                  style: display(40, color: Colors.white, height: 1),
                ),
                const SizedBox(height: 4),
                Text('ml per day', style: body(13, color: WColors.onDeepMuted)),
              ],
            ),
          ),
          step(Icons.add, 'Increase by 250 ml', 250),
        ],
      ),
    );
  }
}
