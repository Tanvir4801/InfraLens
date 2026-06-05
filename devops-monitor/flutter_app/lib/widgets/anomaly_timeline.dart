import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

class AnomalyEvent {
  final DateTime timestamp;
  final String metric;
  final String severity;
  final String summary;

  const AnomalyEvent({
    required this.timestamp,
    required this.metric,
    required this.severity,
    required this.summary,
  });
}

class AnomalyTimeline extends StatelessWidget {
  final List<AnomalyEvent> events;

  const AnomalyTimeline({super.key, required this.events});

  static List<AnomalyEvent> generateFromHistory(List<double> history) {
    final events = <AnomalyEvent>[];
    final now = DateTime.now();
    for (int i = 0; i < history.length && events.length < 10; i++) {
      final v = history[i];
      if (v > 75) {
        events.add(AnomalyEvent(
          timestamp: now.subtract(Duration(minutes: (history.length - i) * 3)),
          metric: 'CPU',
          severity: v > 85 ? 'critical' : 'warning',
          summary: 'CPU spike to ${v.toStringAsFixed(1)}% detected',
        ));
      }
    }
    return events;
  }

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, color: AppTheme.green, size: 20),
            SizedBox(width: 8),
            Text('No anomalies detected', style: TextStyle(color: AppTheme.textMuted)),
          ],
        ),
      );
    }
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: events.length,
      itemBuilder: (_, i) {
        final e = events[i];
        final isCritical = e.severity == 'critical';
        final color = isCritical ? AppTheme.red : AppTheme.amber;
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 32,
                child: Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    ),
                    if (i < events.length - 1)
                      Expanded(
                        child: Container(width: 1.5, color: AppTheme.border),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16, left: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            _formatTime(e.timestamp),
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              e.metric,
                              style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        e.summary,
                        style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
