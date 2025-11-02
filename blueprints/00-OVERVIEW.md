# Frontend Overview - MCP Client UI

## What This Is

A Next.js 14+ app that provides a chat interface for interacting with your MCP server through AI.

## Architecture

```
User → Next.js App → Backend API → MCP Server
                   ↓
              AI APIs (user's key)
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React + shadcn/ui (Tailwind)
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **AI Chat:** Vercel AI SDK React hooks
- **Real-time:** Socket.io client
- **TypeScript:** Strict mode

## Core Features

### 1. Chat Interface
- Text input for natural language queries
- Message history
- Streaming AI responses
- Tool execution visualization

### 2. Model Selector
- Dropdown to pick AI model
- User provides their own API key
- Keys stored in browser (localStorage)

### 3. Real-Time Dashboard
- Live activity feed (WebSocket)
- Stats overview
- Facility cards

### 4. MCP Tool Explorer
- Browse available tools
- Quick actions for common operations
- Visual tool execution

## Pages

```
/                  → Home / Dashboard
/chat              → Main chat interface
/tools             → Browse MCP tools
/settings          → API keys, preferences
```

## Component Structure

```
components/
├── chat/
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   ├── ChatInput.tsx
│   └── ToolCallDisplay.tsx
├── dashboard/
│   ├── StatsCard.tsx
│   ├── ActivityFeed.tsx
│   └── FacilityCard.tsx
├── settings/
│   ├── ModelSelector.tsx
│   ├── ApiKeyInput.tsx
│   └── Preferences.tsx
└── ui/
    └── (shadcn components)
```

## Next Steps

Read blueprints in order:
1. `01-SETUP.md` - Project setup
2. `02-CHAT-INTERFACE.md` - Build chat UI
3. `03-DASHBOARD.md` - Dashboard components
4. `04-STATE-MANAGEMENT.md` - Zustand store
5. `05-API-CLIENT.md` - Backend integration
6. `06-DEPLOYMENT.md` - Deploy to Vercel

