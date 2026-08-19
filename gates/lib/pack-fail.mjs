/** Named FAIL only. Never print ALLOW. */

export function fail(token, extra) {
  const line = extra ? `FAIL ${token} ${extra}` : `FAIL ${token}`;
  console.error(line);
  process.exit(1);
}

export function failAll(tokens) {
  if (!tokens.length) {
    console.error("FAIL twin-not-broken");
    process.exit(1);
  }
  for (const t of tokens) {
    if (typeof t === "string") console.error(`FAIL ${t}`);
    else console.error(t.extra ? `FAIL ${t.token} ${t.extra}` : `FAIL ${t.token}`);
  }
  process.exit(1);
}
