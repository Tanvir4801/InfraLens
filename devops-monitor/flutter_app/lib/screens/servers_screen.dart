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

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<ServerInfo> _filtered(List<ServerInfo> servers) {
    var list = servers.where((s) =>
        s.name.toLowerCase().contains(_search.text.toLowerCase())).toList();
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
          body: Column(
            children: [
              // Search
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
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
                        ? const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.dns_outlined, color: AppTheme.textHint, size: 48),
                                SizedBox(height: 12),
                                Text('No servers found', style: TextStyle(color: AppTheme.textMuted)),
                              ],
                            ),
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
        );
      },
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
        backgroundColor: active ? AppTheme.green.withOpacity(0.1) : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: const Size(0, 32),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
          side: BorderSide(color: active ? AppTheme.green.withOpacity(0.3) : AppTheme.border),
        ),
      ),
      child: Text(label, style: const TextStyle(fontSize: 13)),
    );
  }
}
