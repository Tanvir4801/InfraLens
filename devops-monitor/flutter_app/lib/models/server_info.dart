class ServerInfo {
  final String name;
  final String role;
  final String ip;
  final double cpu;
  final double ram;
  final double disk;
  final int    uptime;
  final String status;

  const ServerInfo({
    required this.name,
    required this.role,
    required this.ip,
    required this.cpu,
    required this.ram,
    required this.disk,
    required this.uptime,
    required this.status,
  });

  factory ServerInfo.fromJson(Map<String, dynamic> j) => ServerInfo(
        name:   (j['name']   as String?) ?? '',
        role:   (j['role']   as String?) ?? '',
        ip:     (j['ip']     as String?) ?? '',
        cpu:    (j['cpu']    as num?)?.toDouble() ?? 0.0,
        ram:    (j['ram']    as num?)?.toDouble() ?? 0.0,
        disk:   (j['disk']   as num?)?.toDouble() ?? 0.0,
        uptime: (j['uptime'] as num?)?.toInt()    ?? 0,
        status: (j['status'] as String?) ?? 'unknown',
      );

  bool get isHealthy => status == 'healthy';
}
