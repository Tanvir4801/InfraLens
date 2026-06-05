import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

class AlertsController extends ChangeNotifier {
  AlertsController({
    this.alertsUrl = 'http://10.194.193.201:8000/api/alerts',
    this.refreshInterval = const Duration(seconds: 30),
  });

  final String alertsUrl;
  final Duration refreshInterval;

  Timer? _timer;
  bool _loading = false;
  bool _disposed = false;
  String? _errorMessage;
  String? _pendingCriticalAlertName;
  List<AlertItem> _alerts = [];
  Set<String> _knownCriticalAlertKeys = <String>{};

  bool get loading => _loading;
  String? get errorMessage => _errorMessage;
  String? get pendingCriticalAlertName => _pendingCriticalAlertName;
  List<AlertItem> get alerts => List.unmodifiable(_alerts);

  void start() {
    if (_disposed || _timer != null) {
      return;
    }

    refresh();
    _timer = Timer.periodic(refreshInterval, (_) => refresh());
  }

  Future<void> refresh() async {
    if (_disposed || _loading) {
      return;
    }

    _loading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await http.get(Uri.parse(alertsUrl));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('Failed to fetch alerts (${response.statusCode})');
      }

      final decoded = jsonDecode(response.body);
      final items = _normalizeAlerts(decoded);
      _detectNewCriticalAlert(items);
      _alerts = items;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void consumePendingCriticalAlert() {
    _pendingCriticalAlertName = null;
    notifyListeners();
  }

  void _detectNewCriticalAlert(List<AlertItem> incomingAlerts) {
    final currentCriticalKeys = <String>{};
    AlertItem? newestCriticalAlert;

    for (final alert in incomingAlerts) {
      if (alert.isCritical) {
        currentCriticalKeys.add(alert.key);
        if (newestCriticalAlert == null || alert.startsAt.isAfter(newestCriticalAlert.startsAt)) {
          newestCriticalAlert = alert;
        }
      }
    }

    final hasNewCriticalAlert = currentCriticalKeys.difference(_knownCriticalAlertKeys).isNotEmpty;
    _knownCriticalAlertKeys = currentCriticalKeys;

    if (hasNewCriticalAlert && newestCriticalAlert != null) {
      _pendingCriticalAlertName = newestCriticalAlert.name;
    }
  }

  List<AlertItem> _normalizeAlerts(dynamic decoded) {
    final rawAlerts = <dynamic>[];

    if (decoded is List) {
      rawAlerts.addAll(decoded);
    } else if (decoded is Map<String, dynamic>) {
      if (decoded['data'] is List) {
        rawAlerts.addAll(decoded['data'] as List);
      } else if (decoded['alerts'] is List) {
        rawAlerts.addAll(decoded['alerts'] as List);
      }
    }

    return rawAlerts
        .whereType<Map>()
        .map((item) => AlertItem.fromJson(item.cast<String, dynamic>()))
        .toList()
      ..sort((left, right) => right.startsAt.compareTo(left.startsAt));
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}

class AlertItem {
  AlertItem({
    required this.name,
    required this.severity,
    required this.description,
    required this.startsAt,
  });

  final String name;
  final String severity;
  final String description;
  final DateTime startsAt;

  bool get isCritical => severity.toLowerCase() == 'critical';
  String get key => '$name|$severity|${startsAt.toIso8601String()}';

