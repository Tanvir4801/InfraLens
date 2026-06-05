import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'dashboard_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => DashboardController()..connect(),
      child: const DevOpsMonitorApp(),
    ),
  );
}

class DevOpsMonitorApp extends StatelessWidget {
  const DevOpsMonitorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'DevOps Monitor',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF38BDF8),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF050816),
        useMaterial3: true,
      ),
      home: const DashboardScreen(),
    );
  }
}

