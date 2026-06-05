import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'constants/app_theme.dart';
import 'providers/alerts_provider.dart';
import 'screens/dashboard_screen.dart';
import 'screens/servers_screen.dart';
import 'screens/alerts_screen.dart';
import 'screens/ai_predict_screen.dart';
import 'screens/settings_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _tab = 0;
  int _prevAlertCount = 0;
  double _badgeScale = 1.0;

  void _onTabTapped(int i) => setState(() => _tab = i);

  @override
  Widget build(BuildContext context) {
    return Consumer<AlertsProvider>(
      builder: (_, alerts, __) {
        final count = alerts.criticalCount;
        if (count != _prevAlertCount && count > _prevAlertCount) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            setState(() => _badgeScale = 1.3);
            Future.delayed(const Duration(milliseconds: 200), () {
              if (mounted) setState(() => _badgeScale = 1.0);
            });
          });
        }
        _prevAlertCount = count;

        return Scaffold(
          body: IndexedStack(
            index: _tab,
            children: const [
              DashboardScreen(),
              ServersScreen(),
              AlertsScreen(),
              AiPredictScreen(),
            ],
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _tab,
            onTap: _onTabTapped,
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.grid_view_rounded),
                label: 'Dashboard',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.dns_outlined),
                label: 'Servers',
              ),
              BottomNavigationBarItem(
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.notifications_outlined),
                    if (count > 0)
                      Positioned(
                        right: -4,
                        top: -4,
                        child: AnimatedScale(
                          scale: _badgeScale,
                          duration: const Duration(milliseconds: 200),
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: const BoxDecoration(
                              color: AppTheme.red,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                count > 9 ? '9+' : '$count',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                label: 'Alerts',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.auto_awesome_outlined),
                label: 'Predict',
              ),
            ],
          ),
          drawer: Drawer(
            backgroundColor: AppTheme.bgCard,
            child: Column(
              children: [
                DrawerHeader(
                  decoration: const BoxDecoration(
                    color: AppTheme.bgPrimary,
                    border: Border(bottom: BorderSide(color: AppTheme.border)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.green.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.monitor_heart_outlined, color: AppTheme.green, size: 28),
                      ),
                      const SizedBox(width: 14),
                      const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('InfraLens',
                              style: TextStyle(color: AppTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                          Text('DevOps Dashboard',
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.settings_outlined, color: AppTheme.textMuted),
                  title: const Text('Settings', style: TextStyle(color: AppTheme.textPrimary)),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                  },
                ),
                const Spacer(),
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('InfraLens v1.0.0',
                      style: TextStyle(color: AppTheme.textHint, fontSize: 12)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
