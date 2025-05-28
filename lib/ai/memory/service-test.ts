/**
 * Test script for the PaprChat memory service
 *
 * Run this script with: npx tsx lib/ai/memory/service-test.ts
 */

import { createMemoryService } from './service';
import { initPaprMemory } from './index';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UIMessage } from 'ai';

// Load environment variables
const envFiles = [
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.development',
];

for (const file of envFiles) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`Loading environment from ${file}`);
    dotenv.config({ path: filePath });
    if (process.env.PAPR_MEMORY_API_KEY) break;
  }
}

// Get API key from environment
const apiKey = process.env.PAPR_MEMORY_API_KEY;

if (!apiKey) {
  console.error(
    '❌ Error: PAPR_MEMORY_API_KEY environment variable must be set',
  );
  process.exit(1);
}

// Force HTTPS for Azure endpoint
const API_BASE_URL =
  process.env.PAPR_MEMORY_API_URL || 'https://memory.papr.ai';

async function runServiceTest() {
  console.log('=== Testing PaprChat Memory Service ===');
  console.log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`Using API Base URL: ${API_BASE_URL}`);

  // Generate a unique ID for this test run
  const testId = `service-test-${Date.now()}`;
  console.log(`Test ID: ${testId}`);

  // Step 1: Create a test user first (mirroring what test.ts does)
  console.log('\n1. Creating a test user in Papr Memory...');
  const paprClient = initPaprMemory(apiKey || '', {
    baseURL: API_BASE_URL,
  });

  // Default userId to testId
  let userId = testId;

  try {
    // Use the SDK to create a user
    console.log(`Creating user with SDK at: ${API_BASE_URL}/v1/user`);
    const userResponse = await paprClient.user.create({
      external_id: `test-user-${testId}`,
      email: `test-${testId}@example.com`,
      metadata: {
        source: 'PaprChat-service-test',
        testId,
      },
    });

    console.log(
      'User creation response:',
      JSON.stringify(userResponse, null, 2),
    );

    // Extract user ID from response and ensure it's a string
    userId = userResponse.user_id ? userResponse.user_id : testId;
    console.log(`✅ Test user created with ID: ${userId}`);
  } catch (userError) {
    console.error('❌ Error creating user:', userError);
    console.log('Using test ID as user ID instead');
    userId = testId;
  }

  // Step 2: Create the memory service
  console.log('\n2. Creating memory service...');
  const memoryService = createMemoryService(apiKey || '');
  console.log('✅ Memory service created');

  // Create test user message with the minimal properties required by the service implementation
  // @ts-ignore - Ignoring TypeScript errors for this test script
  const testMessage: UIMessage = {
    id: `test-${Date.now()}`,
    role: 'user',
    parts: [
      `This is a test message created at ${new Date().toISOString()}. Test ID: ${testId}. Testing memory integration.`,
    ] as any[],
  };

  console.log('\n3. Storing test message in memory...');
  console.log(`Test message ID: ${testMessage.id}`);
  console.log(`Test message content: ${String(testMessage.parts[0])}`);
  console.log(`Using user ID: ${userId}`);

  // Store message in memory using the created user ID
  const storeResult = await memoryService.storeMessage(
    userId,
    'test-chat',
    testMessage,
  );

  if (storeResult) {
    console.log('✅ Test message stored successfully');
  } else {
    console.error('❌ Failed to store test message');
  }

  // Wait 5 seconds for indexing (increased from 2 seconds)
  console.log('\nWaiting 5 seconds for memory indexing...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Search for the message
  console.log('\n4. Searching for test message...');
  const searchQuery = 'test message';
  console.log(`Search query: "${searchQuery}"`);
  console.log(`Using user ID: ${userId}`);

  const memories = await memoryService.searchMemories(userId, searchQuery, 5);

  if (memories.length > 0) {
    console.log(`✅ Found ${memories.length} memories with search query`);

    // Check if our test message is in the results
    const foundTestMessage = memories.some(
      (memory) =>
        (memory.content?.includes('This is a test message') ||
          memory.text?.includes('This is a test message')) &&
        (memory.content?.includes(testId) || memory.text?.includes(testId)),
    );

    if (foundTestMessage) {
      console.log('✅ Successfully found our test message in search results');
    } else {
      console.log('⚠️ Our test message was not found in the search results');
      console.log(
        'This could be due to indexing delay. You may try again later.',
      );
    }

    // Format memories for prompt
    console.log('\n5. Formatting memories for prompt...');
    const formattedMemories = memoryService.formatMemoriesForPrompt(memories);
    console.log('✅ Memories formatted for prompt successfully');
    console.log('Formatted memories preview:');
    console.log(`${formattedMemories.slice(0, 500)}...`);
  } else {
    console.log('⚠️ No memories found with search query');
    console.log(
      'This could be due to indexing delay. You may try again later.',
    );
  }

  console.log('\n=== Memory Service Test Completed ===');
}

// Run the test and handle errors
runServiceTest().catch((error) => {
  console.error('\n❌ Error during memory service test:', error);
  process.exit(1);
});
