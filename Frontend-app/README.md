# Dragonfly Platform Frontend

Phase 1 frontend for the Document + Hybrid Inventory Platform.

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui-inspired components
- Zustand (client state)
- TanStack React Query (server state)
- Axios (HTTP client with JWT interceptors)
- React Router v7

## Project Structure

```
src/
├── api/           # API clients (axios instance + endpoint wrappers)
├── components/    # UI components (ui/, layout/, auth/, documents/)
├── hooks/         # React Query hooks for data fetching/mutations
├── lib/           # Utilities, constants, formatters
├── routes/        # Router config, layouts, pages
├── stores/        # Zustand stores (auth, UI)
├── types/         # TypeScript types mirroring backend
```

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API calls to `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

```
VITE_API_BASE_URL=http://localhost:3000
```

## Features (Phase 1)

- Authentication (login/logout, JWT with silent refresh)
- Role-based access control
- Folder tree navigation with CRUD
- File upload with drag-and-drop and progress
- Document list with download
- Permission management UI (grant/revoke)
- Activity log viewer
- Responsive layout with collapsible sidebar
- Toast notifications
