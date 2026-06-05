import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../constants/app_theme.dart';
import '../models/alert_model.dart';

class AlertCard extends StatefulWidget {
  final AlertModel alert;
  final VoidCallback onAcknowledge;
  final VoidCallback onGenerateReport;

  const AlertCard({
    super.key,
    required this.alert,
    required this.onAcknowledge,
    required this.onGenerateReport,
  });

  @override
  State<AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends State<AlertCard> {
  bool _generatingReport = false;

  DateTime? _parseFiredAt() {
    try {
      return DateTime.parse(widget.alert.firedAt);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCritical  = widget.alert.isCritical;
    final borderColor = isCritical ? AppTheme.red : AppTheme.amber;
    final firedAt     = _parseFiredAt();
    final timeStr     = firedAt != null ? timeago.format(firedAt) : widget.alert.firedAt;

    return Dismissible(
      key: Key(widget.alert.id),
      direction: DismissDirection.startToEnd,
      background: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 24),
        decoration: BoxDecoration(
          color: AppTheme.green.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: const [
            Icon(Icons.check_circle, color: AppTheme.green),
            SizedBox(width: 8),
            Text('Acknowledged', style: TextStyle(color: AppTheme.green, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
      onDismissed: (_) => widget.onAcknowledge(),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 200),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: AppTheme.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border(left: BorderSide(color: borderColor, width: 3)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: borderColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.alert.severity.toUpperCase(),
                        style: TextStyle(
                          color: borderColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.alert.name,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Text(timeStr, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  ],
                ),
                if (widget.alert.description.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    widget.alert.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _generatingReport
                          ? null
                          : () {
                              setState(() => _generatingReport = true);
                              widget.onGenerateReport();
                              Future.delayed(const Duration(seconds: 2), () {
                                if (mounted) setState(() => _generatingReport = false);
                              });
                            },
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.blue,
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 32),
                      ),
                      child: _generatingReport
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.blue),
                            )
                          : const Text('Generate AI Report', style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
