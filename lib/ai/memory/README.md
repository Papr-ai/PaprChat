# Papr Memory Integration for PaprChat

This module provides a comprehensive memory system for PaprChat powered by the [@papr/memory](https://memory.papr.ai/) SDK. It enables storing and retrieving user messages to enhance AI responses with relevant context from past conversations.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [How It Works](#how-it-works)
- [Integration with Chat](#integration-with-chat)
- [Technical Implementation](#technical-implementation)
- [API Usage](#api-usage)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

Papr Memory is an end-to-end RAG (Retrieval-Augmented Generation) solution that combines vector embeddings and knowledge graphs. This integration enables PaprChat to:

- Store user messages automatically
- Retrieve relevant past conversations
- Provide the AI with context across different chat sessions
- Personalize responses based on user history

When a new user signs up to the chat app, a unique Papr user ID is automatically generated and associated with their account. This is done by calling the Papr Memory SDK's user creation API, which returns a dedicated Papr user ID. This ID is stored in the application's database and used for all memory operations for that user, ensuring privacy and proper memory organization.

## Setup

### Environment Configuration

Add your Papr Memory API key to your environment:

```bash
# In .env.local (or your environment file)
PAPR_MEMORY_API_KEY=your_papr_memory_api_key
```

Without this key, memory features will be automatically disabled.

### Installation

The @papr/memory package should already be installed as a dependency. If not, install it with:

```bash
npm install @papr/memory --legacy-peer-deps
```

### Verification

To verify the integration is working:

1. Start a conversation with the chatbot
2. Check server logs for messages like:
   - "Storing user message in memory"
   - "Enhanced system prompt with user memories"
   - "Found X relevant memories"

## How It Works

### Memory Storage

When a user sends a message, it's automatically stored in Papr Memory with metadata including:
- Papr-generated User ID (not the application's user ID)
- Chat ID
- Message ID  
- Timestamp

### Memory Retrieval

When generating a response:
1. The system searches for relevant past memories based on the current message
2. The search is filtered to only retrieve memories from the current user
3. Found memories are formatted and added to the system prompt
4. The AI uses these memories to generate a more contextually relevant response

### Memory Format in Prompts

Memories are added to the system prompt in this format:

```
The user has the following relevant memories you should consider when responding:

Memory 1 [timestamp]: Content of memory

Memory 2 [timestamp]: Content of memory

...

Consider these memories when responding to the user's current request.
```

## Integration with Chat

The memory system is integrated directly into the chat flow:

1. **Automatic Storage**: All user messages are stored automatically
2. **Context Enhancement**: Relevant memories are retrieved for each new message
3. **System Prompt Augmentation**: Memories are added to the system prompt
4. **Personalized Responses**: The AI considers past interactions when generating responses

## Technical Implementation

- `lib/ai/memory/service.ts`: Core memory service for storing and retrieving memories
- `lib/ai/memory/middleware.ts`: Middleware to integrate memory into the chat flow
- `app/(chat)/api/chat/route.ts`: Integration with the chat API endpoint
- `lib/ai/memory/index.ts`: SDK initialization and type exports

## API Usage

### Initializing the SDK

```typescript
import { initPaprMemory } from '@/lib/ai/memory';

const paprClient = initPaprMemory(process.env.PAPR_MEMORY_API_KEY, {
  baseURL: 'https://memory.papr.ai', // Optional
});
```

### Creating a Papr User

When a new user signs up for your application, you should create a corresponding Papr user:

```typescript
import { initPaprMemory } from '@/lib/ai/memory';

const paprClient = initPaprMemory(process.env.PAPR_MEMORY_API_KEY);

// Create a Papr user for your application user
const userResponse = await paprClient.user.create({
  external_id: `PaprChat-user-${appUserId}`, // Use a consistent external ID based on your app's user ID
  email: userEmail, // Optional - user's email
  metadata: {
    source: 'PaprChat',
    app_user_id: appUserId, // Optional store the application's user ID in metadata
  },
});

// Extract and store the Papr user ID
if (userResponse?.user_id) {
  const paprUserId = userResponse.user_id;
  // Store this ID in your user database associated with the app user
  await db.update(user).set({ paprUserId }).where(eq(user.id, appUserId));
}
```

### Adding Memories

```typescript
import { initPaprMemory, type MemoryAddParams } from '@/lib/ai/memory';

const paprClient = initPaprMemory(process.env.PAPR_MEMORY_API_KEY);

const memoryParams: MemoryAddParams = {
  content: 'This is important information to remember',
  type: 'text',
  metadata: {
    source: 'PaprChat',
    userId: 'papr-user-123', // Papr-generated user ID, not the application's user ID
    tags: ['important', 'information']
  }
};

const response = await paprClient.memory.add(memoryParams);
```

### Searching Memories

```typescript
import { initPaprMemory, type MemorySearchParams } from '@/lib/ai/memory';

const paprClient = initPaprMemory(process.env.PAPR_MEMORY_API_KEY);

const searchParams: MemorySearchParams = {
  query: 'Find information about important topics',
  max_memories: 5,
  user_id: 'papr-user-123' // Filter by Papr-generated user ID, not the application's user ID
};

const response = await paprClient.memory.search(searchParams);
```

### Using the Memory Service

```typescript
import { createMemoryService } from '@/lib/ai/memory/service';

// Create the memory service
const memoryService = createMemoryService(process.env.PAPR_MEMORY_API_KEY || '');

// Store a message
await memoryService.storeMessage(paprUserId, chatId, message); // paprUserId is generated by Papr, not the application's user ID

// Search memories
const memories = await memoryService.searchMemories(paprUserId, query); // paprUserId is generated by Papr

// Format memories for prompts
const formattedMemories = memoryService.formatMemoriesForPrompt(memories);
```

## Advanced Configuration

You can customize the memory integration by modifying:

1. `formatMemoriesForPrompt()` in `service.ts` to change how memories appear in prompts
2. `enhancePromptWithMemories()` in `middleware.ts` to modify search parameters
3. The metadata saved with memories in `storeMessage()` in `service.ts`

For SDK configuration options:

```typescript
import { initPaprMemory, type ClientOptions } from '@/lib/ai/memory';

const options: Omit<ClientOptions, 'apiKey'> = {
  baseURL: 'https://memory.papr.ai',
  timeout: 30000, // 30 seconds
};

const paprClient = initPaprMemory(process.env.PAPR_MEMORY_API_KEY, options);
```

## Troubleshooting

### No Memories Being Found

1. Verify `PAPR_MEMORY_API_KEY` is set correctly in your environment
2. Check that users have had previous conversations to build up memories
3. Verify the memory service is connecting properly by checking logs

### Memory Not Affecting Responses

If memories are being found but not impacting responses:
1. Verify the memory formatting is correct in the system prompt
2. Ensure retrieved memories are relevant to the current conversation
3. Consider adjusting search parameters in `enhancePromptWithMemories()`

For more detailed information, see the [Papr Memory API documentation](https://platform.papr.ai/). 