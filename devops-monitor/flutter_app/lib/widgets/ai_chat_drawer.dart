import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../providers/metrics_provider.dart';
import '../providers/alerts_provider.dart';
import '../services/api_service.dart';

const _kChips = [
  'Why is memory high?',
  'Which container restarted most?',
  'Show unhealthy services',
  'Predict disk usage next hour',
  'What caused last alert?',
];

class _ChatMessage {
  final bool isUser;
  final String text;
  _ChatMessage({required this.isUser, required this.text});
}

class AiChatDrawer extends StatefulWidget {
  const AiChatDrawer({super.key});

  @override
  State<AiChatDrawer> createState() => _AiChatDrawerState();
}

class _AiChatDrawerState extends State<AiChatDrawer> {
  final _api    = ApiService();
  final _ctrl   = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool   _loading = false;
  String _typingText = '';
  Timer? _typeTimer;

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    _typeTimer?.cancel();
    super.dispose();
  }

  Future<void> _send([String? preset]) async {
    final q = (preset ?? _ctrl.text).trim();
    if (q.isEmpty || _loading) return;
    _ctrl.clear();
    setState(() {
      _messages.add(_ChatMessage(isUser: true, text: q));
      _loading = true;
    });
    _scrollToBottom();
    try {
      double cpu = 0, ram = 0, disk = 0;
      int uptime = 0;
      List<String> alerts = [];
      try {
        final mp = context.read<MetricsProvider>();
        cpu    = mp.snapshot?.cpuPercent  ?? 0;
        ram    = mp.snapshot?.ramPercent  ?? 0;
        disk   = mp.snapshot?.diskPercent ?? 0;
        uptime = mp.snapshot?.uptimeSeconds ?? 0;
        final ap = context.read<AlertsProvider>();
        alerts = ap.allAlerts.map((a) => '${a.name} (${a.severity})').toList();
      } catch (_) {}

      final answer = await _api.postAiChat(
        q,
        cpu: cpu, ram: ram, disk: disk,
        uptime: uptime, alerts: alerts,
      );
      _typewriterEffect(answer);
    } catch (_) {
      setState(() {
        _messages.add(_ChatMessage(isUser: false, text: 'Sorry, I could not connect to the AI. Please try again.'));
        _loading = false;
      });
    }
  }

  void _typewriterEffect(String text) {
    int idx = 0;
    _typingText = '';
    _messages.add(_ChatMessage(isUser: false, text: ''));
    final msgIdx = _messages.length - 1;
    _typeTimer = Timer.periodic(const Duration(milliseconds: 18), (t) {
      if (idx >= text.length) {
        t.cancel();
        if (mounted) setState(() { _loading = false; _messages[msgIdx] = _ChatMessage(isUser: false, text: text); });
        return;
      }
      _typingText += text[idx++];
      if (mounted) {
        setState(() => _messages[msgIdx] = _ChatMessage(isUser: false, text: _typingText));
        _scrollToBottom();
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      maxChildSize: 0.92,
      minChildSize: 0.3,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          border: Border(top: BorderSide(color: AppTheme.border)),
        ),
        child: Column(
          children: [
            // ── Drag handle ──────────────────────────────────────────
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 40, height: 4,
                decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            // ── Header ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: AppTheme.blue.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.smart_toy_outlined, color: AppTheme.blue, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'DevOps Copilot',
                        style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      Text(
                        'Powered by Gemini · Groq fallback',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                  const Spacer(),
                  if (_messages.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.delete_sweep_outlined, color: AppTheme.textMuted, size: 20),
                      tooltip: 'Clear chat',
                      onPressed: () => setState(() {
                        _messages.clear();
                        _typeTimer?.cancel();
                        _loading = false;
                      }),
                    ),
                ],
              ),
            ),
            const Divider(color: AppTheme.border, height: 1),

            // ── Chat messages ─────────────────────────────────────────
            Expanded(
              child: _messages.isEmpty
                  ? _EmptyState(onChipTap: _send)
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      itemCount: _messages.length + (_loading && _messages.last.isUser ? 1 : 0),
                      itemBuilder: (_, i) {
                        if (i == _messages.length) return const _TypingIndicator();
                        return _Bubble(message: _messages[i]);
                      },
                    ),
            ),

            // ── Suggestion chips (always visible above input) ─────────
            if (_messages.isNotEmpty)
              SizedBox(
                height: 38,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: _kChips.map((chip) => GestureDetector(
                    onTap: () => _send(chip),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.blue.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.blue.withValues(alpha: 0.25)),
                      ),
                      child: Text(chip, style: const TextStyle(color: AppTheme.blueLight, fontSize: 11)),
                    ),
                  )).toList(),
                ),
              ),
            if (_messages.isNotEmpty) const SizedBox(height: 6),

            // ── Input bar ─────────────────────────────────────────────
            const Divider(color: AppTheme.border, height: 1),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _ctrl,
                        style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                        decoration: const InputDecoration(
                          hintText: 'Ask about your infrastructure…',
                          isDense: true,
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: _loading ? AppTheme.border : AppTheme.blue.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: IconButton(
                        icon: _loading
                            ? const SizedBox(
                                width: 18, height: 18,
                                child: CircularProgressIndicator(color: AppTheme.blue, strokeWidth: 2),
                              )
                            : const Icon(Icons.send_rounded, color: AppTheme.blue, size: 20),
                        onPressed: _loading ? null : () => _send(),
                        padding: const EdgeInsets.all(8),
                        constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Empty state with chips ────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final void Function(String) onChipTap;
  const _EmptyState({required this.onChipTap});

  @override
  Widget build(BuildContext context) => Center(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.blue.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.auto_awesome, color: AppTheme.blue, size: 32),
          ),
          const SizedBox(height: 12),
          const Text(
            'Ask me anything',
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'I have real-time context of your infra',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: _kChips.map((chip) => GestureDetector(
              onTap: () => onChipTap(chip),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.blue.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.blue.withValues(alpha: 0.3)),
                ),
                child: Text(chip, style: const TextStyle(color: AppTheme.blueLight, fontSize: 12)),
              ),
            )).toList(),
          ),
        ],
      ),
    ),
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

