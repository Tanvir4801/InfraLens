import 'dart:async';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';
import '../models/alert_model.dart';

/// A sliding in-app banner shown when a new critical alert fires.
/// Mount it in the AppShell via [CriticalAlertBannerController].
class CriticalAlertBannerController {
  _CriticalAlertBannerState? _state;

  void _attach(_CriticalAlertBannerState s) => _state = s;
  void _detach() => _state = null;

  void show(AlertModel alert) => _state?._show(alert);
}

class CriticalAlertBanner extends StatefulWidget {
  final CriticalAlertBannerController controller;
  final Widget child;

  const CriticalAlertBanner({
    super.key,
    required this.controller,
    required this.child,
  });

  @override
  State<CriticalAlertBanner> createState() => _CriticalAlertBannerState();
}

class _CriticalAlertBannerState extends State<CriticalAlertBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _anim;
  late Animation<Offset> _slide;
  late Animation<double> _fade;

  AlertModel? _current;
  Timer? _autoHide;

  @override
  void initState() {
    super.initState();
    widget.controller._attach(this);
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
    _slide = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _anim, curve: Curves.easeOutBack));
    _fade = CurvedAnimation(parent: _anim, curve: Curves.easeIn);
  }

  @override
  void dispose() {
    widget.controller._detach();
    _autoHide?.cancel();
    _anim.dispose();
    super.dispose();
  }

  void _show(AlertModel alert) {
    if (!mounted) return;
    setState(() => _current = alert);
    _anim.forward(from: 0);
    _autoHide?.cancel();
    _autoHide = Timer(const Duration(seconds: 6), _dismiss);
  }

  void _dismiss() {
    if (!mounted) return;
    _anim.reverse().then((_) {
      if (mounted) setState(() => _current = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_current != null)
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: SlideTransition(
                position: _slide,
                child: FadeTransition(
                  opacity: _fade,
                  child: _Banner(alert: _current!, onDismiss: _dismiss),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onDismiss;
  const _Banner({required this.alert, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Material(
        color: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1e0a0a),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.red.withValues(alpha: 0.6), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: AppTheme.red.withValues(alpha: 0.25),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Row(
            children: [
              // Pulsing icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.red.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.warning_rounded, color: AppTheme.red, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'CRITICAL ALERT',
                      style: TextStyle(
                        color: AppTheme.red,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      alert.name,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (alert.description.isNotEmpty)
                      Text(
                        alert.description,
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 18),
                onPressed: onDismiss,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
