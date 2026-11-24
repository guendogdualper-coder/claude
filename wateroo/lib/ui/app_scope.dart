import 'package:material_ui/material_ui.dart';

import '../state/app_state.dart';

/// Gives every screen access to the app state and the permission prompt.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({
    super.key,
    required AppState state,
    required this.requestPermission,
    required super.child,
  }) : super(notifier: state);

  /// Shows the system notification permission dialog.
  final Future<bool> Function() requestPermission;

  static AppScope _of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'No AppScope above this widget');
    return scope!;
  }

  static AppState stateOf(BuildContext context) => _of(context).notifier!;

  static Future<bool> Function() permissionOf(BuildContext context) =>
      _of(context).requestPermission;
}
