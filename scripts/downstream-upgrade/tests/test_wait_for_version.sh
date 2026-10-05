#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)

# A stub `npm` put first on PATH so the poll loop hits it instead of the real
# CLI. It emulates `npm view <pkg>@<version> version`: prints the version and
# exits 0 once $tmp/live exists, otherwise 404s the way an unpropagated version
# does. Driving it through a file lets a test flip the registry mid-poll.
mkdir -p "$tmp/bin"
cat > "$tmp/bin/npm" <<EOF
#!/usr/bin/env bash
spec="\$2"              # e.g. @fiestaboard/ui@0.4.0
version="\${spec##*@}"  # strip the package (which itself starts with @)
if [ -f "$tmp/live" ]; then
  echo "\$version"
  exit 0
fi
echo "npm error code E404" >&2
exit 1
EOF
chmod +x "$tmp/bin/npm"
export PATH="$tmp/bin:$PATH"

# Already live → succeeds on the first attempt.
: > "$tmp/live"
bash "$SCRIPTS/wait-for-version.sh" @fiestaboard/ui 0.4.0 >/dev/null \
  || fail "should succeed when the version is already live"

# Never appears → exhausts the bounded attempts and exits non-zero.
rm -f "$tmp/live"
if WAIT_ATTEMPTS=2 WAIT_INTERVAL=0 bash "$SCRIPTS/wait-for-version.sh" \
     @fiestaboard/ui 0.4.0 2>/dev/null; then
  fail "should fail when the version never propagates"
fi

# Appears after a delay → the poll loop catches it and succeeds rather than
# failing on the first miss.
rm -f "$tmp/live"
( sleep 1; : > "$tmp/live" ) &
WAIT_ATTEMPTS=10 WAIT_INTERVAL=1 bash "$SCRIPTS/wait-for-version.sh" \
  @fiestaboard/ui 0.4.0 >/dev/null \
  || fail "should succeed once the version propagates mid-poll"
wait

echo "OK test_wait_for_version"