  factory AlertItem.fromJson(Map<String, dynamic> json) {
    final labels = (json['labels'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    final annotations = (json['annotations'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};

    return AlertItem(
      name: (labels['alertname'] ?? labels['name'] ?? 'Unknown alert').toString(),
      severity: (labels['severity'] ?? 'warning').toString(),
      description: (annotations['description'] ?? annotations['summary'] ?? 'No description available').toString(),
      startsAt: DateTime.tryParse((json['startsAt'] ?? DateTime.now().toIso8601String()).toString()) ?? DateTime.now(),
    );
  }
}

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AlertsController()..start(),
      child: const _AlertsView(),
    );
  }
}

class _AlertsView extends StatelessWidget {
  const _AlertsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF050816), Color(0xFF0B1220), Color(0xFF111827)],
          ),
        ),
        child: SafeArea(
          child: Consumer<AlertsController>(
            builder: (context, controller, _) {
              final pendingCritical = controller.pendingCriticalAlertName;
              if (pendingCritical != null) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!context.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Critical alert detected: $pendingCritical'),
                      backgroundColor: const Color(0xFF991B1B),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  context.read<AlertsController>().consumePendingCriticalAlert();
                });
              }

              return RefreshIndicator(
                onRefresh: controller.refresh,
                color: const Color(0xFF22C55E),
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    const _AlertsHeader(),
                    const SizedBox(height: 20),
                    if (controller.alerts.isNotEmpty) ...[
                      IncidentReportCard(alert: controller.alerts.first),
                      const SizedBox(height: 14),
                    ],
                    if (controller.loading && controller.alerts.isEmpty)
                      const _LoadingState()
                    else if (controller.errorMessage != null && controller.alerts.isEmpty)
                      _ErrorState(message: controller.errorMessage!, onRetry: controller.refresh)
                    else if (controller.alerts.isEmpty)
                      const _EmptyState()
                    else
                      ...controller.alerts.map((alert) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _AlertCard(alert: alert),
                          )),
                    if (controller.alerts.isNotEmpty) const SizedBox(height: 8),
                    if (controller.loading && controller.alerts.isNotEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _AlertsHeader extends StatelessWidget {
  const _AlertsHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Alerts',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
        ),
        SizedBox(height: 6),
        Text(
          'Live status from Alertmanager, refreshed every 30 seconds.',
          style: TextStyle(color: Color(0xFF94A3B8)),
        ),
      ],
    );
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.alert});

  final AlertItem alert;

  Color get _severityColor {
    if (alert.isCritical) {
      return const Color(0xFFEF4444);
    }
    return const Color(0xFFF59E0B);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF1F2937)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Card(
        color: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      alert.name,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ),
                  Chip(
                    label: Text(
                      alert.severity.toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                    backgroundColor: _severityColor,
                    side: BorderSide.none,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                alert.description,
                style: const TextStyle(color: Color(0xFFCBD5E1), height: 1.35),
              ),
              const SizedBox(height: 12),
              Text(
                'fired ${_formatElapsed(alert.startsAt)}',
                style: const TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatElapsed(DateTime startsAt) {
    final duration = DateTime.now().difference(startsAt.toLocal());
    if (duration.inMinutes < 1) {
      return 'just now';
    }
    if (duration.inHours < 1) {
      return '${duration.inMinutes} mins';
    }
    if (duration.inDays < 1) {
      final hours = duration.inHours;
      final minutes = duration.inMinutes.remainder(60);
      return minutes == 0 ? '$hours hrs' : '$hours hrs $minutes mins';
    }
    return '${duration.inDays}d ${duration.inHours.remainder(24)}h';
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: const Column(
        children: [
          Icon(Icons.check_circle_rounded, color: Color(0xFF22C55E), size: 72),
          SizedBox(height: 14),
          Text(
            'All clear',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: 6),
          Text(
            'No active alerts at the moment.',
            style: TextStyle(color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(top: 48),
      child: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF7F1D1D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Unable to load alerts',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(color: Color(0xFFCBD5E1)),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: () => onRetry(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class IncidentReportCard extends StatefulWidget {
  const IncidentReportCard({
    super.key,
    required this.alert,
    this.incidentReportUrl = 'http://10.194.193.201:8000/api/incident-report',
  });

  final AlertItem alert;
  final String incidentReportUrl;

  @override
  State<IncidentReportCard> createState() => _IncidentReportCardState();
}

class _IncidentReportCardState extends State<IncidentReportCard> {
  bool _loading = false;
  String? _errorMessage;
  String? _report;

  Future<void> _generateReport() async {
    if (_loading) {
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final response = await http.post(
        Uri.parse(widget.incidentReportUrl),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'alert_data': {
            'name': widget.alert.name,
            'severity': widget.alert.severity,
            'description': widget.alert.description,
            'fired_at': widget.alert.startsAt.toUtc().toIso8601String(),
          },
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('Failed to generate report (${response.statusCode})');
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _report = response.body.trim();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF1F2937)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Incident Report',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.alert.name,
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(
                    widget.alert.severity.toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  backgroundColor: widget.alert.isCritical ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
                  side: BorderSide.none,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              widget.alert.description,
              style: const TextStyle(color: Color(0xFFCBD5E1), height: 1.35),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _loading ? null : _generateReport,
                icon: _loading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.auto_awesome_rounded),
                label: Text(_loading ? 'Generating AI Report...' : 'Generate AI Report'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                style: const TextStyle(color: Color(0xFFFCA5A5)),
              ),
            ],
            if (_report != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF050816),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: SelectableText(
                  _report!,
                  style: const TextStyle(
                    color: Color(0xFFE2E8F0),
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
