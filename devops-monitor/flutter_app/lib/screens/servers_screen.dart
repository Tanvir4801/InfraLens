import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../providers/servers_provider.dart';
import '../models/server_info.dart';
import '../widgets/server_card.dart';
import '../widgets/shimmer_loader.dart';
import 'server_detail_screen.dart';

class ServersScreen extends StatefulWidget {
  const ServersScreen({super.key});
  @override
  State<ServersScreen> createState() => _ServersScreenState();
}

class _ServersScreenState extends State<ServersScreen> {
  final _search = TextEditingController();
  String _sort  = 'cpu_desc';
  bool _spinning = false;
  String? _statusFilter;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<ServerInfo> _filtered(List<ServerInfo> servers) {
    var list = servers.where((s) =>
        s.name.toLowerCase().contains(_search.text.toLowerCase())).toList();
    if (_statusFilter != null) {
      list = list.where((s) => s.status.toLowerCase() == _statusFilter!.toLowerCase()).toList();
    }
    switch (_sort) {
      case 'cpu_asc':  list.sort((a, b) => a.cpu.compareTo(b.cpu)); break;
      case 'cpu_desc': list.sort((a, b) => b.cpu.compareTo(a.cpu)); break;
      case 'status':   list.sort((a, b) => a.status.compareTo(b.status)); break;
    }
    return list;
  }

  Future<void> _refresh(ServersProvider p) async {
    setState(() => _spinning = true);
    await p.fetch();
    if (mounted) setState(() => _spinning = false);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ServersProvider>(
      builder: (_, provider, __) {
        final servers = _filtered(provider.servers);
        return Scaffold(
          backgroundColor: AppTheme.bgPrimary,
          appBar: AppBar(
            title: const Text('Servers'),
            actions: [
              IconButton(
                icon: AnimatedRotation(
                  turns: _spinning ? 1 : 0,
                  duration: const Duration(milliseconds: 600),
                  child: const Icon(Icons.refresh),
                ),
                onPressed: () => _refresh(provider),
              ),
            ],
          ),
      body: RefreshIndicator(
        onRefresh: () => provider.fetch(),
        color: AppTheme.green,
        backgroundColor: AppTheme.bgCard,
        child: Column(
          children: [
            // Cluster summary card
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _SummaryStat(
                      label: 'Total',
                      value: provider.servers.length,
                      onTap: () => setState(() => _statusFilter = null),
                      active: _statusFilter == null,
                    ),
                    _SummaryStat(
                      label: 'Healthy',
                      value: provider.servers.where((s) => s.status.toLowerCase() == 'healthy').length,
                      color: AppTheme.green,
                      onTap: () => setState(() => _statusFilter = 'healthy'),
                      active: _statusFilter == 'healthy',
                    ),
                    _SummaryStat(
                      label: 'Warning',
                      value: provider.servers.where((s) => s.status.toLowerCase() == 'warning').length,
                      color: AppTheme.amber,
                      onTap: () => setState(() => _statusFilter = 'warning'),
                      active: _statusFilter == 'warning',
                    ),
                    _SummaryStat(
                      label: 'Down',
                      value: provider.servers.where((s) => s.status.toLowerCase() == 'down').length,
                      color: AppTheme.red,
                      onTap: () => setState(() => _statusFilter = 'down'),
                      active: _statusFilter == 'down',
                    ),
                  ],
                ),
              ),
            ),
            // Search
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Search servers…',
                  prefixIcon: Icon(Icons.search, color: AppTheme.textHint, size: 18),
                  isDense: true,
                ),
              ),
            ),
            // Sort row
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _SortButton(label: 'CPU ↓', value: 'cpu_desc', current: _sort, onTap: (v) => setState(() => _sort = v)),
                  const SizedBox(width: 8),
                  _SortButton(label: 'CPU ↑', value: 'cpu_asc',  current: _sort, onTap: (v) => setState(() => _sort = v)),
                  const SizedBox(width: 8),
                  _SortButton(label: 'Status', value: 'status',   current: _sort, onTap: (v) => setState(() => _sort = v)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: provider.isLoading && provider.servers.isEmpty
                  ? Column(children: List.generate(3, (_) => const ShimmerCard()))
                  : servers.isEmpty
                      ? ListView(
                          children: [
                            SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                            Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 80, height: 80,
                                    decoration: BoxDecoration(
                                      color: AppTheme.bgCard,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppTheme.border, width: 2),
                                    ),
                                    child: const Icon(Icons.inbox_outlined, color: AppTheme.textMuted, size: 40),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text('No Servers Found', style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 8),
                                  const Text('We couldn\'t find any servers matching your criteria.', 
                                    textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textMuted, fontSize: 14, height: 1.5)),
                                ],
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          itemCount: servers.length,
                          itemBuilder: (_, i) => ServerCard(
                            server: servers[i],
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ServerDetailScreen(server: servers[i]),
                              ),
                            ),
                          ),
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

class _SummaryStat extends StatelessWidget {
  final String label;
  final int value;
  final Color? color;
  final VoidCallback onTap;
  final bool active;

  const _SummaryStat({
    required this.label,
    required this.value,
    this.color,
    required this.onTap,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(
              color: color ?? AppTheme.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              decoration: active ? TextDecoration.underline : null,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 12,
              fontWeight: active ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

class _SortButton extends StatelessWidget {
  final String label;
  final String value;
  final String current;
  final void Function(String) onTap;

  const _SortButton({
    required this.label,
    required this.value,
    required this.current,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = value == current;
    return TextButton(
      onPressed: () => onTap(value),
      style: TextButton.styleFrom(
        foregroundColor: active ? AppTheme.green : AppTheme.textMuted,
        backgroundColor: active ? AppTheme.green.withValues(alpha: 0.1) : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: const Size(0, 32),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
          side: BorderSide(color: active ? AppTheme.green.withValues(alpha: 0.3) : AppTheme.border),
        ),
      ),
      child: Text(label, style: const TextStyle(fontSize: 13)),
    );
  }
}
