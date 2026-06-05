import 'package:flutter/material.dart';
import '../constants/app_theme.dart';
import '../services/local_storage_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _urlCtrl;
  late int    _refreshInterval;
  late bool   _pinEnabled;
  late bool   _notifications;
  late bool   _mockData;
  String?     _pin;

  @override
  void initState() {
    super.initState();
    _urlCtrl          = TextEditingController(text: LocalStorageService.loadBackendUrl() ?? 'http://localhost:8000');
    _refreshInterval  = LocalStorageService.loadRefreshInterval();
    _pinEnabled       = LocalStorageService.loadPinEnabled();
    _notifications    = LocalStorageService.loadNotificationsEnabled();
    _mockData         = LocalStorageService.loadMockDataEnabled();
    _pin              = LocalStorageService.loadPin();
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _showPinDialog() async {
    final ctrl = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppTheme.border),
        ),
        title: const Text('Set PIN', style: TextStyle(color: AppTheme.textPrimary)),
        content: TextField(
          controller: ctrl,
          obscureText: true,
          maxLength: 4,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: AppTheme.textPrimary, letterSpacing: 8, fontSize: 24),
          decoration: const InputDecoration(
            hintText: '0000',
            counterText: '',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () {
              if (ctrl.text.length == 4) {
                setState(() => _pin = ctrl.text);
                LocalStorageService.savePin(ctrl.text);
                Navigator.pop(ctx);
              }
            },
            child: const Text('Save', style: TextStyle(color: AppTheme.green)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          _Section('Connection'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Backend URL', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _urlCtrl,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                  decoration: const InputDecoration(isDense: true),
                  onChanged: (v) => LocalStorageService.saveBackendUrl(v),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Text('Refresh interval', style: TextStyle(color: AppTheme.textPrimary, fontSize: 15)),
                const Spacer(),
                DropdownButton<int>(
                  value: _refreshInterval,
                  dropdownColor: AppTheme.bgCard,
                  style: const TextStyle(color: AppTheme.textPrimary),
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 3,  child: Text('3s')),
                    DropdownMenuItem(value: 5,  child: Text('5s')),
                    DropdownMenuItem(value: 10, child: Text('10s')),
                  ],
                  onChanged: (v) {
                    if (v != null) {
                      setState(() => _refreshInterval = v);
                      LocalStorageService.saveRefreshInterval(v);
                    }
                  },
                ),
              ],
            ),
          ),

          const Divider(color: AppTheme.border),
          _Section('Data'),
          SwitchListTile(
            title: const Text('Use mock data', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: const Text('Show realistic demo data without a backend', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            value: _mockData,
            activeColor: AppTheme.green,
            onChanged: (v) {
              setState(() => _mockData = v);
              LocalStorageService.saveMockDataEnabled(v);
            },
          ),

          const Divider(color: AppTheme.border),
          _Section('Security'),
          SwitchListTile(
            title: const Text('Enable PIN lock', style: TextStyle(color: AppTheme.textPrimary)),
            value: _pinEnabled,
            activeColor: AppTheme.green,
            onChanged: (v) {
              setState(() => _pinEnabled = v);
              LocalStorageService.savePinEnabled(v);
              if (v && _pin == null) _showPinDialog();
            },
          ),
          if (_pinEnabled)
            ListTile(
              title: const Text('Change PIN', style: TextStyle(color: AppTheme.textPrimary)),
              trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted),
              onTap: _showPinDialog,
            ),

          const Divider(color: AppTheme.border),
          _Section('Notifications'),
          SwitchListTile(
            title: const Text('Alert notifications', style: TextStyle(color: AppTheme.textPrimary)),
            subtitle: const Text('In-app banners for new critical alerts', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            value: _notifications,
            activeColor: AppTheme.green,
            onChanged: (v) {
              setState(() => _notifications = v);
              LocalStorageService.saveNotificationsEnabled(v);
            },
          ),

          const SizedBox(height: 40),
          const Center(
            child: Text(
              'InfraLens v1.0.0 · Built with Flutter',
              style: TextStyle(color: AppTheme.textHint, fontSize: 12),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  const _Section(this.title);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
    child: Text(
      title.toUpperCase(),
      style: const TextStyle(
        color: AppTheme.textHint,
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.2,
      ),
    ),
  );
}
