export interface ScopedRequestToken {
  readonly scopeKey: string;
  readonly requestId: number;
}

export interface ScopedRequestGuard {
  begin: (scopeKey: string) => ScopedRequestToken;
  invalidate: () => void;
  isCurrent: (token: ScopedRequestToken, activeScopeKey: string) => boolean;
}

/**
 * Evita que una respuesta asíncrona tardía escriba sobre un alcance distinto o
 * sobre el resultado de una solicitud más reciente.
 */
export function createScopedRequestGuard(): ScopedRequestGuard {
  let latestRequestId = 0;

  return {
    begin(scopeKey) {
      latestRequestId += 1;
      return { scopeKey, requestId: latestRequestId };
    },
    invalidate() {
      latestRequestId += 1;
    },
    isCurrent(token, activeScopeKey) {
      return token.scopeKey === activeScopeKey && token.requestId === latestRequestId;
    },
  };
}
