/**
 * Papr Memory SDK wrapper for PaprChat
 *
 * This module provides a simplified interface to the @papr/memory SDK
 * for storing, retrieving, and managing memory in AI applications.
 *
 * IMPLEMENTATION NOTES:
 * - Always use HTTPS for the API URL (a key requirement for Azure endpoints)
 * - The SDK handles authentication with the provided API key
 */

import { Papr, type ClientOptions } from '@papr/memory';

// Import types from the memory resource
import type {
  Memory,
  AddMemory,
  AddMemoryResponse,
  ContextItem,
  MemoryMetadata,
  MemorySearchParams,
  MemoryType,
  MemoryAddParams,
  MemoryDeleteParams,
  MemoryDeleteResponse,
  MemoryUpdateParams,
  MemoryUpdateResponse,
  SearchResponse,
} from '@papr/memory/resources/memory';

// Import document types
import type {
  Document,
  DocumentUploadParams,
  DocumentUploadResponse,
} from '@papr/memory/resources/document';

// Re-export commonly used types for convenience
export type {
  Memory,
  AddMemory,
  AddMemoryResponse,
  ContextItem,
  MemoryMetadata,
  MemorySearchParams,
  MemoryType,
  MemoryAddParams,
  MemoryDeleteParams,
  MemoryDeleteResponse,
  MemoryUpdateParams,
  MemoryUpdateResponse,
  SearchResponse,
  Document,
  DocumentUploadParams,
  DocumentUploadResponse,
  ClientOptions,
};

/**
 * Initialize the Papr Memory SDK with the provided API key
 * @param apiKey - Papr Memory API key
 * @param options - Additional client options
 * @returns Initialized Papr Memory SDK client
 */
export const initPaprMemory = (
  apiKey: string,
  options?: Omit<ClientOptions, 'apiKey' | 'bearerToken'>,
) => {
  // Make sure baseURL has https:// prefix - force to https
  const baseURL = options?.baseURL || process.env.PAPR_MEMORY_API_URL;
  const secureBaseURL = baseURL
    ? baseURL.startsWith('https://')
      ? baseURL
      : `https://${baseURL.replace('http://', '')}`
    : 'https://memory.papr.ai';

  // Log the API key status and configuration
  console.log('[Memory] Initializing SDK with:');
  console.log(
    `[Memory] API Key: ${apiKey ? `********${apiKey.slice(-4)}` : 'missing'}`,
  );
  console.log(`[Memory] Base URL: ${secureBaseURL}`);
  console.log('[Memory] SDK endpoints:');
  console.log(`[Memory] - Add Memory: ${secureBaseURL}/v1/memory`);
  console.log(`[Memory] - Search Memory: ${secureBaseURL}/v1/memory/search`);

  // Custom client class that properly handles authentication
  class CustomPapr extends Papr {
    protected authHeaders(opts: any): any {
      // Common headers - the SDK expects specifically lowercase 'x-api-key'
      const commonHeaders = {
        'content-type': 'application/json',
        'accept-encoding': 'gzip',
      };

      if (this.apiKey) {
        const headers = {
          ...commonHeaders,
          'x-api-key': this.apiKey,
        };

        console.log(
          '[Memory] Using SDK standard headers:',
          JSON.stringify({
            'content-type': 'application/json',
            'x-api-key': `********${this.apiKey.slice(-4)}`,
            'accept-encoding': 'gzip',
          }),
        );
        return headers;
      } else if (this.bearerToken) {
        const headers = {
          ...commonHeaders,
          authorization: `Bearer ${this.bearerToken}`,
        };
        console.log('[Memory] Using Bearer token authentication');
        return headers;
      }

      // If neither is available, return basic headers
      console.log('[Memory] Warning: No authentication credentials available');
      return commonHeaders;
    }
  }

  // Create a properly typed options object
  const clientOptions: ClientOptions = {
    apiKey,
    // Set dummy bearer token to avoid environment var check
    // This won't be used if apiKey is provided due to our authHeaders override
    bearerToken: 'dummy-token',
    // Set the correct base URL using the secure version
    baseURL: secureBaseURL,
  };

  return new CustomPapr(clientOptions);
};

// Export the Papr class
export { Papr };

// Default export for easier imports
export default Papr;

// Export examples for easier access
export * from './example';
