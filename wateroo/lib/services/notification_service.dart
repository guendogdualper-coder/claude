import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../logic/reminders.dart';
import '../state/app_state.dart';

/// Schedules Wateroo's drink reminders as local notifications.
///
/// Reminders are one-off notifications for today and the next two days.
/// They are refreshed every time the app opens or something changes.
class NotificationService implements ReminderScheduler {
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _ready = false;

  /// Local notifications are only wired up for the phone apps.
  bool get _supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  Future<void> init() async {
    if (!_supported) return;
    tzdata.initializeTimeZones();
    try {
      final zone = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(zone.identifier));
    } catch (e) {
      debugPrint('Wateroo: unknown time zone, using UTC ($e).');
    }
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        // Permission is asked for during onboarding, not at app start.
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );
    _ready = true;
  }

  /// Shows the system permission dialog. Returns whether it was granted.
  Future<bool> requestPermission() async {
    if (!_ready) return false;
    if (defaultTargetPlatform == TargetPlatform.android) {
      final android = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      return await android?.requestNotificationsPermission() ?? false;
    }
    final ios = _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    return await ios?.requestPermissions(alert: true, sound: true) ?? false;
  }

  static const _details = NotificationDetails(
    android: AndroidNotificationDetails(
      'reminders',
      'Drink reminders',
      channelDescription: 'Gentle reminders to drink water',
      importance: Importance.defaultImportance,
    ),
    iOS: DarwinNotificationDetails(),
  );

  @override
  Future<void> reschedule(
    ReminderSettings settings, {
    required bool goalReachedToday,
    required DateTime now,
  }) async {
    if (!_ready) return;
    await _plugin.cancelAllPendingNotifications();
    final times = upcomingReminders(
      now,
      settings,
      goalReachedToday: goalReachedToday,
    );
    for (var i = 0; i < times.length; i++) {
      await _plugin.zonedSchedule(
        id: i + 1,
        title: 'Wateroo',
        body: reminderMessages[i % reminderMessages.length],
        scheduledDate: tz.TZDateTime.from(times[i], tz.local),
        notificationDetails: _details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      );
    }
  }
}
