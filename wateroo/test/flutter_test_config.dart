import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';

/// Loads the real app fonts so widget tests measure text like the device does
/// (otherwise tests use a placeholder font with extra-wide glyphs).
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  final families = {
    'Inter': ['Inter-400', 'Inter-500', 'Inter-600'],
    'SpaceGrotesk': ['SpaceGrotesk-700'],
  };
  for (final MapEntry(key: family, value: files) in families.entries) {
    final loader = FontLoader(family);
    for (final f in files) {
      final bytes = File('assets/fonts/$f.ttf').readAsBytesSync();
      loader.addFont(Future.value(ByteData.sublistView(bytes)));
    }
    await loader.load();
  }
  await testMain();
}
