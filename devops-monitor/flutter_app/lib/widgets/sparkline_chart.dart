import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

class SparklineChart extends StatelessWidget {
  final List<double> data;
  final double height;
  final Color? lineColor;

  const SparklineChart({
    super.key,
    required this.data,
    this.height = 80,
    this.lineColor,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return SizedBox(height: height);
    }
    final color = lineColor ?? AppTheme.green;
    final spots = List.generate(
      data.length,
      (i) => FlSpot(i.toDouble(), data[i].clamp(0.0, 100.0)),
    );
    return SizedBox(
      height: height,
      child: LineChart(
        LineChartData(
          gridData: const FlGridData(show: false),
          titlesData: const FlTitlesData(show: false),
          borderData: FlBorderData(show: false),
          lineTouchData: const LineTouchData(enabled: false),
          minY: 0,
          maxY: 100,
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              color: color,
              barWidth: 2,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                color: color.withOpacity(0.12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
