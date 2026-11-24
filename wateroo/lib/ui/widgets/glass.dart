import 'package:material_ui/material_ui.dart';

import '../theme.dart';

/// The Wateroo glass. The water level animates to [fill] (0 = empty,
/// 1 = full); above 1 the glass simply stays full. [sparkle] adds the
/// "glass full" sparkles.
class GlassView extends StatelessWidget {
  const GlassView({
    super.key,
    required this.fill,
    this.size = 190,
    this.outline = Colors.white,
    this.water = WColors.splash,
    this.sparkle = false,
    this.semanticLabel,
  });

  final double fill;
  final double size;
  final Color outline;
  final Color water;
  final bool sparkle;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: semanticLabel ?? 'Glass ${(fill.clamp(0, 1) * 100).round()}% full',
      // Own layer: the fill animation repaints only the glass, not the screen.
      child: RepaintBoundary(
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: fill.clamp(0.0, 1.0)),
          duration: const Duration(milliseconds: 650),
          curve: Curves.easeOutCubic,
          builder: (context, value, _) => CustomPaint(
            size: Size.square(size),
            painter: _GlassPainter(
              fill: value,
              outline: outline,
              water: water,
              sparkle: sparkle,
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassPainter extends CustomPainter {
  _GlassPainter({
    required this.fill,
    required this.outline,
    required this.water,
    required this.sparkle,
  });

  final double fill;
  final Color outline;
  final Color water;
  final bool sparkle;

  // Geometry in a 100 x 100 box, same as the app icon.
  static Path _glass() => Path()
    ..moveTo(30, 22)
    ..lineTo(70, 22)
    ..lineTo(64, 80)
    ..quadraticBezierTo(63.6, 84, 59.6, 84)
    ..lineTo(40.4, 84)
    ..quadraticBezierTo(36.4, 84, 36, 80)
    ..close();

  static Path _water(double p) {
    final y = 80 - p * 52;
    final xl = 30 + 6 * (y - 22) / 58 + 0.5;
    final xr = 70 - 6 * (y - 22) / 58 - 0.5;
    final m1 = (xl + 50) / 2;
    final m2 = (50 + xr) / 2;
    return Path()
      ..moveTo(xl, y)
      ..quadraticBezierTo(m1, y - 4, 50, y)
      ..quadraticBezierTo(m2, y + 4, xr, y)
      ..lineTo(64, 80)
      ..quadraticBezierTo(63.6, 84, 59.6, 84)
      ..lineTo(40.4, 84)
      ..quadraticBezierTo(36.4, 84, 36, 80)
      ..close();
  }

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 100, size.height / 100);

    if (fill > 0.005) {
      canvas.drawPath(_water(fill), Paint()..color = water);
    }

    canvas.drawPath(
      _glass(),
      Paint()
        ..color = outline
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.2
        ..strokeJoin = StrokeJoin.round,
    );

    final marks = Paint()
      ..color = outline.withValues(alpha: 0.7)
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(57, 31), const Offset(64, 31), marks);
    canvas.drawLine(const Offset(58, 40), const Offset(64, 40), marks);

    if (sparkle) {
      final s = Paint()
        ..color = WColors.sparkle
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round;
      for (final (x, y, r) in const [
        (20.0, 18.0, 4.0),
        (80.0, 13.0, 3.0),
        (84.0, 33.0, 3.0),
      ]) {
        canvas.drawLine(Offset(x, y - r), Offset(x, y + r), s);
        canvas.drawLine(Offset(x - r, y), Offset(x + r, y), s);
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_GlassPainter old) =>
      old.fill != fill ||
      old.outline != outline ||
      old.water != water ||
      old.sparkle != sparkle;
}
