import 'package:material_ui/material_ui.dart';

/// Wateroo brand colors (see the brand board).
abstract final class WColors {
  static const deepWater = Color(0xFF0E2A47);
  static const deepWaterLight = Color(0xFF24476B);
  static const splash = Color(0xFF3CC8F0);
  static const actionBlue = Color(0xFF0B6FB0);
  static const brightBlue = Color(0xFF1F8FD1);
  static const sparkle = Color(0xFFFFD166);
  static const mist = Color(0xFFF4FAFD);
  static const goalGreen = Color(0xFF0D7F63);
  static const ice = Color(0xFFDCEFFA);
  static const line = Color(0xFFD3E2EC);
  static const textMuted = Color(0xFF4A5D70);
  static const textSubtle = Color(0xFF5B6B7A);
  static const onDeepMuted = Color(0xFFB9D7EA);
}

/// Inter (body). The bundled font is variable, so the weight is set as a
/// font variation too.
TextStyle body(
  double size, {
  int weight = 400,
  Color color = WColors.deepWater,
  double? height,
}) => TextStyle(
  fontFamily: 'Inter',
  fontSize: size,
  fontWeight: FontWeight.values[(weight ~/ 100) - 1],
  fontVariations: [FontVariation.weight(weight.toDouble())],
  color: color,
  height: height,
);

/// Space Grotesk (headings and big numbers).
TextStyle display(
  double size, {
  int weight = 700,
  Color color = WColors.deepWater,
  double? height,
}) => TextStyle(
  fontFamily: 'SpaceGrotesk',
  fontSize: size,
  fontWeight: FontWeight.values[(weight ~/ 100) - 1],
  fontVariations: [FontVariation.weight(weight.toDouble())],
  color: color,
  height: height,
);

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: WColors.actionBlue,
    primary: WColors.actionBlue,
    surface: Colors.white,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: WColors.mist,
    fontFamily: 'Inter',
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: WColors.deepWater,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: WColors.ice,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => body(
          12,
          weight: states.contains(WidgetState.selected) ? 600 : 500,
          color: states.contains(WidgetState.selected)
              ? WColors.actionBlue
              : WColors.textSubtle,
        ),
      ),
    ),
  );
}

/// Big primary button used across the app.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.background = WColors.actionBlue,
    this.foreground = Colors.white,
  });

  final String label;
  final VoidCallback? onPressed;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: background,
          foregroundColor: foreground,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: body(17, weight: 600),
        ),
        onPressed: onPressed,
        child: Text(label),
      ),
    );
  }
}
