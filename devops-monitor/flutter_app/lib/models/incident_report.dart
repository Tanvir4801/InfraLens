class IncidentReport {
  final String reportText;
  final String generatedAt;

  const IncidentReport({
    required this.reportText,
    required this.generatedAt,
  });

  factory IncidentReport.fromText(String text) => IncidentReport(
        reportText:  text,
        generatedAt: DateTime.now().toIso8601String(),
      );
}
