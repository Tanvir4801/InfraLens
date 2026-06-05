class MetricsSnapshot {
  final String timestamp;
  final String source;
  final double cpuPercent;
  final double ramPercent;
  final double diskPercent;
  final int uptimeSeconds;

  const MetricsSnapshot({
    required this.timestamp,
    required this.source,
    required this.cpuPercent,
    required this.ramPercent,
    required this.diskPercent,
    required this.uptimeSeconds,
  });

  factory MetricsSnapshot.fromJson(Map<String, dynamic> j) => MetricsSnapshot(
        timestamp:     (j['timestamp'] as String?) ?? '',
        source:        (j['source']    as String?) ?? 'unknown',
        cpuPercent:    (j['cpu_percent']  as num?)?.toDouble()  ?? 0.0,
        ramPercent:    (j['ram_percent']  as num?)?.toDouble()  ?? 0.0,
        diskPercent:   (j['disk_percent'] as num?)?.toDouble()  ?? 0.0,
        uptimeSeconds: (j['uptime_seconds'] as num?)?.toInt()   ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'timestamp':      timestamp,
        'source':         source,
        'cpu_percent':    cpuPercent,
        'ram_percent':    ramPercent,
        'disk_percent':   diskPercent,
        'uptime_seconds': uptimeSeconds,
      };

  MetricsSnapshot copyWith({
    String? timestamp,
    String? source,
    double? cpuPercent,
    double? ramPercent,
    double? diskPercent,
    int?    uptimeSeconds,
  }) =>
      MetricsSnapshot(
        timestamp:     timestamp     ?? this.timestamp,
        source:        source        ?? this.source,
        cpuPercent:    cpuPercent    ?? this.cpuPercent,
        ramPercent:    ramPercent    ?? this.ramPercent,
        diskPercent:   diskPercent   ?? this.diskPercent,
        uptimeSeconds: uptimeSeconds ?? this.uptimeSeconds,
      );
}
