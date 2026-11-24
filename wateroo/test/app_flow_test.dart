import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wateroo/main.dart';
import 'package:wateroo/state/app_state.dart';

void main() {
  testWidgets('onboarding → fill the glass → celebration → rewards', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844) * 3;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final state = AppState(
      prefs: prefs,
      clock: () => DateTime(2026, 11, 24, 10),
    );
    var permissionAsked = false;
    await tester.pumpWidget(
      WaterooApp(
        state: state,
        requestPermission: () async {
          permissionAsked = true;
          return true;
        },
      ),
    );

    // 1 Welcome
    expect(find.text('Meet Wateroo'), findsOneWidget);
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();

    // 2 Goal: pick "Easy start" (1.5 L), then fine-tune down to 1,000 ml
    await tester.tap(find.text('Easy start'));
    await tester.pump();
    expect(find.text('1,500'), findsOneWidget);
    await tester.tap(find.byTooltip('Decrease by 250 ml'));
    await tester.pump();
    await tester.tap(find.byTooltip('Decrease by 250 ml'));
    await tester.pump();
    expect(find.text('1,000'), findsOneWidget);
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // 3 Reminders: every 30 minutes, allow notifications
    await tester.tap(find.text('Every 30 minutes'));
    await tester.tap(find.text('Allow notifications'));
    await tester.pumpAndSettle();
    expect(permissionAsked, isTrue);

    // 4 Ready shows the choices
    expect(find.text('You’re all set!'), findsOneWidget);
    expect(find.text('1,000 ml'), findsOneWidget);
    expect(find.text('Every 30 min, 8 am – 10 pm'), findsOneWidget);
    await tester.tap(find.text('Start my first glass'));
    await tester.pumpAndSettle();

    expect(state.onboarded, isTrue);
    expect(state.goalMl, 1000);
    expect(state.reminders.everyMinutes, 30);

    // Today
    expect(find.text('Today'), findsWidgets);
    expect(find.text('0 ml'), findsOneWidget);

    // First drink unlocks a badge → celebration sheet
    await tester.tap(find.text('+500 ml'));
    await tester.pumpAndSettle();
    expect(find.text('New badge'), findsOneWidget);
    expect(find.text('First Glass'), findsOneWidget);
    await tester.tap(find.text('Keep going'));
    await tester.pumpAndSettle();
    expect(find.text('500 ml'), findsOneWidget);

    // Second drink fills the glass
    await tester.tap(find.text('+500 ml'));
    await tester.pumpAndSettle();
    expect(find.text('Glass full!'), findsOneWidget);
    await tester.tap(find.text('Keep going'));
    await tester.pumpAndSettle();
    expect(find.text('Glass full! Great job.'), findsOneWidget);
    expect(find.text('1,000 ml'), findsOneWidget);

    // Rewards tab shows the unlocked badges
    await tester.tap(find.text('Rewards').last);
    await tester.pumpAndSettle();
    expect(find.text('Badges · 2 of 6'), findsOneWidget);
    expect(find.text('1-day streak'), findsOneWidget);
  });

  testWidgets('reminders screen updates the plan', (tester) async {
    tester.view.physicalSize = const Size(390, 844) * 3;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    SharedPreferences.setMockInitialValues({
      'wateroo_state_v1':
          '{"onboarded":true,"goalMl":2000,"reminders":{"enabled":true,'
          '"mode":"hourly"}}',
    });
    final prefs = await SharedPreferences.getInstance();
    final state = AppState(
      prefs: prefs,
      clock: () => DateTime(2026, 11, 24, 10),
    );
    await tester.pumpWidget(
      WaterooApp(state: state, requestPermission: () async => true),
    );
    await tester.tap(find.text('Reminders').last);
    await tester.pumpAndSettle();

    expect(find.text('About 15 reminders a day'), findsOneWidget);
    await tester.tap(find.text('Custom'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('30 min'));
    await tester.pumpAndSettle();
    expect(state.reminders.everyMinutes, 30);
    expect(find.text('About 29 reminders a day'), findsOneWidget);

    await tester.tap(find.byTooltip('Until earlier'));
    await tester.pumpAndSettle();
    expect(state.reminders.toHour, 21);
  });
}
