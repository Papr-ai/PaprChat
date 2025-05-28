/**
 * Papr Memory SDK Usage Examples
 *
 * This file provides examples of how to use the Papr Memory SDK in the v0 application.
 */

import {
  initPaprMemory,
  type MemoryAddParams,
  type MemorySearchParams,
} from './index';

// Base API URL for all calls
const API_BASE_URL = 'https://memory.papr.ai';

// Example 1: Initialize the SDK
const initializeSDK = () => {
  // Get API key from environment variable
  const apiKey = process.env.PAPR_MEMORY_API_KEY;

  if (!apiKey) {
    throw new Error('PAPR_MEMORY_API_KEY environment variable is not set');
  }

  // Initialize the SDK with the API key and base URL
  const paprClient = initPaprMemory(apiKey, {
    baseURL: API_BASE_URL,
  });

  return paprClient;
};

/**
 * Example: Create a new Papr user
 * This demonstrates how to create a Papr user when a new user signs up for your application
 * @param appUserId The user's ID in your application
 * @param email The user's email
 * @returns Papr user ID for memory operations
 */
const createPaprUserExample = async (
  appUserId: string,
  email: string,
): Promise<string> => {
  console.log(`Creating Papr user for application user: ${appUserId}`);
  const paprClient = initializeSDK();

  try {
    // Use the SDK's user.create method to create a Papr user
    const userResponse = await paprClient.user.create({
      external_id: `PaprChat-user-${appUserId}`, // Use a consistent external ID based on your app's user ID
      email: email, // User's email
      metadata: {
        source: 'PaprChat',
        app_user_id: appUserId, // Store the application's user ID in metadata
      },
    });

    // Extract the Papr user ID from the response
    if (userResponse?.user_id) {
      const paprUserId = userResponse.user_id;
      console.log(`Created Papr Memory user with ID: ${paprUserId}`);

      // In a real app, you would store this Papr user ID in your user database
      // associated with the application user

      return paprUserId;
    } else {
      console.error(
        'Failed to create Papr Memory user - no user_id in response',
      );
      throw new Error('No user_id in Papr response');
    }
  } catch (error) {
    console.error('Error creating Papr Memory user:', error);
    throw error;
  }
};

// Example: Add a memory using the SDK approach
const addMemoryExample = async (paprUserId: string, content: string) => {
  const paprClient = initializeSDK();

  const memoryParams: MemoryAddParams = {
    content,
    type: 'text',
    metadata: {
      source: 'v0-app',
      user_id: paprUserId, // Use the Papr-generated user ID
      tags: ['test', 'v0', 'example'],
    },
  };

  try {
    const response = await paprClient.memory.add(memoryParams);
    console.log(`Memory added successfully for Papr user ID: ${paprUserId}`);
    return response;
  } catch (error) {
    console.error('Error adding memory:', error);
    throw error;
  }
};

// Example: Search for memories
const searchMemoriesExample = async (paprUserId: string, query: string) => {
  const paprClient = initializeSDK();

  const searchParams: MemorySearchParams = {
    query,
    max_memories: 5,
    user_id: paprUserId, // Use the Papr-generated user ID for filtering
  };

  try {
    const response = await paprClient.memory.search(searchParams);
    console.log(`Search results for Papr user ID: ${paprUserId}`);
    return response;
  } catch (error) {
    console.error('Error searching memories:', error);
    throw error;
  }
};

// Example: Update a memory
const updateMemoryExample = async (memoryId: string, newContent: string) => {
  const paprClient = initializeSDK();

  try {
    const response = await paprClient.memory.update(memoryId, {
      content: newContent,
    });
    console.log('Memory updated successfully:', response);
    return response;
  } catch (error) {
    console.error('Error updating memory:', error);
    throw error;
  }
};

// Example: Delete a memory
const deleteMemoryExample = async (memoryId: string) => {
  const paprClient = initializeSDK();

  try {
    const response = await paprClient.memory.delete(memoryId);
    console.log('Memory deleted successfully:', response);
    return response;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
};

/**
 * Example usage with complete flow
 */
const completeExample = async () => {
  // Step 1: Application user signs up or logs in
  const appUserId = 'auth0|123456789';
  const userEmail = 'user@example.com';

  // Step 2: Create a Papr user ID for this application user
  const paprUserId = await createPaprUserExample(appUserId, userEmail);

  // Step 3: Store a memory for this user
  const memoryContent = 'This is a test memory from the complete example';
  await addMemoryExample(paprUserId, memoryContent);

  // Step 4: Search for memories for this user
  const searchResults = await searchMemoriesExample(paprUserId, 'test memory');

  return {
    appUserId,
    paprUserId,
    searchResults,
  };
};

export {
  initializeSDK,
  createPaprUserExample,
  addMemoryExample,
  searchMemoriesExample,
  updateMemoryExample,
  deleteMemoryExample,
  completeExample,
};
