import 'dart:async';
import 'package:flutter/foundation.dart';
import '../constants/app_constants.dart';
import '../models/prediction_result.dart';
import '../services/api_service.dart';

class PredictionProvider extends ChangeNotifier {
  final _api = ApiService();

  PredictionResult? _result;
  bool _loading = false;
  Timer? _timer;

  PredictionResult? get result    => _result;
  bool              get isLoading => _loading;

  void init() {
    fetch();
    _timer = Timer.periodic(
      Duration(seconds: AppConstants.predictionRefreshSeconds),
      (_) => fetch(),
    );
  }

  Future<void> fetch() async {
    _loading = true;
    notifyListeners();
    try {
      _result = await _api.fetchPrediction();
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
