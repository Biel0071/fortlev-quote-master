const TOKEN_KEY_PERSIST = "visitor_session_token_v1";
const TOKEN_KEY_TEMP = "visitor_session_token_temp_v1";

function createToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateTrackingToken(persist: boolean) {
  const key = persist ? TOKEN_KEY_PERSIST : TOKEN_KEY_TEMP;
  const store = persist ? localStorage : sessionStorage;
  const existing = store.getItem(key);
  if (existing) return existing;
  const next = createToken();
  store.setItem(key, next);
  return next;
}
