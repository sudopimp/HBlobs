#!/usr/bin/env bash
# Hostile close: every PASS is 0 and every --twin is nonzero with FAIL <token>
# on stderr. A syntax-red twin without that token is twin-bad-reason.
# This runner must never print the five-letter word A-L-L-O-W.
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

workdir="$(mktemp -d "${TMPDIR:-/tmp}/hblobs-hostile.XXXXXX")"
bundle="$workdir/bundle.txt"
: >"$bundle"
status=0

declare -A TWIN_TOKEN=(
  [gates/hygiene-license.mjs]=grok-bot-string
  [gates/hygiene-private.mjs]=skull-geometry
  [gates/hygiene-skill.mjs]=skill-wrong-name
  [gates/hygiene-cli.mjs]=adopt-uses-gallery-install
  [gates/hash-lock.mjs]=hash-mismatch
  [gates/sota-prim.mjs]=capsule-aliased-circle
  [gates/sota-csg.mjs]=painted-hole-not-sdf
  [gates/sota-seed.mjs]=seed-nondeterministic
  [gates/sota-nl.mjs]=nl-evals-prompt
)

gates=()
for g in gates/*.mjs; do
  [[ -f "$g" ]] || continue
  gates+=("$g")
done
IFS=$'\n' gates=($(printf '%s\n' "${gates[@]}" | LC_ALL=C sort))
unset IFS

if [[ ${#gates[@]} -eq 0 ]]; then
  fail "no-gates"
fi

run_pass() {
  local gate="$1"
  local out="$workdir/$(basename "$gate").pass.out"
  local err="$workdir/$(basename "$gate").pass.err"
  local ec=0
  node "$gate" >"$out" 2>"$err" || ec=$?
  cat "$out" >>"$bundle"
  cat "$err" >>"$bundle"
  if [[ "$ec" -ne 0 ]]; then
    printf 'FAIL pass-%s\n' "$(basename "$gate" .mjs)" >&2
    cat "$err" >&2
    status=1
  fi
}

run_twin() {
  local gate="$1"
  local token="${TWIN_TOKEN[$gate]:-}"
  local out="$workdir/$(basename "$gate").twin.out"
  local err="$workdir/$(basename "$gate").twin.err"
  local ec=0
  node "$gate" --twin >"$out" 2>"$err" || ec=$?
  cat "$out" >>"$bundle"
  cat "$err" >>"$bundle"
  if [[ "$ec" -eq 0 ]]; then
    printf 'FAIL twin-passed %s\n' "$gate" >&2
    status=1
    return
  fi
  if [[ -n "$token" ]]; then
    if ! grep -E -q "FAIL ${token}( |$)" "$err"; then
      printf 'FAIL twin-bad-reason %s need FAIL %s\n' "$gate" "$token" >&2
      cat "$err" >&2
      status=1
    fi
    return
  fi
  if ! grep -E -q 'FAIL [a-z0-9-]+' "$err"; then
    printf 'FAIL twin-bad-reason %s\n' "$gate" >&2
    cat "$err" >&2
    status=1
  fi
}

for gate in "${gates[@]}"; do
  run_pass "$gate"
  run_twin "$gate"
done

if grep -F -q 'ALLOW' "$bundle"; then
  fail "runner-forbid"
fi

rm -rf "$workdir"

if [[ "$status" -ne 0 ]]; then
  exit 1
fi

printf 'PASS hostile\n'
exit 0
