#!/bin/sh
set -eu

if [ ! -f .env.e2e ]; then
  cp .env.e2e.example .env.e2e
fi

docker compose -f docker-compose.e2e.yml up --build --wait -d convex app
docker compose -f docker-compose.e2e.yml run --build --rm setup
