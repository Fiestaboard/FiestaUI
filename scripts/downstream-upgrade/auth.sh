#!/usr/bin/env bash
# Sourced by the late downstream-upgrade steps: fresh credentials per call.
#
#   refresh_auth   mint a new installation token into GH_TOKEN (for gh)
#   push_branch    refresh, then force-push UPGRADE_BRANCH with that token
#
# actions/checkout persisted the job-start token as an http extraheader, and
# that token is dead after an hour. An empty extraheader value resets git's
# header list, so passing one before ours replaces the stale header instead
# of sending both.
#
# Env: APP_ID, APP_PRIVATE_KEY, REPO (see app-token.sh), UPGRADE_BRANCH.
# APP_TOKEN_BIN is overridable for the offline tests.

APP_TOKEN_BIN="${APP_TOKEN_BIN:-$(dirname "${BASH_SOURCE[0]}")/app-token.sh}"

refresh_auth() {
  GH_TOKEN=$("$APP_TOKEN_BIN")
  echo "::add-mask::$GH_TOKEN"
  export GH_TOKEN
}

push_branch() {
  local basic
  refresh_auth
  basic=$(printf 'x-access-token:%s' "$GH_TOKEN" | openssl base64 -A)
  echo "::add-mask::$basic"
  git -c http.https://github.com/.extraheader= \
    -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $basic" \
    push --force origin "${UPGRADE_BRANCH:?UPGRADE_BRANCH is required}"
}
