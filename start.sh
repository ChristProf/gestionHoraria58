#!/bin/bash

set -e

cd "$(dirname "$0")"

mkdir -p logs

echo "=== Iniciando Control Horario en segundo plano ==="
nohup npm start > logs/control-horario.log 2>&1 &
echo $! > logs/control-horario.pid

echo "Sistema iniciado en segundo plano."
echo "PID guardado en logs/control-horario.pid"
echo "Log disponible en logs/control-horario.log"