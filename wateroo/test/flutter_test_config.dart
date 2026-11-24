import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';

/// Loads the real app fonts so widget tests measure text like the device does
/// (otherwise tests use a placeholder font with extra-wide glyphs).
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  for (final (family, file) in const [
    ('Inter', 'assets/fonts/Inter.ttf'),
    ('SpaceGrotesk', 'assets/fonts/SpaceGrotesk.ttf'),
  ]) {
    final bytes = File(file).readAsBytesSync();
    final loader = FontLoader(family)
      ..addFont(Future.value(ByteData.sublistView(bytes)));
    await loader.load();
  }
  await testMain();
}
