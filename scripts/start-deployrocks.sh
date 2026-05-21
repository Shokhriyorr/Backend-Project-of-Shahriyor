#!/bin/sh
set -eu

envsubst '${PORT} ${API_HOST} ${API_PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/http.d/default.conf

npm run prisma:deploy
npm run seed:admin
npm run seed:demo

node src/index.js &
api_pid=$!

nginx -g 'daemon off;' &
nginx_pid=$!

shutdown() {
  kill "$api_pid" "$nginx_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
  wait "$nginx_pid" 2>/dev/null || true
}

trap shutdown INT TERM

while true; do
  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid"
    exit $?
  fi

  if ! kill -0 "$nginx_pid" 2>/dev/null; then
    wait "$nginx_pid"
    exit $?
  fi

  sleep 2
done
