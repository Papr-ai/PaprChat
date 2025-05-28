# Papr Chat

<a href="https://platform.papr.ai/papr-chat-template">
  <img alt="An open-source AI chatbot with memory capabilities powered by Papr and built on Next.js 14." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Papr Chat</h1>
</a>

<p align="center">
    Papr Chat is an open-source AI chatbot with built-in memory capabilities, powered by Papr. Built on Next.js 14 and based on Vercel's AI chatbot template, Papr Chat demonstrates how to build powerful, context-aware chatbot applications that remember past conversations.
</p>

<p align="center">
  <a href="https://platform.papr.ai/papr-chat-template"><strong>Documentation</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- **Memory-Powered Chat**
  - Long-term memory for personalized chat experiences powered by [Papr](https://platform.papr.ai)
  - Automatic storage and retrieval of relevant conversations
  - RAG (Retrieval-Augmented Generation) capabilities
  - Semantic search across conversation history
  - Persistent memory storage in the cloud

- **Modern Tech Stack**
  - Built with [Next.js 14](https://nextjs.org) App Router
  - [AI SDK](https://sdk.vercel.ai/docs) for unified LLM interactions
  - Beautiful UI with [shadcn/ui](https://ui.shadcn.com) and [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com)

- **Production Ready**
  - [Neon Serverless Postgres](https://neon.tech) for chat history
  - [Vercel Blob](https://vercel.com/storage/blob) for file storage
  - [Auth.js](https://authjs.dev) for authentication
  - Easy deployment to Vercel

## About Papr Chat

Papr Chat is maintained by [Papr](https://platform.papr.ai) and builds upon [Vercel's V0 chatbot](https://github.com/vercel/ai-chatbot). We've enhanced the original template with our memory SDK to create chatbots that can maintain context across conversations and provide truly personalized experiences.

The key enhancement is the integration of Papr's Memory SDK, which allows your chatbot to:
- Remember past conversations and user preferences
- Retrieve relevant context automatically
- Build a knowledge base from chat interactions
- Provide more consistent and personalized responses

## Model Providers

Papr Chat ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model, but supports multiple providers through the [AI SDK](https://sdk.vercel.ai/docs). You can easily switch to:
- [OpenAI](https://openai.com)
- [Anthropic](https://anthropic.com)
- [Cohere](https://cohere.com/)
- [And many more](https://sdk.vercel.ai/providers/ai-sdk-providers)

## Deploy Your Own

You can deploy Papr Chat to Vercel with one click. Here's what you'll need:

1. A [Papr](https://app.papr.ai) account for the memory features
2. A database (can set up Neon automatically via Vercel)
3. An AI provider API key (xAI, OpenAI, Anthropic, etc.)

Click the button below to clone and deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpapr%2Fchat&env=PAPR_MEMORY_API_KEY,AUTH_SECRET,OPENAI_API_KEY&envDescription=API%20keys%20needed%20to%20run%20Papr%20Chat&envLink=https%3A%2F%2Fdocs.papr.ai%2Fchat%2Fdeployment&project-name=papr-chat&repository-name=papr-chat&demo-title=Papr%20Chat&demo-description=Open-Source%20AI%20Chatbot%20with%20Memory%20by%20Papr&demo-url=https%3A%2F%2Fchat.papr.ai&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6)

### What Happens When You Deploy

1. Your GitHub repository will be cloned
2. Vercel will create a new project and deploy it
3. A Neon PostgreSQL database will be automatically provisioned
4. Vercel Blob Storage will be set up for file uploads
5. You'll be prompted to add the required environment variables:
   - `PAPR_MEMORY_API_KEY`: Get this from [Papr Dashboard](https://app.papr.ai/) -> Settings -> API Key
   - `AUTH_SECRET`: A random string for authentication (we'll generate one for you)
   - `OPENAI_API_KEY`: Your OpenAI API key (or another provider's key)

### After Deployment

1. Your app will be live at `your-project.vercel.app`
2. Set up authentication in the Vercel dashboard
3. Configure your AI provider settings in `config/ai.ts`
4. Optionally customize the chat interface in `components/`

For detailed setup instructions and customization options, visit our [deployment guide](https://platform.papr.ai/chat/papr-chat-template).

## Running locally

### Prerequisites

1. Get your Papr API key:
   - Sign up at [app.papr.ai](https://app.papr.ai)
   - Go to Settings → API Keys
   - Create a new API key

2. Set up your environment variables in `.env.local`:

```bash
# Authentication (required)
AUTH_SECRET=your_auth_secret_key

# Database (required)
POSTGRES_URL=your_neon_postgres_url

# File Storage (required)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Papr Memory (required)
PAPR_MEMORY_API_KEY=your_papr_memory_api_key

# AI Provider (one is required)
XAI_API_KEY=your_xai_api_key
# OR
OPENAI_API_KEY=your_openai_api_key
# OR another provider
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Papr-ai/PaprChat 
cd chat
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

Visit [localhost:3000](http://localhost:3000) to see your chatbot in action.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Papr Chat is open-source software licensed under the MIT license.

## Support

- Documentation: [platform.papr.ai/papr-chat-template](platform.papr.ai/papr-chat-template)
- Discord: [Join our community](https://discord.gg/tGzshWDg)
- Issues: [GitHub Issues](https://github.com/papr/chat/issues)
