#!/bin/bash

set -e

echo "=== Instalación de Control Horario ==="

# =========================
# Verificar Node
# =========================
if command -v node >/dev/null 2>&1; then
  echo "Node detectado: $(node -v)"
else
  echo "Node no encontrado. Instalando con NVM..."

  # Descargar e instalar NVM
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

  # Cargar NVM en la sesión actual
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  # Instalar Node (LTS)
  nvm install --lts

  # Usar Node por defecto
  nvm use --lts

  echo "Node instalado: $(node -v)"
fi

# =========================
# Verificar npm
# =========================
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm no está disponible"
  exit 1
fi

echo "npm detectado: $(npm -v)"

# =========================
# Crear estructura
# =========================
mkdir -p db
mkdir -p logs

# =========================
# Instalar dependencias
# =========================
if [ -f package-lock.json ]; then
  echo "Instalando dependencias con npm ci..."
  npm ci
else
  echo "Instalando dependencias con npm install..."
  npm install
fi

# =========================
# Permisos scripts
# =========================
chmod +x start.sh 2>/dev/null || true
chmod +x start-background.sh 2>/dev/null || true
chmod +x stop.sh 2>/dev/null || true

echo "====================================="
echo "Instalación completada correctamente"
echo "====================================="
echo ""
echo "IMPORTANTE:"
echo "Cerrá y volvé a abrir la terminal o ejecutá:"
echo "source ~/.bashrc"
echo ""
echo "Luego podés iniciar con:"
echo "./start.sh"