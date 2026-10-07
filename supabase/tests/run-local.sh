#!/usr/bin/env bash
# Aplica as migrations num banco descartável e roda os testes pgTAP.
#
# Uso: bash supabase/tests/run-local.sh
# Conexão: variáveis padrão do libpq (PGHOST, PGUSER, PGPASSWORD, PGPORT).
# Precisa de um Postgres 16+ com a extensão pgtap instalada.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${PAINEL_TEST_DB:-painel_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -X -q)

echo "→ Recriando banco $DB"
"${PSQL[@]}" -d postgres -c "drop database if exists \"$DB\";"
"${PSQL[@]}" -d postgres -c "create database \"$DB\";"

echo "→ Emulando schema auth e papéis do Supabase"
"${PSQL[@]}" -d "$DB" -v dbname="$DB" -f "$RAIZ/supabase/tests/setup-local-auth.sql"

echo "→ Aplicando migrations"
for arquivo in "$RAIZ"/supabase/migrations/*.sql; do
  echo "   $(basename "$arquivo")"
  "${PSQL[@]}" -d "$DB" -f "$arquivo"
done

echo "→ Rodando testes pgTAP"
if command -v pg_prove >/dev/null 2>&1; then
  pg_prove -d "$DB" --verbose "$RAIZ"/supabase/tests/*.test.sql
else
  FALHAS=0
  for teste in "$RAIZ"/supabase/tests/*.test.sql; do
    echo "   $(basename "$teste")"
    SAIDA="$(psql -X -d "$DB" -f "$teste" 2>&1)" || true
    echo "$SAIDA" | sed 's/^/     /'
    if echo "$SAIDA" | grep -qE '^not ok|ERROR|# Looks like'; then
      FALHAS=$((FALHAS + 1))
    fi
  done
  if [ "$FALHAS" -gt 0 ]; then
    echo "✗ $FALHAS arquivo(s) de teste com falha"
    exit 1
  fi
fi

echo "✓ Banco e RLS OK"
