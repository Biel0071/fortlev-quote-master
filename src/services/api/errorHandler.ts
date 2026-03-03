export class ApiServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "ApiServiceError";
  }
}

export function withServiceError<T>(fn: () => Promise<T>, context: string) {
  return fn().catch((error) => {
    throw new ApiServiceError(`Falha em ${context}`, error);
  });
}
