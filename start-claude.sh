#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Cargar .env
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No se encontro .env en $SCRIPT_DIR"
  echo "Crea el archivo .env con la configuracion. Ver README.md."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

# Validar API key
if [[ -z "${ANTHROPIC_FOUNDRY_API_KEY:-}" ]]; then
  echo "ANTHROPIC_FOUNDRY_API_KEY esta vacia en .env"
  echo "Completa tu API key en el archivo .env antes de arrancar."
  exit 1
fi

# Validar dependencias
if ! command -v az >/dev/null 2>&1; then
  echo "No se encontro Azure CLI (az). Instalalo y volve a ejecutar este script."
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "No se encontro Claude Code (claude). Instalalo y volve a ejecutar este script."
  exit 1
fi

# Login en Azure si no hay sesion
if ! az account show >/dev/null 2>&1; then
  az login
fi

# Exportar variables
export ANTHROPIC_FOUNDRY_API_KEY
export CLAUDE_CODE_USE_FOUNDRY
export ANTHROPIC_FOUNDRY_RESOURCE
export ANTHROPIC_FOUNDRY_ENDPOINT
export ANTHROPIC_DEFAULT_OPUS_MODEL
export ANTHROPIC_DEFAULT_SONNET_MODEL

# Seleccion de modelo
OPUS_MODEL="${ANTHROPIC_DEFAULT_OPUS_MODEL}"
SONNET_MODEL="${ANTHROPIC_DEFAULT_SONNET_MODEL}"
MODEL_CHOICE="${1:-}"

if [[ -z "$MODEL_CHOICE" ]]; then
  echo "Elegir modelo para Claude Code:"
  echo "  1) Sonnet 4.6 - recomendado para uso diario, buen costo/beneficio y menor costo."
  echo "  2) Opus 4.7   - recomendado para tareas complejas, arquitectura, debugging dificil o razonamiento profundo."
  read -r -p "Seleccion [1/2, Enter=1]: " MODEL_CHOICE
fi

MODEL_CHOICE_NORMALIZED="$(printf '%s' "$MODEL_CHOICE" | tr '[:upper:]' '[:lower:]')"

case "$MODEL_CHOICE_NORMALIZED" in
  ""|"1"|"sonnet"|"claude-sonnet-4-6")
    SELECTED_MODEL="$SONNET_MODEL"
    ;;
  "2"|"opus"|"claude-opus-4-7")
    SELECTED_MODEL="$OPUS_MODEL"
    ;;
  *)
    echo "Opcion invalida: $MODEL_CHOICE"
    echo "Usa: ./start-claude.sh sonnet  o  ./start-claude.sh opus"
    exit 1
    ;;
esac

echo "Iniciando Claude Code con modelo: $SELECTED_MODEL"
claude --model "$SELECTED_MODEL"
