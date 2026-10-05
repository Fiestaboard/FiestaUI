#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/bin"
openssl genrsa -out "$tmp/key.pem" 2048 2> /dev/null
openssl rsa -in "$tmp/key.pem" -pubout -out "$tmp/pub.pem" 2> /dev/null

# curl stub: log every call, answer the two endpoints app-token.sh uses.
cat > "$tmp/bin/curl" << EOF
#!/usr/bin/env bash
echo "\$*" >> "$tmp/curl-calls.log"
case "\${*: -1}" in
  */repos/acme/app/installation) echo '{"id":4242}' ;;
  */app/installations/4242/access_tokens) echo '{"token":"ghs_fresh"}' ;;
  *) exit 22 ;;
esac
EOF
chmod +x "$tmp/bin/curl"

: > "$tmp/curl-calls.log"
token=$(CURL_BIN="$tmp/bin/curl" API_URL=https://api.test APP_ID=123 \
  APP_PRIVATE_KEY="$(cat "$tmp/key.pem")" REPO=acme/app "$SCRIPTS/app-token.sh")
assert_eq "ghs_fresh" "$token" "prints the minted token"
assert_file_contains "$tmp/curl-calls.log" "GET" "looks up the installation"
assert_file_contains "$tmp/curl-calls.log" "https://api.test/repos/acme/app/installation" "installation endpoint"
assert_file_contains "$tmp/curl-calls.log" "https://api.test/app/installations/4242/access_tokens" "token endpoint"
assert_file_contains "$tmp/curl-calls.log" '{"repositories":["app"]}' "token scoped to the one repo"

# The JWT is a valid RS256 signature by the App key, issued by APP_ID.
jwt=$(grep -o 'Bearer [^ ]*' "$tmp/curl-calls.log" | head -1 | cut -d' ' -f2)
b64url_decode() {
  local s
  s=$(printf '%s' "$1" | tr '_-' '/+')
  while [ $((${#s} % 4)) -ne 0 ]; do s="$s="; done
  printf '%s' "$s" | openssl base64 -d -A
}
IFS=. read -r h p s <<< "$jwt"
b64url_decode "$s" > "$tmp/sig"
printf '%s.%s' "$h" "$p" > "$tmp/signed"
openssl dgst -sha256 -verify "$tmp/pub.pem" -signature "$tmp/sig" "$tmp/signed" > /dev/null ||
  fail "JWT signature does not verify against the App key"
assert_eq "RS256" "$(b64url_decode "$h" | jq -r .alg)" "RS256 header"
claims=$(b64url_decode "$p")
assert_eq "123" "$(jq -r .iss <<< "$claims")" "issuer is APP_ID"
assert_eq "600" "$(jq '.exp - .iat' <<< "$claims")" "ten-minute JWT window"

# Missing installation → non-zero, no token printed.
if out=$(CURL_BIN="$tmp/bin/curl" API_URL=https://api.test APP_ID=123 \
  APP_PRIVATE_KEY="$(cat "$tmp/key.pem")" REPO=acme/other "$SCRIPTS/app-token.sh" 2> /dev/null); then
  fail "must fail when the App is not installed on the repo (got '$out')"
fi

# auth.sh: push_branch mints first, resets checkout's stale header, then
# sends the fresh one.
cat > "$tmp/bin/app-token" << EOF
#!/usr/bin/env bash
n=\$(( \$(cat "$tmp/mints" 2>/dev/null || echo 0) + 1 )); echo "\$n" > "$tmp/mints"
echo "ghs_mint\$n"
EOF
cat > "$tmp/bin/git" << EOF
#!/usr/bin/env bash
printf '%s\n' "\$@" > "$tmp/git-args.log"
EOF
chmod +x "$tmp/bin/app-token" "$tmp/bin/git"
(
  export PATH="$tmp/bin:$PATH" APP_TOKEN_BIN="$tmp/bin/app-token" UPGRADE_BRANCH=fiestaui-upgrade
  # shellcheck source=/dev/null
  . "$SCRIPTS/auth.sh"
  refresh_auth > /dev/null
  assert_eq "ghs_mint1" "$GH_TOKEN" "refresh_auth exports a fresh token"
  push_branch > "$tmp/push-out.log"
  assert_eq "ghs_mint2" "$GH_TOKEN" "push_branch mints again"
)
assert_file_contains "$tmp/push-out.log" "::add-mask::ghs_mint2" "token masked"
expected_basic=$(printf 'x-access-token:ghs_mint2' | openssl base64 -A)
assert_file_contains "$tmp/push-out.log" "::add-mask::$expected_basic" "basic credential masked"
assert_eq "-c
http.https://github.com/.extraheader=
-c
http.https://github.com/.extraheader=AUTHORIZATION: basic $expected_basic
push
--force
origin
fiestaui-upgrade" "$(cat "$tmp/git-args.log")" "stale header reset before the fresh one"
