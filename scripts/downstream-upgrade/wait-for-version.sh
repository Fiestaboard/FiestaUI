#!/usr/bin/env bash
# Poll the npm registry until an exact package version is installable, or fail
# after a bounded number of attempts. `npm publish` returns before the registry
# has finished propagating the new version, so a downstream install fired the
# instant the release job finishes can 404 with ETARGET on a version that
# genuinely exists (Fiestaboard/FiestaUI#316: 6.2.0 published fine, then its own
# downstream-upgrade leg failed installing it seconds later). Block on the
# registry actually serving the version rather than assuming publish == live.
#
# Env (overridable, mainly for tests):
#   WAIT_ATTEMPTS   max poll attempts (default 30)
#   WAIT_INTERVAL   seconds to sleep between attempts (default 10)
#
# With the defaults that is up to ~5 minutes of polling — long enough to ride
# out a slow propagation, short enough not to hold the `release` concurrency
# lane indefinitely. Exits 0 as soon as the version is served, non-zero if it
# never appears (a genuinely bad publish, not a propagation race).
#
# Usage: wait-for-version.sh <package> <version>   # version without leading v
set -uo pipefail

PACKAGE="${1:?usage: wait-for-version.sh <package> <version>}"
VERSION="${2:?usage: wait-for-version.sh <package> <version>}"
ATTEMPTS="${WAIT_ATTEMPTS:-30}"
INTERVAL="${WAIT_INTERVAL:-10}"

attempt=1
while :; do
  # `npm view pkg@version version` prints the version and exits 0 only when the
  # registry serves that exact version; otherwise it errors (E404/ETARGET).
  if found=$(npm view "$PACKAGE@$VERSION" version 2>/dev/null) && [ "$found" = "$VERSION" ]; then
    echo "$PACKAGE@$VERSION is live on the registry (attempt $attempt/$ATTEMPTS)."
    exit 0
  fi
  [ "$attempt" -ge "$ATTEMPTS" ] && break
  echo "Waiting for $PACKAGE@$VERSION to propagate (attempt $attempt/$ATTEMPTS)..." >&2
  sleep "$INTERVAL"
  attempt=$((attempt + 1))
done

echo "$PACKAGE@$VERSION did not appear on the registry after $ATTEMPTS attempts." >&2
exit 1
