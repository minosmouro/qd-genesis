#!/bin/sh
# wait-for-it.sh: aguarda um host:porta ficar disponível
# Uso: wait-for-it.sh host:porta -- comando

HOST_PORT="$1"
shift

HOST=$(echo $HOST_PORT | cut -d: -f1)
PORT=$(echo $HOST_PORT | cut -d: -f2)

while ! nc -z $HOST $PORT; do
  echo "Aguardando $HOST:$PORT..."
  sleep 1
done

echo "$HOST:$PORT está disponível!"
exec "$@"
