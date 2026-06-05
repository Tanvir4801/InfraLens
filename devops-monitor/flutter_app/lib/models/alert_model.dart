class AlertModel {
  final String id;
  final String name;
  final String severity;
  final String description;
  final String firedAt;
  final String status;

  const AlertModel({
    required this.id,
    required this.name,
    required this.severity,
    required this.description,
    required this.firedAt,
    required this.status,
  });

  factory AlertModel.fromJson(Map<String, dynamic> j) {
    final labels      = j['labels']      as Map<String, dynamic>? ?? {};
    final annotations = j['annotations'] as Map<String, dynamic>? ?? {};
    final startsAt    = j['startsAt']    as String? ?? '';
    final status      = j['status']      as Map<String, dynamic>? ?? {};

    return AlertModel(
      id:          j['id'] as String? ??
                   '${labels['alertname'] ?? 'alert'}_$startsAt',
      name:        labels['alertname']          as String? ??
                   j['name']                   as String? ?? 'Unknown Alert',
      severity:    labels['severity']           as String? ??
                   j['severity']               as String? ?? 'warning',
      description: annotations['description']  as String? ??
                   annotations['summary']      as String? ??
                   j['description']            as String? ?? '',
      firedAt:     startsAt.isNotEmpty ? startsAt : (j['fired_at'] as String? ?? ''),
      status:      (status['state'] as String?) ??
                   j['status']                 as String? ?? 'active',
    );
  }

  bool get isCritical => severity.toLowerCase() == 'critical';

  Map<String, dynamic> toJson() => {
        'id':          id,
        'name':        name,
        'severity':    severity,
        'description': description,
        'fired_at':    firedAt,
        'status':      status,
      };
}
