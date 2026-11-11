const retryHandlers = new Set();
let activeRecovery = null;

export function registerRecoveryRetry(handler) {
  retryHandlers.add(handler);
  return () => retryHandlers.delete(handler);
}

export function retryFailedRequests(originHandler) {
  if (activeRecovery) return activeRecovery;

  const handlers = new Set(retryHandlers);
  if (originHandler) handlers.add(originHandler);
  activeRecovery = Promise.allSettled(
    [...handlers].map((handler) => Promise.resolve().then(() => handler())),
  ).finally(() => {
    activeRecovery = null;
  });
  return activeRecovery;
}
