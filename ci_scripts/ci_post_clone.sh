#!/bin/sh

# Xcode Cloud post-clone hook.
# Installe Node.js + dépendances npm pour que les paths SPM
# `../../../node_modules/@capacitor/*` existent avant que xcodebuild
# ne résolve le Package.swift.

set -e

echo "=== Xcode Cloud post-clone : installation des deps Node ==="

# Installe Homebrew si pas déjà là (Xcode Cloud images l'incluent en général)
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew absent — installation"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Installe Node si absent
if ! command -v node >/dev/null 2>&1; then
  echo "Node absent — installation via brew"
  brew install node
fi

echo "Node version : $(node -v)"
echo "npm version  : $(npm -v)"

# Le script tourne depuis ci_scripts/. On remonte à la racine du repo.
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installation npm dans $(pwd)"
npm ci --no-audit --no-fund

# Crée le webDir attendu par Capacitor (gitignored).
# L'app charge depuis server.url donc le contenu n'est qu'un placeholder.
mkdir -p out
cat > out/index.html <<'EOF'
<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>La Niche</title></head>
<body style="margin:0;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
<p>Chargement…</p></body></html>
EOF

# Sync Capacitor (régénère les paths Swift avec /, copie les assets web)
npx cap sync ios

echo "=== post-clone OK ==="
