import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

/// Live network speed card with dual sparkline (IN / OUT).
class NetworkSpeedCard extends StatelessWidget {
  final List<double> inHistory;   // KB/s readings (newest last)
  final List<double> outHistory;
  final double currentIn;
  final double currentOut;

  const NetworkSpeedCard({
    super.key,
    required this.inHistory,
    required this.outHistory,
    required this.currentIn,
    required this.currentOut,
  });

  String _fmt(double kbps) {
    if (kbps >= 1024) return '${(kbps / 1024).toStringAsFixed(1)} MB/s';
    return '${kbps.toStringAsFixed(1)} KB/s';
  }

  double _peak(List<double> list) =>
      list.isEmpty ? 0.0 : list.reduce((a, b) => a > b ? a : b);

  double _avg(List<double> list) =>
      list.isEmpty ? 0.0 : list.reduce((a, b) => a + b) / list.length;

  Widget _trendArrow(List<double> list, Color color) {
    if (list.length < 2) return const SizedBox(width: 14);
    final delta = list.last - list[list.length - 2];
    final icon = delta > 0.5
        ? Icons.arrow_upward
        : delta < -0.5
            ? Icons.arrow_downward
            : Icons.remove;
    return Icon(icon, color: color, size: 13);
  }

  @override
  Widget build(BuildContext context) {
    final maxY = [_peak(inHistory), _peak(outHistory), 10.0]
        .reduce((a, b) => a > b ? a : b) * 1.2;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header row ──────────────────────────────────────────────
          Row(
            children: [
              const Icon(Icons.network_check_rounded, color: AppTheme.blue, size: 16),
              const SizedBox(width: 6),
              const Text(
                'Network Speed — Live',
                style: TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              // Live pulse indicator
              _LiveDot(),
            ],
          ),
          const SizedBox(height: 12),

          // ── IN / OUT big numbers ────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _SpeedTile(
                  label: '↓ DOWNLOAD',
                  value: _fmt(currentIn),
                  color: AppTheme.green,
                  trend: _trendArrow(inHistory, AppTheme.green),
                  sub: 'Avg ${_fmt(_avg(inHistory))}  Peak ${_fmt(_peak(inHistory))}',
                ),
              ),
              Container(width: 1, height: 54, color: AppTheme.border, margin: const EdgeInsets.symmetric(horizontal: 12)),
              Expanded(
                child: _SpeedTile(
                  label: '↑ UPLOAD',
                  value: _fmt(currentOut),
                  color: AppTheme.blue,
                  trend: _trendArrow(outHistory, AppTheme.blue),
                  sub: 'Avg ${_fmt(_avg(outHistory))}  Peak ${_fmt(_peak(outHistory))}',
                ),
              ),
            ],
          ),

          // ── Dual sparkline ──────────────────────────────────────────
          if (inHistory.length >= 2 || outHistory.length >= 2) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 60,
              child: ClipRect(
                child: LineChart(
                  LineChartData(
                    minX: 0,
                    maxX: (inHistory.length - 1).toDouble().clamp(1.0, double.infinity),
                    minY: 0,
                    maxY: maxY,
                    gridData:  const FlGridData(show: false),
                    titlesData: const FlTitlesData(show: false),
                    borderData: FlBorderData(show: false),
                    lineTouchData: LineTouchData(
                      enabled: true,
                      touchTooltipData: LineTouchTooltipData(
                        getTooltipColor: (_) => AppTheme.bgCard,
                        getTooltipItems: (spots) => spots.map((s) {
                          final isIn = spots.indexOf(s) == 0;
                          return LineTooltipItem(
                            '${isIn ? '↓' : '↑'} ${_fmt(s.y)}',
                            TextStyle(
                              color: isIn ? AppTheme.green : AppTheme.blue,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    lineBarsData: [
                      _line(inHistory, AppTheme.green),
                      _line(outHistory, AppTheme.blue),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Legend
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _Legend(color: AppTheme.green, label: 'Download'),
                const SizedBox(width: 16),
                _Legend(color: AppTheme.blue,  label: 'Upload'),
              ],
            ),
          ],
        ],
      ),
    );
  }

  LineChartBarData _line(List<double> data, Color color) {
    final spots = data.asMap().entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.clamp(0.0, double.infinity)))
        .toList();
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      color: color,
      barWidth: 1.8,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(
        show: true,
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [color.withValues(alpha: 0.25), color.withValues(alpha: 0.0)],
        ),
      ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _SpeedTile extends StatelessWidget {
  final String label;
  final String value;
  final Color  color;
  final Widget trend;
  final String sub;

  const _SpeedTile({
    required this.label,
    required this.value,
    required this.color,
    required this.trend,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(color: AppTheme.textHint, fontSize: 9, letterSpacing: 0.8)),
      const SizedBox(height: 4),
      Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 400),
            child: Text(
              value,
              key: ValueKey(value),
              style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 4),
          trend,
        ],
      ),
      const SizedBox(height: 2),
      Text(sub, style: const TextStyle(color: AppTheme.textHint, fontSize: 9)),
    ],
  );
}

class _Legend extends StatelessWidget {
  final Color  color;
  final String label;
  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(width: 16, height: 2, color: color),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(color: AppTheme.textHint, fontSize: 10)),
    ],
  );
}

/// Pulsing green dot to indicate live data.
class _LiveDot extends StatefulWidget {
  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.4, end: 1.0)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _anim,
    builder: (_, __) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6, height: 6,
          decoration: BoxDecoration(
            color: AppTheme.green.withValues(alpha: _anim.value),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          'LIVE',
          style: TextStyle(
            color: AppTheme.green.withValues(alpha: _anim.value),
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
          ),
        ),
      ],
    ),
  );
}
