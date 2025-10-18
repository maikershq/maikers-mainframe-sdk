/**
 * Production Guard Utility
 * 
 * Centralized production environment checking to prevent mock usage
 */

export function ensureTestingOnly(service: string): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `SECURITY ERROR: ${service} can ONLY be used in unit testing environment (NODE_ENV=test). ` +
      'Mock services are not allowed in development or production. Use real services instead.'
    );
  }
}

export function wrapMockExport<T>(mockClass: T, serviceName: string): T {
  // Add runtime check when the mock is accessed
  const originalClass = mockClass as any;
  
  return new Proxy(originalClass, {
    construct(target, args) {
      ensureTestingOnly(serviceName);
      return new target(...args);
    },
    get(target, prop) {
      if (prop === 'constructor' || prop === 'prototype') {
        return target[prop];
      }
      ensureTestingOnly(serviceName);
      return target[prop];
    }
  }) as T;
}

export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTesting = () => process.env.NODE_ENV === 'test';
export const isDevelopment = () => process.env.NODE_ENV === 'development';
