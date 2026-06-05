---
name: Flutter setup on Replit
description: How to install Flutter, compatible package versions, and workflow setup
---

## Installation
Use `installSystemDependencies({ packages: ["flutter"] })` in code_execution. Installs Flutter 3.32 / Dart 3.8.

## SDK constraint
Use `'>=3.0.0 <4.0.0'` in pubspec.yaml. The caret `^3.x.x` syntax fails if the patch version exceeds the installed Dart version.

## fl_chart version
Must use `^0.68.0`. Version 1.x depends on `vector_math ^2.2.0` which conflicts with `flutter_test`'s pinned `vector_math 2.1.4`.

**Why:** flutter_test from the Flutter 3.32 SDK pins vector_math at 2.1.4. fl_chart 1.x requires ^2.2.0, causing resolution failure.

## Serving the web build
`flutter build web` outputs to `build/web`. Serve it with:
```
python3 -m http.server 3000 --directory build/web
```

## Workflows
- Port 3000: Flutter web (python http.server serving build/web)
- Port 5000: React dev server (legacy frontend)
- Port 8000: FastAPI backend (uvicorn)
