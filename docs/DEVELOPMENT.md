# REVITEST — Developer Setup & Coding Standards

This guide outlines setup instructions, coding conventions, architectural rules, and workflows for engineers developing on the REVITEST platform.

---

## 1. Prerequisites & Environment Setup

### Required Runtimes
- **Node.js**: v18.0.0 or higher (`node -v`)
- **npm**: v9.0.0 or higher (`npm -v`)
- **MongoDB**: Local Community Server (v6.0+) or MongoDB Atlas cluster URI

### Initial Repository Bootstrap
```bash
# Clone the repository
git clone <repo-url>
cd REVITEST

# Install all workspace dependencies (root, backend, and frontend)
npm run install:all

# Configure environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Ensure MongoDB is active on `localhost:27017` or update `MONGODB_URI` in `server/.env`.

---

## 2. Available Scripts

From the repository root:

| Command | Action |
|---|---|
| `npm run dev` | Launches both Backend (`:5000`) and Frontend (`:5173`) concurrently |
| `npm run dev:server` | Starts the Express server with Nodemon hot reloading |
| `npm run dev:client` | Starts Vite React frontend with Fast Refresh |
| `npm run build` | Builds production-optimized frontend bundle in `client/dist` |
| `npm run lint` | Runs ESLint across both server and client source directories |
| `npm run format` | Runs Prettier to auto-format all code files |

---

## 3. Backend Coding Standards

### 3.1 ECMAScript Modules (ESM)
The backend runs with `"type": "module"`. Always use standard `import` and `export` statements. Include file extensions in relative imports:
```javascript
// ✅ Correct
import { env } from './config/environment.js';
import { ApiResponse } from '../utils/apiResponse.js';

// ❌ Incorrect
const env = require('./config/environment');
```

### 3.2 Async/Await & Error Handling
Never leave asynchronous Express route handlers without error boundary protection. Always wrap controller functions with `asyncHandler`:
```javascript
// ✅ Correct
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getResource = asyncHandler(async (req, res) => {
  const data = await myService.fetch();
  return ApiResponse.success(res, { data });
});
```

### 3.3 Consistent API Response Contracts
All API endpoints must return structured JSON envelopes conforming to `ApiResponse`:
```javascript
// Success format
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": { ... }
}

// Error format
{
  "success": false,
  "message": "Validation failed",
  "errors": [ ... ]
}
```

### 3.4 Separation of Concerns
1. **Routes (`/routes`)**: Only declare route paths, attach middleware, and link to controllers.
2. **Controllers (`/controllers`)**: Parse incoming request data, validate parameters, invoke services, and return `ApiResponse`.
3. **Services (`/services`)**: Contain all business logic, calculations, and transactional database interactions.
4. **Models (`/models`)**: Define Mongoose schemas, indexes, hooks, and static query helpers.

---

## 4. Frontend Coding Standards

### 4.1 Component Modularity
- Place atomic, reusable UI elements in `src/components/common/` (`Button`, `Card`, `Badge`).
- Place layout-wide framing in `src/components/layout/` (`Navbar`, `Footer`, `MainLayout`).
- Place page-level views in `src/pages/` (`HomePage`, `NotFoundPage`).

### 4.2 Centralized HTTP Calls
Never call `fetch` or bare `axios` directly inside React components. All network requests must flow through domain services located in `src/services/` that utilize the preconfigured `apiClient`.

### 4.3 Design Tokens & Styling
Stick strictly to Tailwind utility classes mapped to the REVITEST theme palette:
- Navy: `bg-navy`, `text-navy`
- Brand Primary: `bg-brand-primary`, `text-brand-primary`
- Electric Blue: `text-brand-electric`
- Surface: `bg-surface-bg`, `text-surface-text`

Avoid arbitrary inline styles (`style={{ color: '#0B1220' }}`).

---

## 5. Branching & Commit Conventions

### Branch Naming
- `feature/phase-X-feature-name`
- `fix/issue-description`
- `chore/tooling-or-dependencies`

### Commit Messages
Follow Conventional Commits:
- `feat: implement user registration controller`
- `fix: correct mongodb connection retry timeout`
- `docs: update architecture concurrency notes`
- `refactor: extract status badge to common component`

