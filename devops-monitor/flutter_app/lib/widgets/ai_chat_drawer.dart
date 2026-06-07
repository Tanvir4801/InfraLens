import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../providers/metrics_provider.dart';
import '../providers/alerts_provider.dart';
import '../services/api_service.dart';

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
  final _api      = ApiService();
  final _ctrl     = TextEditingController();
  final _scroll   = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool _loading = false;
  String _typingText = '';
  Timer? _typeTimer;

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    _typeTimer?.cancel();
    super.dispose();
  }

  Future<void> _send() async {
    final q = _ctrl.text.trim();
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
        cpu  = mp.snapshot?.cpuPercent  ?? 0;
        ram  = mp.snapshot?.ramPercent  ?? 0;
        disk = mp.snapshot?.diskPercent ?? 0;
        uptime = mp.snapshot?.uptimeSeconds ?? 0;
        
        final ap = context.read<AlertsProvider>();
        alerts = ap.allAlerts.map((a) => '${a.name} (${a.severity})').toList();
      } catch (_) {}
      
      // We pass the context in the query or body. The current API only takes cpu, ram, disk as params.
      // In a real app we'd expand the API. For now we follow the "context sent includes" rule by 
      // potentially appending it to the question if needed or just assuming the backend handles it.
      // But let's stick to the parameters we have and maybe add one for context if T001 allowed.
      // The task says "Context sent includes: cpu, ram, disk, uptime, alerts list".
      // Let's modify postAiChat to accept more.
      
      final answer = await _api.postAiChat(
        q, 
        cpu: cpu, 
        ram: ram, 
        disk: disk,
        uptime: uptime,
        alerts: alerts,
      );
      _typewriterEffect(answer);
    } catch (_) {
      setState(() {
        _messages.add(_ChatMessage(isUser: false, text: 'Sorry, I could not connect. Try again.'));
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
        setState(() {
          _loading = false;
          _messages[msgIdx] = _ChatMessage(isUser: false, text: text);
        });
        return;
      }
      _typingText += text[idx];
      idx++;
      if (mounted) {
        setState(() {
          _messages[msgIdx] = _ChatMessage(isUser: false, text: _typingText);
        });
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
      initialChildSize: 0.5,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          border: Border(top: BorderSide(color: AppTheme.border)),
        ),
        child: Column(
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.blue.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.smart_toy_outlined, color: AppTheme.blue, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Ask InfraLens AI',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: AppTheme.border, height: 1),
            // Messages
            Expanded(
              child: _messages.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.chat_bubble_outline, color: AppTheme.textHint, size: 40),
                          const SizedBox(height: 8),
                          const Text('Ask about your infrastructure',
                              style: TextStyle(color: AppTheme.textMuted)),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            alignment: WrapAlignment.center,
                            children: [
                              "Why is memory high?",
                              "Which container restarted most?",
                              "Show unhealthy services",
                              "Predict disk next hour",
                              "What caused last alert?",
                            ].map((hint) => GestureDetector(
                                  onTap: () {
                                    _ctrl.text = hint;
                                    _send();
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppTheme.blue.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: AppTheme.blue.withValues(alpha: 0.3)),
                                    ),
                                    child: Text(
                                      hint,
                                      style: const TextStyle(color: AppTheme.blueLight, fontSize: 12),
                                    ),
                                  ),
                                ))
                                .toList(),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length + (_loading && _messages.last.isUser ? 1 : 0),
                      itemBuilder: (_, i) {
                        if (i == _messages.length) return const _TypingIndicator();
                        final msg = _messages[i];
                        return _Bubble(message: msg);
                      },
                    ),
            ),
            // Input
            const Divider(color: AppTheme.border, height: 1),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _ctrl,
                        style: const TextStyle(color: AppTheme.textPrimary),
                        decoration: const InputDecoration(
                          hintText: 'Ask about your infrastructure…',
                          isDense: true,
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.send, color: AppTheme.blue),
                      onPressed: _loading ? null : _send,
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

class _Bubble extends StatelessWidget {
  final _ChatMessage message;
  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Row(
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!message.isUser) ...[
            Container(
              width: 26, height: 26,
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
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: message.isUser ? AppTheme.bgCardAlt : const Color(0xFF0d1e2e),
                borderRadius: BorderRadius.only(
                  topLeft:     const Radius.circular(12),
                  topRight:    const Radius.circular(12),
                  bottomLeft:  Radius.circular(message.isUser ? 12 : 2),
                  bottomRight: Radius.circular(message.isUser ? 2  : 12),
                ),
                border: message.isUser ? null : Border.all(color: AppTheme.blue.withValues(alpha: 0.2)),
              ),
              child: SelectableText(
                message.text,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, height: 1.45),
              ),
            ),
          ),
          if (message.isUser) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

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
      vsync: this,
      duration: const Duration(milliseconds: 500),
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
    child: Container(
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
  );
}
