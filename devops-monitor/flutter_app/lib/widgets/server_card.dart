import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';
import '../models/server_info.dart';
import 'pulse_dot.dart';

class ServerCard extends StatelessWidget {
  final ServerInfo server;
  final VoidCallback onTap;

  const ServerCard({super.key, required this.server, required this.onTap});

  Color _dotColor(String status) {
    switch (status.toLowerCase()) {
      case 'down':
        return AppTheme.red;
      case 'warning':
        return AppTheme.amber;
      default:
        return AppTheme.green;
    }
  }

  Color _barColor(double cpu) {
    if (cpu >= 80) return AppTheme.red;
    if (cpu >= 60) return AppTheme.amber;
    return AppTheme.green;
  }

  void _showActions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _ServerActionsSheet(server: server),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cpuColor = _barColor(server.cpu);
    return GestureDetector(
      onTap: onTap,
      onLongPress: () => _showActions(context),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            PulseDot(healthy: server.isHealthy, color: _dotColor(server.status)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    server.name,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${server.role} · ${server.ip}',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                SizedBox(
                  width: 80,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: server.cpu / 100,
                      backgroundColor: AppTheme.border,
                      valueColor: AlwaysStoppedAnimation<Color>(cpuColor),
                      minHeight: 6,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${server.cpu.toStringAsFixed(1)}%',
                  style: TextStyle(
                    color: cpuColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}

class _ServerActionsSheet extends StatefulWidget {
  final ServerInfo server;
  const _ServerActionsSheet({required this.server});

  @override
  State<_ServerActionsSheet> createState() => _ServerActionsSheetState();
}

class _ServerActionsSheetState extends State<_ServerActionsSheet> {
  bool _loading = false;

  Future<void> _restart() async {
    setState(() => _loading = true);
    try {
      // In a real app, this would be server.id or server.name
      // Assuming T001 added POST /api/containers/{id}/restart
      final r = await http.post(
        Uri.parse('${AppConstants.backendBaseUrl}/api/containers/${widget.server.name}/restart'),
      ).timeout(const Duration(seconds: 10));
      
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(r.statusCode == 200 ? 'Restart initiated for ${widget.server.name}' : 'Failed to restart: ${r.statusCode}'),
          backgroundColor: r.statusCode == 200 ? AppTheme.green : AppTheme.red,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.red),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _viewLogs() async {
    Navigator.pop(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (_, scrollController) => _LogsView(
          serverName: widget.server.name,
          scrollController: scrollController,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Actions — ${widget.server.name}',
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(color: AppTheme.green),
            )
          else ...[
            ListTile(
              leading: const Icon(Icons.refresh, color: AppTheme.amber),
              title: const Text('Restart Container', style: TextStyle(color: AppTheme.textPrimary)),
              onTap: _restart,
            ),
            ListTile(
              leading: const Icon(Icons.article_outlined, color: AppTheme.blue),
              title: const Text('View Logs', style: TextStyle(color: AppTheme.textPrimary)),
              onTap: _viewLogs,
            ),
            ListTile(
              leading: const Icon(Icons.close, color: AppTheme.textMuted),
              title: const Text('Cancel', style: TextStyle(color: AppTheme.textPrimary)),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ],
      ),
    );
  }
}

class _LogsView extends StatefulWidget {
  final String serverName;
  final ScrollController scrollController;
  const _LogsView({required this.serverName, required this.scrollController});

  @override
  State<_LogsView> createState() => _LogsViewState();
}

class _LogsViewState extends State<_LogsView> {
  List<String> _logs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    try {
      final r = await http.get(
        Uri.parse('${AppConstants.backendBaseUrl}/api/containers/${widget.serverName}/logs'),
      ).timeout(const Duration(seconds: 10));
      
      if (r.statusCode == 200) {
        final data = jsonDecode(r.body);
        setState(() {
          _logs = List<String>.from(data is List ? data : (data['logs'] ?? []));
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load logs: ${r.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'Logs — ${widget.serverName}',
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        const Divider(color: AppTheme.border),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.green))
              : _error != null
                  ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.red)))
                  : ListView.builder(
                      controller: widget.scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _logs.length,
                      itemBuilder: (_, i) => Text(
                        _logs[i],
                        style: const TextStyle(color: AppTheme.textPrimary, fontFamily: 'monospace', fontSize: 12),
                      ),
                    ),
        ),
      ],
    );
  }
}
