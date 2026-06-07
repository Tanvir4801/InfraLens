import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../models/alert_model.dart';
import '../providers/alerts_provider.dart';
import '../services/api_service.dart';
import '../widgets/alert_card.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final _api         = ApiService();
  String _filter     = 'all';
  final Map<String, String> _rcaCache = {};
  bool _isAutoTriggered = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _autoTriggerRca();
    });
  }

  void _autoTriggerRca() {
    if (_isAutoTriggered) return;
    final provider = context.read<AlertsProvider>();
    final criticals = provider.allAlerts.where((a) => a.isCritical).toList();
    if (criticals.isNotEmpty) {
      _isAutoTriggered = true;
      _generateRca(criticals.first);
    }
  }

  Future<void> _generateRca(AlertModel alert) async {
    if (_rcaCache.containsKey(alert.id)) return;
    try {
      final report = await _api.postIncidentReport(alert);
      if (mounted) {
        setState(() {
          _rcaCache[alert.id] = report.reportText;
        });
      }
    } catch (_) {}
  }

  Future<void> _generateReport(BuildContext context, AlertModel alert) async {
    final report = await _api.postIncidentReport(alert);
    if (!context.mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.65,
        maxChildSize: 0.92,
        minChildSize: 0.4,
        builder: (_, scrollCtrl) => Column(
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'AI Incident Report',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, color: AppTheme.textMuted, size: 20),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: report.reportText));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Copied to clipboard'),
                          backgroundColor: AppTheme.bgCardAlt,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    tooltip: 'Copy',
                  ),
                ],
              ),
            ),
            const Divider(color: AppTheme.border, height: 1),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollCtrl,
                padding: const EdgeInsets.all(16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.bgPrimary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SelectableText(
                    report.reportText,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      color: AppTheme.textPrimary,
                      fontSize: 13,
                      height: 1.6,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AlertsProvider>(
      builder: (_, provider, __) {
        final alerts = provider.filteredAlerts(_filter);
        return Scaffold(
          backgroundColor: AppTheme.bgPrimary,
          appBar: AppBar(
            title: Row(
              children: [
                const Text('Alerts'),
                if (provider.activeCount > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.red.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${provider.activeCount}',
                      style: const TextStyle(color: AppTheme.red, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: provider.fetch,
              ),
            ],
          ),
          body: Column(
            children: [
              // Filter chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    _FilterChip(label: 'All',      value: 'all',      current: _filter, count: provider.activeCount,      onTap: (v) => setState(() => _filter = v)),
                    const SizedBox(width: 8),
                    _FilterChip(label: 'Critical', value: 'critical', current: _filter, count: provider.criticalCount,    onTap: (v) => setState(() => _filter = v)),
                    const SizedBox(width: 8),
                    _FilterChip(label: 'Warning',  value: 'warning',  current: _filter, count: provider.warningCount,     onTap: (v) => setState(() => _filter = v)),
                  ],
                ),
              ),
              if (_rcaCache.isNotEmpty)
                _RcaCard(
                  report: _rcaCache.values.first,
                  onClose: () => setState(() => _rcaCache.clear()),
                ),
              Expanded(
                child: provider.isLoading && provider.allAlerts.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.green, strokeWidth: 2))
                    : alerts.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle_outline, color: AppTheme.green, size: 48),
                                SizedBox(height: 12),
                                Text('No alerts in this category', style: TextStyle(color: AppTheme.textMuted)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: alerts.length,
                            itemBuilder: (_, i) => AlertCard(
                              alert: alerts[i],
                              onAcknowledge: () => provider.acknowledge(alerts[i].id),
                              onGenerateReport: () => _generateReport(context, alerts[i]),
                            ),
                          ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _RcaCard extends StatelessWidget {
  final String report;
  final VoidCallback onClose;
  const _RcaCard({required this.report, required this.onClose});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.blue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.blue.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppTheme.blue, size: 20),
              const SizedBox(width: 8),
              const Text('AI Root Cause Analysis',
                  style: TextStyle(color: AppTheme.blueLight, fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: AppTheme.textMuted),
                onPressed: onClose,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            report,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 10),
          const Text(
            'Generated by Gemini',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final String current;
  final int count;
  final void Function(String) onTap;

  const _FilterChip({
    required this.label,
    required this.value,
    required this.current,
    required this.count,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = value == current;
    return GestureDetector(
      onTap: () => onTap(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppTheme.green.withValues(alpha: 0.12) : AppTheme.bgCardAlt,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? AppTheme.green.withValues(alpha: 0.4) : AppTheme.border),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                color: active ? AppTheme.green : AppTheme.textMuted,
                fontSize: 13,
                fontWeight: active ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.red.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(color: AppTheme.red, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
