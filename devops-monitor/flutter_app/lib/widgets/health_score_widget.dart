import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

class HealthScoreWidget extends StatelessWidget {
  final double score;

  const HealthScoreWidget({super.key, required this.score});

  Color get _color {
    if (score >= 80) return AppTheme.green;
    if (score >= 60) return AppTheme.amber;
    if (score >= 40) return const Color(0xFFFF8C42);
    return AppTheme.red;
  }

  String get _label {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'At Risk';
    return 'Critical';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: score),
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeOut,
          builder: (_, v, __) => Text(
            v.toStringAsFixed(0),
            style: TextStyle(
              color: _color,
              fontSize: 52,
              fontWeight: FontWeight.bold,
              height: 1.0,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          decoration: BoxDecoration(
            color: _color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            _label,
            style: TextStyle(
              color: _color,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'System health score',
          style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
        ),
      ],
    );
  }
}
