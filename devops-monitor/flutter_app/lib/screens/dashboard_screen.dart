import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../providers/metrics_provider.dart';
import '../providers/alerts_provider.dart';
import '../services/websocket_service.dart';
import '../widgets/circular_gauge.dart';
import '../widgets/sparkline_chart.dart';
import '../widgets/health_score_widget.dart';
import '../widgets/shimmer_loader.dart';
import '../widgets/network_speed_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  String _formatUptime(int seconds) {
    final d = seconds ~/ 86400;
    final h = (seconds % 86400) ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    if (d > 0) return '${d}d ${h}h ${m}m';
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<MetricsProvider, AlertsProvider>(
      builder: (_, metrics, alerts, __) {
        final snap        = metrics.snapshot;
        final wsState     = metrics.wsState;
        final criticals   = alerts.allAlerts.where((a) => a.isCritical).toList();
        final healthScore = metrics.healthScoreWithAlerts(alerts.criticalCount, alerts.warningCount);

        return Scaffold(
          backgroundColor: AppTheme.bgPrimary,
          appBar: AppBar(
            title: const Text('DevOps Monitoring'),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(20),
              child: Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '${snap?.containerCount ?? 3} containers running',
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                ),
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: _ConnectionPill(state: wsState),
              ),
            ],
          ),
          body: snap == null
              ? const ShimmerDashboard()
              : RefreshIndicator(
                  color: AppTheme.green,
                  backgroundColor: AppTheme.bgCard,
                  onRefresh: () async {
                    await context.read<MetricsProvider>().fetchNow();
                    if (context.mounted) {
                      await context.read<AlertsProvider>().fetch();
                    }
                  },
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      // Offline banner
                      if (wsState == WsState.disconnected)
                        _OfflineBanner(snap: snap),

                      // Critical alert banner
                      if (criticals.isNotEmpty)
                        _CriticalBanner(alert: criticals.first),

                      const SizedBox(height: 12),

                      // Health score card
                      GestureDetector(
                        onTap: () => showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: AppTheme.bgCard,
                            title: const Text('Health Score Calculation',
                                style: TextStyle(color: AppTheme.textPrimary)),
                            content: const Text(
                              'The health score is calculated based on:\n'
                              '• CPU usage (40%)\n'
                              '• RAM usage (30%)\n'
                              '• Disk usage (20%)\n'
                              '• Active Alerts (10%)',
                              style: TextStyle(color: AppTheme.textSecondary),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('OK', style: TextStyle(color: AppTheme.green)),
                              ),
                            ],
                          ),
                        ),
                        child: Container(
                          margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [AppTheme.bgCard, AppTheme.bgCardAlt],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppTheme.green.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(child: HealthScoreWidget(score: healthScore)),
                              Container(width: 1, height: 80, color: AppTheme.border),
                              Expanded(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _StatRow(label: 'CPU',  value: snap.cpuPercent,  color: AppTheme.getMetricColor(snap.cpuPercent)),
                                    const SizedBox(height: 6),
                                    _StatRow(label: 'RAM',  value: snap.ramPercent,  color: AppTheme.getMetricColor(snap.ramPercent)),
                                    const SizedBox(height: 6),
                                    _StatRow(label: 'Disk', value: snap.diskPercent, color: AppTheme.getMetricColor(snap.diskPercent)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // ── Live network speed card ──────────────────────
                      NetworkSpeedCard(
                        inHistory:  metrics.networkInHistory,
                        outHistory: metrics.networkOutHistory,
                        currentIn:  snap.networkInKbps  ?? 0.0,
                        currentOut: snap.networkOutKbps ?? 0.0,
                      ),

                      // ── Gauges ───────────────────────────────────────
                      _Card(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            CircularGauge(value: snap.cpuPercent,  label: 'CPU'),
                            CircularGauge(value: snap.ramPercent,  label: 'RAM'),
                            CircularGauge(value: snap.diskPercent, label: 'Disk'),
                          ],
                        ),
                      ),

                      // ── CPU sparkline ────────────────────────────────
                      if (metrics.rollingHistory.isNotEmpty)
                        _Card(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'CPU — last 20 readings',
                                style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                              ),
                              const SizedBox(height: 8),
                              SparklineChart(data: metrics.rollingHistory),
                            ],
                          ),
                        ),

                      // ── Uptime / Source ──────────────────────────────
                      _Card(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Uptime', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                Text(
                                  _formatUptime(snap.uptimeSeconds),
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                const Text('Source', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                Text(
                                  snap.source,
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        );
      },
    );
  }
}

// ── Connection pill ───────────────────────────────────────────────────────────

class _ConnectionPill extends StatelessWidget {
  final WsState state;
  const _ConnectionPill({required this.state});

  @override
  Widget build(BuildContext context) {
    final (color, text) = switch (state) {
      WsState.connected    => (AppTheme.green, 'Live'),
      WsState.connecting   => (AppTheme.amber, 'Connecting…'),
      WsState.disconnected => (AppTheme.red,   'Offline'),
    };
    return AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 5),
          Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// ── Offline / Critical banners ────────────────────────────────────────────────

class _OfflineBanner extends StatelessWidget {
  final dynamic snap;
  const _OfflineBanner({required this.snap});
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 300),
    margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: AppTheme.amber.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppTheme.amber.withValues(alpha: 0.3)),
    ),
    child: const Row(
      children: [
        Icon(Icons.wifi_off, color: AppTheme.amber, size: 16),
        SizedBox(width: 8),
        Text('Showing cached data · Reconnecting…', style: TextStyle(color: AppTheme.amber, fontSize: 13)),
      ],
    ),
  );
}

class _CriticalBanner extends StatelessWidget {
  final dynamic alert;
  const _CriticalBanner({required this.alert});
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 300),
    margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: AppTheme.red.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppTheme.red.withValues(alpha: 0.3)),
    ),
    child: Row(
      children: [
        const Icon(Icons.warning_amber, color: AppTheme.red, size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            alert.name ?? 'Critical alert active',
            style: const TextStyle(color: AppTheme.red, fontSize: 13, fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        TextButton(
          onPressed: () {},
          style: TextButton.styleFrom(
            foregroundColor: AppTheme.red,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            minimumSize: const Size(0, 30),
          ),
          child: const Text('View', style: TextStyle(fontSize: 12)),
        ),
      ],
    ),
  );
}

// ── Card container ────────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppTheme.bgCard,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppTheme.border),
    ),
    child: child,
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────

class _StatRow extends StatelessWidget {
  final String label;
  final double value;
  final Color  color;
  const _StatRow({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      SizedBox(
        width: 32,
        child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
      ),
      const SizedBox(width: 6),
      AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        child: Text(
          '${value.toStringAsFixed(1)}%',
          key: ValueKey('${label}_${value.toStringAsFixed(0)}'),
          style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    ],
  );
}
