import 'package:material_ui/material_ui.dart';

import '../../logic/dates.dart';
import '../../logic/levels.dart';
import '../../logic/reminders.dart';
import '../../personal.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/glass.dart';
import 'today_screen.dart' show GoalStepper;

/// Four steps: welcome, daily goal, reminders, ready.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pages = PageController();
  int _step = 0;
  int _goal = 2000;
  int _every = 60;
  bool _remindersOn = true;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _go(int step) {
    setState(() => _step = step);
    _pages.animateToPage(
      step,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _allowNotifications() async {
    final granted = await AppScope.permissionOf(context)();
    if (!mounted) return;
    setState(() => _remindersOn = granted);
    _go(3);
  }

  Future<void> _finish() {
    return AppScope.stateOf(context).completeOnboarding(
      goalMl: _goal,
      reminders: ReminderSettings(
        enabled: _remindersOn,
        mode: _every == 60 ? ReminderMode.hourly : ReminderMode.custom,
        intervalMinutes: _every == 60 ? 45 : _every,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = _step == 0 || _step == 3;
    return Scaffold(
      backgroundColor: dark ? WColors.deepWater : WColors.mist,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            children: [
              _ProgressHeader(
                step: _step,
                dark: dark,
                onBack: _step == 1 || _step == 2 ? () => _go(_step - 1) : null,
              ),
              const SizedBox(height: 20),
              Expanded(
                child: PageView(
                  controller: _pages,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _Welcome(onNext: () => _go(1)),
                    _GoalStep(
                      goal: _goal,
                      onChanged: (g) => setState(() => _goal = g),
                      onNext: () => _go(2),
                    ),
                    _ReminderStep(
                      every: _every,
                      onChanged: (m) => setState(() => _every = m),
                      onAllow: _allowNotifications,
                      onSkip: () {
                        setState(() => _remindersOn = false);
                        _go(3);
                      },
                    ),
                    _Ready(
                      goal: _goal,
                      every: _every,
                      remindersOn: _remindersOn,
                      onStart: _finish,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  const _ProgressHeader({
    required this.step,
    required this.dark,
    required this.onBack,
  });

  final int step;
  final bool dark;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final on = dark ? WColors.splash : WColors.actionBlue;
    final off = dark ? const Color(0xFF2C4C6E) : WColors.line;
    return Semantics(
      label: 'Step ${step + 1} of 4',
      child: SizedBox(
        height: 44,
        child: Row(
          children: [
            if (onBack != null) ...[
              IconButton.filledTonal(
                tooltip: 'Back',
                onPressed: onBack,
                style: IconButton.styleFrom(backgroundColor: Colors.white),
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              const SizedBox(width: 12),
            ],
            for (var i = 0; i < 4; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Expanded(
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: i <= step ? on : off,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.onNext});

  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Expanded(
          child: Center(child: GlassView(fill: 0.6, size: 240, sparkle: true)),
        ),
        Text(
          'MADE WITH ♥ FOR ${friendName.toUpperCase()}',
          style: body(13, weight: 600, color: WColors.splash),
        ),
        const SizedBox(height: 8),
        Text(
          'Meet Wateroo',
          style: display(40, color: Colors.white, height: 1.05),
        ),
        const SizedBox(height: 12),
        Text(
          'Hi $friendName! I’m your thirsty little buddy. Gentle reminders, a '
          'glass that fills as you drink – and a little surprise every time '
          'it’s full.',
          style: body(17, color: const Color(0xFFC8DFEE), height: 1.5),
        ),
        const SizedBox(height: 24),
        PrimaryButton(
          label: 'Get started',
          background: WColors.splash,
          foreground: WColors.deepWater,
          onPressed: onNext,
        ),
      ],
    );
  }
}

class _GoalStep extends StatelessWidget {
  const _GoalStep({
    required this.goal,
    required this.onChanged,
    required this.onNext,
  });

  final int goal;
  final ValueChanged<int> onChanged;
  final VoidCallback onNext;

  static const _presets = [
    ('Easy start', 'Build the habit first', 1500),
    ('Everyday', 'A solid daily routine', 2000),
    ('Active', 'Sport or a warm day', 2500),
    ('Power', 'Lots of movement', 3000),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            children: [
              Text(
                'How full should your glass get each day?',
                style: display(30, height: 1.15),
              ),
              const SizedBox(height: 8),
              Text(
                'Pick a daily goal. You can change it anytime.',
                style: body(15, color: WColors.textMuted),
              ),
              const SizedBox(height: 20),
              GoalStepper(value: goal, onChanged: onChanged),
              const SizedBox(height: 16),
              for (final (name, desc, ml) in _presets)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _OptionTile(
                    selected: goal == ml,
                    onTap: () => onChanged(ml),
                    title: name,
                    subtitle: desc,
                    trailing: '${formatLiters(ml)} L',
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        PrimaryButton(label: 'Continue', onPressed: onNext),
      ],
    );
  }
}

class _ReminderStep extends StatelessWidget {
  const _ReminderStep({
    required this.every,
    required this.onChanged,
    required this.onAllow,
    required this.onSkip,
  });

  final int every;
  final ValueChanged<int> onChanged;
  final VoidCallback onAllow;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    const base = ReminderSettings();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            children: [
              Text(
                'When should Wateroo nudge you?',
                style: display(30, height: 1.15),
              ),
              const SizedBox(height: 8),
              Text(
                'Between 8 am and 10 pm. Fine-tune everything later in '
                'Reminders.',
                style: body(15, color: WColors.textMuted),
              ),
              const SizedBox(height: 20),
              for (final m in const [60, 45, 30, 90])
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _OptionTile(
                    selected: every == m,
                    onTap: () => onChanged(m),
                    title: m == 60 ? 'Every hour' : 'Every $m minutes',
                    subtitle:
                        'about ${base.copyWith(mode: ReminderMode.custom, intervalMinutes: m).perDay} a day',
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                'Your reminders will look like this',
                style: body(13, weight: 600, color: WColors.textSubtle),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: WColors.deepWater,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const GlassView(fill: 0.6, size: 40),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Wateroo', style: body(14, weight: 600)),
                          Text(
                            reminderMessages.first,
                            style: body(14, color: WColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        PrimaryButton(label: 'Allow notifications', onPressed: onAllow),
        TextButton(
          onPressed: onSkip,
          style: TextButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          child: Text(
            'Not now',
            style: body(15, weight: 500, color: WColors.actionBlue),
          ),
        ),
      ],
    );
  }
}

class _Ready extends StatelessWidget {
  const _Ready({
    required this.goal,
    required this.every,
    required this.remindersOn,
    required this.onStart,
  });

  final int goal;
  final int every;
  final bool remindersOn;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    const muted = Color(0xFFC8DFEE);
    final rows = [
      ('Daily goal', '${formatMl(goal)} ml'),
      (
        'Reminders',
        !remindersOn
            ? 'Off – turn on anytime'
            : every == 60
            ? 'Every hour, 8 am – 10 pm'
            : 'Every $every min, 8 am – 10 pm',
      ),
      ('Level', '1 · ${titleForLevel(1)}'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            children: [
              const Center(child: GlassView(fill: 0, size: 150)),
              Text(
                'You’re all set!',
                textAlign: TextAlign.center,
                style: display(34, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                'Your glass is empty and ready. Let’s fill it.',
                textAlign: TextAlign.center,
                style: body(16, color: muted),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                decoration: BoxDecoration(
                  color: const Color(0xFF17375A),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    for (final (i, (label, value)) in rows.indexed)
                      Container(
                        constraints: const BoxConstraints(minHeight: 52),
                        decoration: BoxDecoration(
                          border: i < rows.length - 1
                              ? const Border(
                                  bottom: BorderSide(
                                    color: WColors.deepWaterLight,
                                  ),
                                )
                              : null,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(label, style: body(15, color: muted)),
                            ),
                            Text(
                              value,
                              style: body(15, weight: 600, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: WColors.sparkle,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.star_rounded, color: WColors.deepWater),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'First badge waiting: log your first glass to unlock '
                        '“First Glass”.',
                        style: body(14, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        PrimaryButton(
          label: 'Start my first glass',
          background: WColors.splash,
          foreground: WColors.deepWater,
          onPressed: onStart,
        ),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.selected,
    required this.onTap,
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  final bool selected;
  final VoidCallback onTap;
  final String title;
  final String subtitle;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? WColors.ice : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected ? WColors.actionBlue : WColors.line,
            width: selected ? 2 : 1.5,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: body(16, weight: 600)),
                      Text(subtitle, style: body(13, color: WColors.textMuted)),
                    ],
                  ),
                ),
                if (trailing != null)
                  Text(trailing!, style: body(16, weight: 600)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
