import 'package:flutter/material.dart';

class AppTheme {
  static const bgPrimary   = Color(0xFF0d1117);
  static const bgCard      = Color(0xFF161b22);
  static const bgCardAlt   = Color(0xFF1f2937);
  static const border      = Color(0xFF30363d);
  static const textPrimary = Color(0xFFe6edf3);
  static const textMuted   = Color(0xFF8b949e);
  static const textHint    = Color(0xFF484f58);
  static const green       = Color(0xFF1D9E75);
  static const greenLight  = Color(0xFF5DCAA5);
  static const amber       = Color(0xFFEF9F27);
  static const red         = Color(0xFFE24B4A);
  static const blue        = Color(0xFF378ADD);
  static const blueLight   = Color(0xFF85B7EB);
  static const textSecondary = Color(0xFFb0b8c1);

  static Color getMetricColor(double pct) =>
      pct < 60 ? green : pct < 80 ? amber : red;

  static ThemeData get darkTheme => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bgPrimary,
        colorScheme: const ColorScheme.dark(
          primary: green,
          secondary: blue,
          surface: bgCard,
        ),
        cardColor: bgCard,
        dividerColor: border,
        textTheme: const TextTheme(
          bodyLarge:  TextStyle(color: textPrimary),
          bodyMedium: TextStyle(color: textPrimary),
          bodySmall:  TextStyle(color: textMuted),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: bgCard,
          foregroundColor: textPrimary,
          elevation: 0,
          titleTextStyle: TextStyle(
            color: textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: bgCard,
          selectedItemColor: green,
          unselectedItemColor: textMuted,
          type: BottomNavigationBarType.fixed,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: bgCardAlt,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: green),
          ),
          hintStyle: const TextStyle(color: textHint),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
        useMaterial3: true,
      );
}
