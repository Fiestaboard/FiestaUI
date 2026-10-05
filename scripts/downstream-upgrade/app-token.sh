#!/usr/bin/env bash
# Mint a fresh GitHub App installation token scoped to one repo; print it.
#
# Installation tokens expire after an hour and the downstream job outlives
# that (adoption alone has run 64 minutes), so the workflow mints through
# auth.sh before every push and every long `gh` call instead of reusing the
# token minted at the start of the job.
#
# Env: APP_ID (App ID or client ID), APP_PRIVATE_KEY (PEM), REPO (owner/name).
# CURL_BIN and API_URL are overridable for the offline tests.
set -euo pipefail

: "${APP_ID:?APP_ID is required}"
: "${APP_PRIVATE_KEY:?APP_PRIVATE_KEY is required}"
: "${REPO:?REPO is required (owner/name)}"
CURL_BIN="${CURL_BIN:-curl}"
API_URL="${API_URL:-https://api.github.com}"

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

key=$(mktemp)
trap 'rm -f "$key"' EXIT
printf '%s\n' "$APP_PRIVATE_KEY" > "$key"

now=$(date +%s)
header=$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)
# iat is backdated a minute for clock skew; GitHub caps exp at ten minutes.
payload=$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' $((now - 60)) $((now + 540)) "$APP_ID" | b64url)
sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -sign "$key" | b64url)
jwt="$header.$payload.$sig"

api() { # method path [json-body]
  local args=(-fsS -X "$1"
    -H "Authorization: Bearer $jwt"
    -H "Accept: application/vnd.github+json"
    -H "X-GitHub-Api-Version: 2022-11-28")
  [ $# -ge 3 ] && args+=(-d "$3")
  "$CURL_BIN" "${args[@]}" "$API_URL$2"
}

installation=$(api GET "/repos/$REPO/installation" | jq -er '.id')
api POST "/app/installations/$installation/access_tokens" \
  "{\"repositories\":[\"${REPO#*/}\"]}" | jq -er '.token'
