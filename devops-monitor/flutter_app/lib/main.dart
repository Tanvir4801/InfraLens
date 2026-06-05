import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'services/local_storage_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load .env (ignore errors — defaults are used if file not found)
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {}

  // Init local storage
  await LocalStorageService.init();

  // Init notifications
  await initApp();

  runApp(const InfraLensApp());
}
