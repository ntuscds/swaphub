#!/bin/sh
set -eu

config_dir=/e2e-config
mkdir -p "$config_dir"
if [ ! -s "$config_dir/private.pem" ]; then
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$config_dir/private.pem" >/dev/null 2>&1
  openssl rsa -pubout -in "$config_dir/private.pem" -out "$config_dir/public.pem" >/dev/null 2>&1
fi

export CONVEX_JWT_PRIVATE_KEY="$(cat "$config_dir/private.pem")"
export CONVEX_JWT_PUBLIC_KEY="$(cat "$config_dir/public.pem")"
exec "$@"
