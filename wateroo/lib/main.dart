import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/notification_service.dart';
import 'state/app_state.dart';
import 'ui/app_scope.dart';
import 'ui/screens/home_shell.dart';
import 'ui/screens/onboarding_screen.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final notifications = NotificationService();
  await notifications.init();
  final prefs = await SharedPreferences.getInstance();
  final state = AppState(prefs: prefs, scheduler: notifications);
  runApp(
    WaterooApp(
      state: state,
      requestPermission: notifications.requestPermission,
    ),
  );
}

class WaterooApp extends StatefulWidget {
  const WaterooApp({
    super.key,
    required this.state,
    required this.requestPermission,
  });

  final AppState state;
  final Future<bool> Function() requestPermission;

  @override
  State<WaterooApp> createState() => _WaterooAppState();
}

class _WaterooAppState extends State<WaterooApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Refresh reminders on every start (they are planned 3 days ahead).
    widget.state.refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState lifecycle) {
    // A new day may have started while the app was in the background.
    if (lifecycle == AppLifecycleState.resumed) widget.state.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: widget.state,
      requestPermission: widget.requestPermission,
      child: MaterialApp(
        title: 'Wateroo',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: ListenableBuilder(
          listenable: widget.state,
          builder: (context, _) => widget.state.onboarded
              ? const HomeShell()
              : const OnboardingScreen(),
        ),
      ),
    );
  }
}
