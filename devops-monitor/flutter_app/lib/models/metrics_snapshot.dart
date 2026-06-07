class MetricsSnapshot {
  final String timestamp;
  final String source;
  final double cpuPercent;
  final double ramPercent;
  final double diskPercent;
  final int uptimeSeconds;
  final double? networkInKbps;
  final double? networkOutKbps;
  final int? containerCount;

  const MetricsSnapshot({
    required this.timestamp,
    required this.source,
    required this.cpuPercent,
    required this.ramPercent,
    required this.diskPercent,
    required this.uptimeSeconds,
    this.networkInKbps,
    this.networkOutKbps,
    this.containerCount,
  });

  factory MetricsSnapshot.fromJson(Map<String, dynamic> j) => MetricsSnapshot(
        timestamp:     (j['timestamp'] as String?) ?? '',
        source:        (j['source']    as String?) ?? 'unknown',
        cpuPercent:    (j['cpu_percent']  as num?)?.toDouble()  ?? 0.0,
        ramPercent:    (j['ram_percent']  as num?)?.toDouble()  ?? 0.0,
        diskPercent:   (j['disk_percent'] as num?)?.toDouble()  ?? 0.0,
        uptimeSeconds: (j['uptime_seconds'] as num?)?.toInt()   ?? 0,
        networkInKbps: (j['network_in_kbps'] as num?)?.toDouble(),
        networkOutKbps: (j['network_out_kbps'] as num?)?.toDouble(),
        containerCount: (j['container_count'] as num?)?.toInt(),
      );

  Map<String, dynamic> toJson() => {
        'timestamp':      timestamp,
        'source':         source,
        'cpu_percent':    cpuPercent,
        'ram_percent':    ramPercent,
        'disk_percent':   diskPercent,
        'uptime_seconds': uptimeSeconds,
        'network_in_kbps': networkInKbps,
        'network_out_kbps': networkOutKbps,
        'container_count': containerCount,
      };

  MetricsSnapshot copyWith({
    String? timestamp,
    String? source,
    double? cpuPercent,
    double? ramPercent,
    double? diskPercent,
    int?    uptimeSeconds,
    double? networkInKbps,
    double? networkOutKbps,
    int?    containerCount,
  }) =>
      MetricsSnapshot(
        timestamp:     timestamp     ?? this.timestamp,
        source:        source        ?? this.source,
        cpuPercent:    cpuPercent    ?? this.cpuPercent,
        ramPercent:    ramPercent    ?? this.ramPercent,
        diskPercent:   diskPercent   ?? this.diskPercent,
        uptimeSeconds: uptimeSeconds ?? this.uptimeSeconds,
        networkInKbps: networkInKbps ?? this.networkInKbps,
        networkOutKbps: networkOutKbps ?? this.networkOutKbps,
        containerCount: containerCount ?? this.containerCount,
      );
}
