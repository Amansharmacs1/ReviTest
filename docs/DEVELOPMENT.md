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

---

## 6. Multi-Tenant Testing & RBAC Verification Rules

When developing endpoints for organization workspaces:
1. **Never Trust Client Tenant Identifiers**: Always derive the tenant context from `req.user.organizationId` on the backend.
2. **Always Verify Cross-Tenant Isolation**: Ensure that testing includes requests from Organization A attempting to read or mutate Organization B's records, asserting HTTP 404 or 403.
3. **Always Verify Role Boundaries**: Ensure candidate roles cannot access admin routes (`/api/organization/*` and `/api/platform/*`).
4. **Prevent Self-Lockout**: Never allow administrators to change their own role or deactivate their own account.
5. **Protect Sensitive Fields**: Ensure `.select('-password -tokenVersion')` is applied on all user queries.
6. **Log All State Transitions**: Ensure `logAuditEvent` is called on all status updates, creations, and profile modifications.

---

## 7. Phase 4 Assessment Authoring & Snapshot Rules

1. **Server-Side Marks Authority**: Never trust client-submitted question marks, section marks, or exam totals. Always recalculate using `validateExam`.
2. **Strict Question Type Enforcement**: Always validate options against the question type:
   - `MCQ_SINGLE`: >= 2 options, exactly 1 `isCorrect`.
   - `MCQ_MULTIPLE`: >= 2 options, >= 1 `isCorrect`.
   - `TRUE_FALSE`: Exactly 2 options ("True", "False"), exactly 1 `isCorrect`.
   - `DESCRIPTIVE`: 0 options.
3. **Published Exam Immutability**: Any modification or deletion attempt on a `PUBLISHED` exam must return HTTP 400 Bad Request. Modifying questions in the question bank must never alter already published exam snapshots.
4. **Confidentiality**: Always strip `evaluationGuidance` from candidate queries.


