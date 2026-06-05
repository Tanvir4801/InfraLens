class PredictionResult {
  final bool   willOverload;
  final double predictedMaxCpu;
  final int    minutesUntilOverload;
  final double confidence;
  final List<Map<String, dynamic>> forecast;
  final List<Map<String, dynamic>> history;

  const PredictionResult({
    required this.willOverload,
    required this.predictedMaxCpu,
    required this.minutesUntilOverload,
    required this.confidence,
    required this.forecast,
    required this.history,
  });

  factory PredictionResult.fromJson(Map<String, dynamic> j) => PredictionResult(
        willOverload:         j['will_overload']          as bool?   ?? false,
        predictedMaxCpu:      (j['predicted_max_cpu']     as num?)?.toDouble() ?? 0.0,
        minutesUntilOverload: (j['minutes_until_overload'] as num?)?.toInt()   ?? 0,
        confidence:           (j['confidence']            as num?)?.toDouble() ?? 0.0,
        forecast: (j['forecast'] as List<dynamic>?)
                ?.map((e) => Map<String, dynamic>.from(e as Map))
                .toList() ?? [],
        history: (j['history'] as List<dynamic>?)
                ?.map((e) => Map<String, dynamic>.from(e as Map))
                .toList() ?? [],
      );
}
