# Frontend Setup

## Create Next.js App

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
# Say yes to: TypeScript, Tailwind, App Router
# Say no to: src/ directory
```

## Install Dependencies

```bash
# UI Components
npx shadcn@latest init
npx shadcn@latest add button input card select textarea scroll-area

# State & Data
npm install zustand @tanstack/react-query

# AI SDK
npm install ai @ai-sdk/react

# WebSocket
npm install socket.io-client

# Utilities
npm install clsx tailwind-merge lucide-react
```

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Home/Dashboard
│   ├── chat/
│   │   └── page.tsx          # Chat interface
│   ├── tools/
│   │   └── page.tsx          # Tool explorer
│   ├── settings/
│   │   └── page.tsx          # Settings
│   ├── layout.tsx            # Root layout
│   └── globals.css
├── components/
│   ├── chat/
│   ├── dashboard/
│   ├── settings/
│   └── ui/                   # shadcn components
├── lib/
│   ├── store.ts              # Zustand store
│   ├── api-client.ts         # Backend API client
│   ├── websocket.ts          # Socket.io client
│   └── utils.ts              # Utilities
├── types/
│   └── index.ts              # TypeScript types
├── public/
├── package.json
└── tsconfig.json
```

## Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

## Types File

Create `types/index.ts`:
```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: any;
  result?: any;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}
```

## Tailwind Config

Update `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

## Root Layout

Update `app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MCP Client - Waste Management",
  description: "AI-powered waste management operations assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## Providers

Create `app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## Test Setup

```bash
npm run dev
# Should open http://localhost:3000
```

## Next Blueprint

Read `02-CHAT-INTERFACE.md`

