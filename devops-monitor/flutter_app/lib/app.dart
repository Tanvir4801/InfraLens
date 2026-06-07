import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'constants/app_theme.dart';
import 'providers/metrics_provider.dart';
import 'providers/alerts_provider.dart';
import 'providers/servers_provider.dart';
import 'providers/prediction_provider.dart';
import 'services/notification_service.dart';
import 'services/sse_service.dart';
import 'app_shell.dart';

class InfraLensApp extends StatefulWidget {
  const InfraLensApp({super.key});

  @override
  State<InfraLensApp> createState() => _InfraLensAppState();
}

class _InfraLensAppState extends State<InfraLensApp> {
  final _metricsProvider = MetricsProvider();
  final _alertsProvider = AlertsProvider();
  final _serversProvider = ServersProvider();
  final _predictionProvider = PredictionProvider();

  @override
  void initState() {
    super.initState();
    _metricsProvider.init();
    _alertsProvider.init();
    _serversProvider.init();
    _predictionProvider.init();
    
    SseService().setAlertsProvider(_alertsProvider);
    SseService().connect();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _metricsProvider),
        ChangeNotifierProvider.value(value: _alertsProvider),
        ChangeNotifierProvider.value(value: _serversProvider),
        ChangeNotifierProvider.value(value: _predictionProvider),
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
