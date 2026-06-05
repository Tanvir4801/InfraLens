import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'constants/app_theme.dart';
import 'providers/metrics_provider.dart';
import 'providers/alerts_provider.dart';
import 'providers/servers_provider.dart';
import 'providers/prediction_provider.dart';
import 'services/notification_service.dart';
import 'app_shell.dart';

class InfraLensApp extends StatelessWidget {
  const InfraLensApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MetricsProvider()..init()),
        ChangeNotifierProvider(create: (_) => AlertsProvider()..init()),
        ChangeNotifierProvider(create: (_) => ServersProvider()..init()),
        ChangeNotifierProvider(create: (_) => PredictionProvider()..init()),
      ],
      child: MaterialApp(
        title: 'InfraLens',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AppShell(),
      ),
    );
  }
}

Future<void> initApp() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService().init();
}
