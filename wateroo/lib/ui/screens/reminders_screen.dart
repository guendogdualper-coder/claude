import 'package:material_ui/material_ui.dart';

import '../../logic/reminders.dart';
import '../app_scope.dart';
import '../theme.dart';

class RemindersScreen extends StatelessWidget {
  const RemindersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.stateOf(context);
    final s = state.reminders;
    void update(ReminderSettings n) => state.setReminders(n);

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Reminders', style: display(32)),
          const SizedBox(height: 16),
          _Card(
            child: SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: Text('Remind me to drink', style: body(16, weight: 600)),
              subtitle: Text(
                s.enabled
                    ? 'About ${s.perDay} reminders a day'
                    : 'Reminders are off',
                style: body(13, color: WColors.textSubtle),
              ),
              value: s.enabled,
              onChanged: (on) async {
                if (on) await AppScope.permissionOf(context)();
                update(s.copyWith(enabled: on));
              },
            ),
          ),
          const SizedBox(height: 20),
          Text('How often', style: body(15, weight: 600)),
          const SizedBox(height: 10),
          SegmentedButton<ReminderMode>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(
                value: ReminderMode.hourly,
                label: Text('Every hour'),
              ),
              ButtonSegment(value: ReminderMode.custom, label: Text('Custom')),
            ],
            selected: {s.mode},
            onSelectionChanged: (sel) => update(s.copyWith(mode: sel.first)),
          ),
          if (s.mode == ReminderMode.custom) ...[
            const SizedBox(height: 12),
            Text('Every … minutes', style: body(13, color: WColors.textSubtle)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final m in ReminderSettings.intervalChoices)
                  ChoiceChip(
                    label: Text('$m min'),
                    labelStyle: body(15, weight: 600),
                    selected: s.intervalMinutes == m,
                    selectedColor: WColors.ice,
                    onSelected: (_) => update(s.copyWith(intervalMinutes: m)),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          Text('Active hours', style: body(15, weight: 600)),
          const SizedBox(height: 10),
          _Card(
            child: Column(
              children: [
                _HourRow(
                  label: 'From',
                  hour: s.fromHour,
                  onMinus: s.fromHour > 0
                      ? () => update(s.copyWith(fromHour: s.fromHour - 1))
                      : null,
                  onPlus: s.fromHour < s.toHour - 1
                      ? () => update(s.copyWith(fromHour: s.fromHour + 1))
                      : null,
                ),
                const Divider(height: 1, color: WColors.line),
                _HourRow(
                  label: 'Until',
                  hour: s.toHour,
                  onMinus: s.toHour > s.fromHour + 1
                      ? () => update(s.copyWith(toHour: s.toHour - 1))
                      : null,
                  onPlus: s.toHour < 23
                      ? () => update(s.copyWith(toHour: s.toHour + 1))
                      : null,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _Card(
            child: SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: Text(
                'Pause when glass is full',
                style: body(16, weight: 600),
              ),
              subtitle: Text(
                'No more pings once you hit your goal',
                style: body(13, color: WColors.textSubtle),
              ),
              value: s.pauseWhenFull,
              onChanged: (v) => update(s.copyWith(pauseWhenFull: v)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Material(
    // A Material (not a decorated box) so switch tiles can show ink.
    color: Colors.white,
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: child,
    ),
  );
}

class _HourRow extends StatelessWidget {
  const _HourRow({
    required this.label,
    required this.hour,
    required this.onMinus,
    required this.onPlus,
  });

  final String label;
  final int hour;
  final VoidCallback? onMinus;
  final VoidCallback? onPlus;

  @override
  Widget build(BuildContext context) {
    final time = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay(hour: hour, minute: 0),
      alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context),
    );
    return SizedBox(
      height: 60,
      child: Row(
        children: [
          Expanded(child: Text(label, style: body(15))),
          IconButton.filledTonal(
            tooltip: '$label earlier',
            onPressed: onMinus,
            icon: const Icon(Icons.remove),
          ),
          SizedBox(
            width: 84,
            child: Text(
              time,
              textAlign: TextAlign.center,
              style: body(16, weight: 600),
            ),
          ),
          IconButton.filledTonal(
            tooltip: '$label later',
            onPressed: onPlus,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }
}
