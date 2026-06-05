import 'dart:async';
import 'package:flutter/foundation.dart';
import '../constants/app_constants.dart';
import '../models/server_info.dart';
import '../services/api_service.dart';

class ServersProvider extends ChangeNotifier {
  final _api = ApiService();

  List<ServerInfo> _servers = [];
  bool _loading = false;
  Timer? _timer;

  List<ServerInfo> get servers  => _servers;
  bool             get isLoading => _loading;

  void init() {
    fetch();
    _timer = Timer.periodic(
      Duration(seconds: AppConstants.serversRefreshSeconds),
      (_) => fetch(),
    );
  }

  Future<void> fetch() async {
    _loading = true;
    notifyListeners();
    try {
      _servers = await _api.fetchServers();
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
