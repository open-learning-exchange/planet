/** Marks failures reported inside a provider's response rather than raised by its SDK. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}