class _Bubble extends StatelessWidget {
  final _ChatMessage message;
  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: AppTheme.blue.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy_outlined, size: 14, color: AppTheme.blue),
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.bgCardAlt : const Color(0xFF0d1e2e),
                borderRadius: BorderRadius.only(
                  topLeft:     const Radius.circular(14),
                  topRight:    const Radius.circular(14),
                  bottomLeft:  Radius.circular(isUser ? 14 : 2),
                  bottomRight: Radius.circular(isUser ? 2 : 14),
                ),
                border: isUser ? null : Border.all(color: AppTheme.blue.withValues(alpha: 0.2)),
              ),
              child: SelectableText(
                message.text.isEmpty ? '…' : message.text,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 13,
                  height: 1.5,
                  fontFamily: isUser ? null : 'monospace',
                ),
              ),
            ),
          ),
          if (isUser) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

// ── Typing indicator ──────────────────────────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();
  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator> with TickerProviderStateMixin {
  late List<AnimationController> _ctrls;
  late List<Animation<double>>   _anims;

  @override
  void initState() {
    super.initState();
    _ctrls = List.generate(3, (i) => AnimationController(
      vsync: this, duration: const Duration(milliseconds: 500),
    ));
    _anims = _ctrls.map((c) => Tween<double>(begin: 0.3, end: 1.0)
        .animate(CurvedAnimation(parent: c, curve: Curves.easeInOut))).toList();
    for (int i = 0; i < 3; i++) {
      Future.delayed(Duration(milliseconds: i * 200), () {
        if (mounted) _ctrls[i].repeat(reverse: true);
      });
    }
  }

  @override
  void dispose() {
    for (final c in _ctrls) { c.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(
            color: AppTheme.blue.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.smart_toy_outlined, size: 14, color: AppTheme.blue),
        ),
        const SizedBox(width: 6),
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF0d1e2e),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.blue.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(3, (i) => AnimatedBuilder(
              animation: _anims[i],
              builder: (_, __) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 6, height: 6,
                decoration: BoxDecoration(
                  color: AppTheme.blue.withValues(alpha: _anims[i].value),
                  shape: BoxShape.circle,
                ),
              ),
            )),
          ),
        ),
      ],
    ),
  );
}
