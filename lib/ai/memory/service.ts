/**
 * Memory service for PaprChat
 *
 * This service handles storing and retrieving chat memories using the Papr Memory SDK.
 */

import { initPaprMemory } from './index';
import type { MemoryType } from './index';
import type { UIMessage } from 'ai';

/**
 * Initialize the memory service
 * @param apiKey - Papr Memory API key
 * @returns Memory service methods
 */
export function createMemoryService(apiKey: string) {
  // Initialize the Papr SDK client
  console.log(
    `[Memory DEBUG] Initializing memory service with API key: ${apiKey ? 'present' : 'missing'}`,
  );

  // Always use HTTPS for Azure endpoint - force HTTPS even if baseURL is configured with HTTP
  const baseURLInput =
    process.env.PAPR_MEMORY_API_URL || 'https://memory.papr.ai';
  // Ensure HTTPS is used
  const baseURL = baseURLInput.startsWith('https://')
    ? baseURLInput
    : `https://${baseURLInput.replace('http://', '')}`;

  console.log(`[Memory DEBUG] Using API base URL: ${baseURL}`);

  // Initialize SDK client with proper configuration
  const paprClient = initPaprMemory(apiKey, {
    baseURL,
  });

  /**
   * Store a chat message in memory
   * @param userId - User ID
   * @param chatId - Chat ID
   * @param message - The message to store
   * @returns true if stored successfully, false otherwise
   */
  const storeMessage = async (
    userId: string,
    chatId: string,
    message: UIMessage,
  ): Promise<boolean> => {
    try {
      console.log(
        `[Memory DEBUG] Attempting to store message for user ${userId} in chat ${chatId}`,
      );
      console.log(`[Memory DEBUG] Message role: ${message.role}`);

      // Only store user messages
      if (message.role !== 'user') {
        console.log('[Memory DEBUG] Skipping non-user message');
        return false;
      }

      // Extract content from message parts
      console.log(
        '[Memory DEBUG] Message parts:',
        JSON.stringify(message.parts),
      );

      const content = message.parts
        .map((part) => {
          if (typeof part === 'string') {
            return part;
          }
          // Handle complex message parts - could be objects with various properties
          if (part && typeof part === 'object') {
            console.log(
              '[Memory DEBUG] Processing complex message part:',
              JSON.stringify(part),
            );

            // Try to extract text content from different part types with type-safe checks
            if ('text' in part && part.text !== undefined) {
              return String(part.text);
            }
            if ('content' in part && part.content !== undefined) {
              return String(part.content);
            }
            // For TextUIPart
            if ('type' in part && part.type === 'text' && 'value' in part) {
              return String(part.value || '');
            }

            // Convert the whole object to string as fallback
            try {
              return JSON.stringify(part);
            } catch (e) {
              console.log('[Memory DEBUG] Could not stringify part:', e);
            }
          }
          console.log(
            '[Memory DEBUG] Unhandled message part type:',
            typeof part,
          );
          return '';
        })
        .join(' ')
        .trim();

      console.log(
        `[Memory DEBUG] Extracted content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      );

      if (!content) {
        console.log('[Memory DEBUG] Skipping empty message');
        return false; // Skip empty messages
      }

      // Prepare the memory data
      const memoryData = {
        content,
        type: 'text' as MemoryType,
        metadata: {
          source: 'PaprChat',
          user_id: userId,
          chatId,
          messageId: message.id,
          timestamp: new Date().toISOString(),
        },
      };

      console.log(
        `[Memory DEBUG] Memory data:`,
        JSON.stringify(memoryData, null, 2),
      );

      // Use SDK to store memory
      console.log(
        `[Memory DEBUG] Using SDK to store memory at ${baseURL}/v1/memory`,
      );
      const sdkResponse = await paprClient.memory.add(memoryData);
      console.log(
        '[Memory DEBUG] SDK response:',
        JSON.stringify(sdkResponse, null, 2),
      );

      if (sdkResponse && sdkResponse.code === 200 && !sdkResponse.error) {
        console.log('[Memory DEBUG] Memory stored successfully with SDK');
        return true;
      } else {
        console.error(
          '[Memory DEBUG] SDK method returned an error:',
          sdkResponse,
        );
        return false;
      }
    } catch (error) {
      console.error('[Memory DEBUG] Error storing message in memory:', error);
      return false;
    }
  };

  /**
   * Store any content in memory
   * @param userId - User ID
   * @param content - The content to store
   * @param type - Type of memory (e.g., 'text', 'document', 'assistant_message')
   * @param metadata - Additional metadata for the memory
   * @returns true if stored successfully, false otherwise
   */
  const storeContent = async (
    userId: string,
    content: string,
    type = 'text',
    metadata: Record<string, any> = {},
  ): Promise<boolean> => {
    try {
      console.log(
        `[Memory DEBUG] Storing content for user ${userId} with type ${type}`,
      );

      if (!content) {
        console.log('[Memory DEBUG] Skipping empty content');
        return false;
      }

      // Validate and ensure type is one of the allowed values
      const validTypes = ['text', 'code_snippet', 'document'];
      const validatedType = validTypes.includes(type as string) ? type : 'text';

      // Create a new metadata object instead of modifying the parameter
      const enhancedMetadata: Record<string, any> = {
        ...metadata,
      };

      // If we had to change the type, preserve the original in metadata
      if (validatedType !== type) {
        console.log(
          `[Memory DEBUG] Converting type '${type}' to '${validatedType}' for API compatibility`,
        );
        enhancedMetadata.originalType = type;
      }

      // Prepare the memory data
      const memoryData = {
        content,
        type: validatedType as MemoryType,
        metadata: {
          source: 'PaprChat',
          user_id: userId,
          timestamp: new Date().toISOString(),
          ...enhancedMetadata,
        },
      };

      console.log(
        `[Memory DEBUG] Memory data:`,
        JSON.stringify(memoryData, null, 2),
      );

      // Use SDK to store memory
      console.log(
        `[Memory DEBUG] Using SDK to store memory at ${baseURL}/v1/memory`,
      );
      const sdkResponse = await paprClient.memory.add(memoryData);
      console.log(
        '[Memory DEBUG] SDK response:',
        JSON.stringify(sdkResponse, null, 2),
      );

      if (sdkResponse && sdkResponse.code === 200 && !sdkResponse.error) {
        console.log('[Memory DEBUG] Memory stored successfully with SDK');
        return true;
      } else {
        console.error(
          '[Memory DEBUG] SDK method returned an error:',
          sdkResponse,
        );
        return false;
      }
    } catch (error) {
      console.error('[Memory DEBUG] Error storing content in memory:', error);
      return false;
    }
  };

  /**
   * Search for relevant memories
   * @param userId - User ID
   * @param query - Search query
   * @param maxResults - Maximum number of results to return
   * @returns Relevant memories
   */
  const searchMemories = async (
    userId: string,
    query: string,
    maxResults = 20, // Increased default limit
  ) => {
    try {
      // Use the SDK to search for memories - using the same format that works in test.ts
      console.log(`[Memory DEBUG] Searching for memories with SDK: "${query}"`);

      // Check if userId format matches Papr user ID format (not a UUID)
      // Papr user IDs are typically shorter and don't have hyphens
      const isPaprUserId = !userId.includes('-') && userId.length < 20;
      if (!isPaprUserId) {
        console.warn(
          `[Memory WARNING] Search is using what appears to be an app UUID (${userId}) instead of a Papr user ID. Memory search may not work correctly.`,
        );
      }

      // Create search parameters for the SDK - match test.ts format
      const searchParams = {
        query,
        max_memories: maxResults,
        user_id: userId, // Direct user_id param like in test.ts
      };

      console.log(
        `[Memory DEBUG] Search params:`,
        JSON.stringify(searchParams, null, 2),
      );

      // Use SDK method
      console.log(
        `[Memory DEBUG] Using SDK to search memories at ${baseURL}/v1/memory/search`,
      );

      try {
        const sdkResponse = await paprClient.memory.search(searchParams);
        console.log(`[Memory DEBUG] SDK search response received`);
        console.log(
          '[Memory DEBUG] Full response:',
          JSON.stringify(sdkResponse, null, 2),
        );

        // Try different possible response formats
        let memories: any[] = [];
        if (
          sdkResponse.data?.memories &&
          sdkResponse.data.memories.length > 0
        ) {
          memories = sdkResponse.data.memories;
          console.log(
            '[Memory DEBUG] Found memories in sdkResponse.data.memories',
          );
        } else if (
          sdkResponse.data?.nodes &&
          sdkResponse.data.nodes.length > 0
        ) {
          memories = sdkResponse.data.nodes;
          console.log(
            '[Memory DEBUG] Found memories in sdkResponse.data.nodes',
          );
        } else {
          console.log(
            '[Memory DEBUG] No memories found in response structure:',
            Object.keys(sdkResponse).join(', '),
            sdkResponse.data
              ? Object.keys(sdkResponse.data).join(', ')
              : 'no data',
          );
        }

        if (memories.length > 0) {
          console.log(
            `[Memory DEBUG] Found ${memories.length} memories with SDK`,
          );
        } else {
          console.log('[Memory DEBUG] No memories found with SDK');
        }

        return memories;
      } catch (sdkError: any) {
        // Log the detailed error structure for debugging
        console.log('[Memory DEBUG] SDK Error details:', {
          status: sdkError.status,
          errorObj: sdkError.error,
          errorMsg: sdkError.error?.error,
          hasMessage: !!sdkError.message,
          message: sdkError.message,
          responseText: sdkError.responseText,
          fullError: JSON.stringify(sdkError),
        });

        // Check if this is a "No relevant items found" error (HTTP 404)
        // Treat 404 as a normal condition meaning no matching memories were found
        if (sdkError.status === 404) {
          console.log(
            '[Memory DEBUG] Search result: No relevant memories found (404 response)',
          );
          return [];
        }

        // For any other error, log it and rethrow
        console.error('[Memory DEBUG] Error searching memories:', sdkError);
        throw sdkError;
      }
    } catch (error) {
      console.error('[Memory DEBUG] Error searching memories:', error);
      return [];
    }
  };

  /**
   * Format memories as a system prompt addition
   * @param memories - Array of memories
   * @returns Formatted memories as a string
   */
  const formatMemoriesForPrompt = (memories: any[]) => {
    if (!memories.length) return '';

    try {
      // First, ensure memories are properly serialized to prevent [object Object] issues
      const safeMemories = memories.map((memory) => {
        // Create a simplified memory object with only the needed properties
        return {
          content:
            typeof memory.content === 'string'
              ? memory.content
              : memory.text || JSON.stringify(memory.content || {}),
          id: memory.id || 'unknown',
          created_at:
            memory.created_at ||
            memory.metadata?.timestamp ||
            new Date().toISOString(),
          metadata: memory.metadata || {},
        };
      });

      // Extract timestamp from metadata if available
      const getTimestamp = (memory: any) => {
        try {
          if (memory.metadata?.timestamp) {
            return new Date(memory.metadata.timestamp).toLocaleString();
          }
          if (memory.created_at) {
            return new Date(memory.created_at).toLocaleString();
          }
          return 'Unknown time';
        } catch (e) {
          return 'Unknown time';
        }
      };

      // Create the formatted string with properly sanitized content
      const formattedMemories = safeMemories
        .map((memory, index) => {
          const content =
            typeof memory.content === 'string'
              ? memory.content
              : typeof memory.content === 'object'
                ? JSON.stringify(memory.content)
                : String(memory.content);
          const timestamp = getTimestamp(memory);
          return `Memory ${index + 1} [${timestamp}]: ${content}`;
        })
        .join('\n\n');

      return `
The user has the following relevant memories you should consider when responding:

${formattedMemories}

Consider these memories when responding to the user's current request. If the memories contain information relevant to the user's query, incorporate that information naturally into your response. Do not explicitly mention that you're using memories unless directly asked about your memory capabilities.
`;
    } catch (error) {
      console.error(
        '[Memory ERROR] Error formatting memories for prompt:',
        error,
      );
      // Return a safe fallback in case of any errors
      return `The user has some relevant memories that couldn't be formatted properly.`;
    }
  };

  /**
   * Get the raw response from memory search for debugging
   * @param userId - User ID
   * @param query - Search query
   * @param maxResults - Maximum number of results to return
   * @returns Raw response from the memory API
   */
  const getSearchRawResponse = async (
    userId: string,
    query: string,
    maxResults = 5,
  ) => {
    try {
      console.log(
        `[Memory DEBUG] Getting raw search response for user ID: ${userId}`,
      );

      // Create search parameters for the SDK
      const searchParams = {
        query,
        max_memories: maxResults,
        user_id: userId,
      };

      console.log(
        `[Memory DEBUG] Search params:`,
        JSON.stringify(searchParams, null, 2),
      );

      // Use SDK method
      console.log(
        `[Memory DEBUG] Using SDK to search memories at ${baseURL}/v1/memory/search`,
      );
      const sdkResponse = await paprClient.memory.search(searchParams);
      console.log(
        `[Memory DEBUG] SDK search full response:`,
        JSON.stringify(sdkResponse, null, 2),
      );
      return sdkResponse;
    } catch (error) {
      console.error('[Memory DEBUG] Error getting raw search response:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };

  /**
   * Extract memories from a raw API response
   * @param response - Raw API response
   * @returns Array of memories
   */
  const extractMemoriesFromResponse = (response: any) => {
    let memories: any[] = [];

    console.log(
      `[Memory DEBUG] Extracting memories from response with structure:`,
      Object.keys(response || {}).join(', '),
    );

    if (response?.data) {
      console.log(
        `[Memory DEBUG] Response.data structure:`,
        Object.keys(response.data || {}).join(', '),
      );
    }

    if (response.data?.memories && response.data.memories.length > 0) {
      memories = response.data.memories;
      console.log(
        `[Memory DEBUG] Found ${memories.length} memories in response.data.memories`,
      );
    } else if (response.data?.nodes && response.data.nodes.length > 0) {
      memories = response.data.nodes;
      console.log(
        `[Memory DEBUG] Found ${memories.length} memories in response.data.nodes`,
      );
    } else if (response.data?.results && response.data.results.length > 0) {
      memories = response.data.results;
      console.log(
        `[Memory DEBUG] Found ${memories.length} memories in response.data.results`,
      );
    } else if (response.results && response.results.length > 0) {
      memories = response.results;
      console.log(
        `[Memory DEBUG] Found ${memories.length} memories in response.results`,
      );
    } else if (response.nodes && response.nodes.length > 0) {
      memories = response.nodes;
      console.log(
        `[Memory DEBUG] Found ${memories.length} memories in response.nodes`,
      );
    } else {
      console.log(
        `[Memory DEBUG] No memories found in any standard response paths`,
      );
      console.log(
        `[Memory DEBUG] Full response:`,
        JSON.stringify(response, null, 2),
      );
    }

    return memories;
  };

  return {
    storeMessage,
    storeContent,
    searchMemories,
    formatMemoriesForPrompt,
    getSearchRawResponse,
    extractMemoriesFromResponse,
  };
}
