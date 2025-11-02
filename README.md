# MCP Client Frontend

A modern Next.js 14 frontend for the MCP (Model Context Protocol) Client, built with Test-Driven Development.

## Features

- 🎯 **Test-Driven Development** - 69 passing tests with Vitest + React Testing Library
- 💬 **AI Chat Interface** - Vercel AI SDK for streaming responses
- 📊 **Real-Time Dashboard** - Server-Sent Events for live stats and activity
- ⚙️ **Settings Management** - API key storage with Zustand persistence
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- 📡 **API Client** - Axios for reliable HTTP requests
- 🔄 **Data Fetching** - TanStack Query for caching and state management

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React + shadcn/ui (Tailwind CSS)
- **State:** Zustand with localStorage persistence
- **Data Fetching:** TanStack Query (React Query)
- **AI Chat:** Vercel AI SDK React hooks
- **Real-time:** Server-Sent Events (SSE)
- **HTTP Client:** Axios
- **Testing:** Vitest + React Testing Library
- **TypeScript:** Strict mode

## Getting Started

### Prerequisites

- Node.js 20+ 
- Backend server running at `http://localhost:3000`
- SSE server running at `http://localhost:3000/sse`

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your backend URLs
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
# NEXT_PUBLIC_SSE_URL=http://localhost:3000
```

### Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Dashboard (home)
│   ├── chat/page.tsx        # Chat interface
│   ├── settings/page.tsx    # Settings page
│   ├── layout.tsx           # Root layout with navigation
│   ├── providers.tsx        # React Query provider
│   └── globals.css          # Global styles
├── components/
│   ├── chat/                # Chat components
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   └── ChatInput.tsx
│   ├── dashboard/           # Dashboard components
│   │   ├── StatsCard.tsx
│   │   └── ActivityFeed.tsx
│   ├── settings/            # Settings components
│   │   ├── ModelSelector.tsx
│   │   └── ApiKeyInput.tsx
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── store.ts             # Zustand state management
│   ├── api-client.ts        # Axios API client
│   ├── websocket.ts         # SSE hooks
│   ├── queries.ts           # React Query hooks
│   └── utils.ts             # Utility functions
├── types/
│   └── index.ts             # TypeScript type definitions
└── test/
    └── setup.ts             # Test configuration
```

## Testing

This project was built with Test-Driven Development (TDD). Tests cover:

- ✅ Utility functions (cn classname utility)
- ✅ API client (axios-based requests)
- ✅ State management (Zustand with persistence)
- ✅ SSE hooks (real-time data)
- ✅ React Query hooks (data fetching)
- ✅ All UI components (unit + integration tests)

```bash
# Run all tests
npm test

# Run specific test file
npm test -- lib/store.test.ts

# Run with coverage
npm run test:coverage
```

## Environment Variables

Create a `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# SSE server URL
NEXT_PUBLIC_SSE_URL=http://localhost:3000
```

## API Integration

The frontend connects to your backend API for:

- `/api/models` - Available AI models
- `/api/chat` - Streaming chat responses
- `/api/tool/call` - Execute MCP tools
- `/mcp/tools` - List MCP tools
- `/mcp/resources` - List MCP resources
- `/api/resource/read` - Read MCP resources

SSE endpoint for real-time updates:
- `/sse` - Server-sent events for stats and activity

## Configuration

### API Keys

API keys are stored securely in your browser's localStorage and never sent to the backend. Configure them in Settings:

- Anthropic API Key (for Claude models)
- OpenAI API Key (for GPT models)
- Google API Key (for Gemini models)

### Model Selection

Choose your preferred AI model in Settings. The app automatically routes requests to the correct provider based on the selected model.

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
# NEXT_PUBLIC_SSE_URL=https://your-sse-url.com
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## License

MIT

# v5-frontend
