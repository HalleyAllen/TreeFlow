# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## General Working Rules

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.
- Do not modify any Chinese comments, Chinese strings, or Chinese documentation.
- Preserve the original file encoding; handle text as UTF-8; do not introduce any garbled text.

## Commands

- `npm run install:all` - Install dependencies for root, server, and client.
- `npm run dev` - Start both backend (port 3003) and frontend dev servers concurrently.
- `npm run dev:server` - Start the Express backend only.
- `npm run dev:client` - Start the Vite frontend dev server only.
- `npm run build` - Build the production frontend bundle in `client/dist/`.
- `npm run lint` - Run ESLint on the frontend codebase (`client/`).
- `cd server && node index.js` - Run the CLI mode for text-based interaction.

## Architecture

TreeFlow is an AI对话代理系统 (AI conversation agent) with a branching dialogue tree and user-managed model tokens. It is a full-stack monorepo with a clear frontend/backend separation.

### Backend (`server/`)

The backend is an Express server (`server/server.js`) running on port 3003. It uses CORS and JSON body parsing globally.

**Dependency Injection:**
A custom `ServiceContainer` class (`server/core/container.js`) decouples routes/controllers from the core agent. `server.js` instantiates `TreeFlowAgent`, registers its internal managers into the container, and passes the container to `registerRoutes(app, container)`.

**Core Agent (`server/core/agent/TreeFlowAgent.js`):**
This is the orchestrator. It initializes and coordinates all managers:
- `TokenManager` - CRUD for API tokens and provider auto-detection.
- `ConfigManager` - Loads/saves `server/data/config.json` (current model, theme, Ollama settings, custom provider templates).
- `TopicManager` - Loads/saves `server/data/topics.json`. Each topic has a conversation tree.
- `ConversationTreeManager` - Handles tree node creation, parent-child relationships, branch logic, and conversation history reconstruction for context.
- `ApiManager` - Routes AI requests to the correct provider (OpenAI, Anthropic, Google, Aliyun, custom OpenAI-compatible APIs, or local Ollama).
- `SkillManager` - Loads `server/data/skills.json` and prepends system prompts for skill-based queries.

The `ask()` method is the primary entry point for AI requests. It creates a loading node in the tree first, reconstructs conversation history from the relevant branch, sends the request via `ApiManager`, and updates the node with the response.

**Routing & Controllers:**
Routes are defined in `server/server/routes/` (e.g., `chat.routes.js`, `topic.routes.js`, `tree.routes.js`). Controllers are in `server/server/controllers/`. The routing index (`server/server/routes/index.js`) wires all API prefixes (`/api`, `/api/topics`, `/api/tokens`, `/api/models`, `/api/providers`, `/api/ollama`, `/api/skills`, `/api/theme`, `/api/tree`).

**Data Storage:**
All state is persisted as JSON files in `server/data/`:
- `config.json` - App settings, provider templates, current model/topic.
- `topics.json` - Topic metadata and full conversation trees.
- `tokens.json` - User-configured API keys.
- `skills.json` - Predefined skill prompts.

**Middleware:**
- `responseFormatter` - Standardizes API responses.
- `errorHandler` / `notFoundHandler` - Global error handling.

### Frontend (`client/`)

The frontend is a React 18 SPA built with Vite. It runs on the Vite dev server and proxies API calls to `localhost:3003`.

**State Management:**
Global state is managed through React Context (`client/src/contexts/AppContext.jsx`). The `AppProvider` uses a single `useApp()` hook that composes smaller, domain-specific hooks:
- `useTopics` - Topic list, creation, switching, deletion.
- `useChat` - Message sending, branch mode, active end node tracking.
- `useModels` - Available models and selection.
- `useTokens` - Token list loading.
- `useSkills` - Skill selection (`/` triggered).
- `useTheme` - Light/dark theme toggle.

This hook-composition pattern avoids prop drilling while keeping logic modular.

**UI Layer:**
- `Material-UI (MUI)` is the primary component library.
- Layout: `Header` (top bar), `Sidebar` (topic list), `ChatContainer` (main content with mindmap + input), `TokenManager` (settings modal).

**Mindmap Visualization (`client/src/components/mindmap/`):**
The core visual component is `X6MindMap.jsx`, which uses `@antv/x6` to render the conversation tree.
- Layout: Main thread flows vertically; branches expand horizontally.
- Interactions: Pan (drag), zoom (scroll), node edit/copy/delete, text selection to create quote branches, minimap.
- Node positions and viewport state are persisted via `/api/tree/positions/:topicId` and `/api/tree/viewport/:topicId` APIs.

**API Services (`client/src/services/api/`):**
API calls are organized by domain (`chat.api.js`, `topic.api.js`, `tree.api.js`, etc.) and re-exported through `client/src/services/api.js`.

### Data Flow

1. User sends a message or operates on a node.
2. Frontend hook calls an API service function.
3. Express route receives the request; controller extracts the needed manager from `ServiceContainer`.
4. Controller delegates to `TreeFlowAgent` or a specific manager.
5. Manager updates in-memory state and writes to the corresponding JSON file in `server/data/`.
6. Response flows back to the frontend; React state updates and re-renders the UI.

### Key Conventions

- Backend uses CommonJS (`require`); frontend uses ESM (`import`).
- The frontend `client/package.json` sets `"type": "module"`.
- Backend data files are read/written synchronously in most managers; be aware of potential race conditions if multiple requests hit the same file.
- Conversation trees are recursive structures with `id`, `message`, `response`, `parentId`, `children[]`, and optional `branchType` (e.g., `"quote"`).
- Branch creation logic: if the parent node already has children, the new node becomes a lateral branch; if it is a leaf, it becomes the main continuation.
