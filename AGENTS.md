# Repository Guidelines

## Project Structure & Module Organization

- `index.html` bootstraps the static prototype and loads ES modules from `src/`.
- `src/` contains UI, storage, auth, and Google Calendar sync logic.
- `public/` holds the web manifest and icons for the PWA.
- `plan/shift-stamp-implementation-plan.md` is the source-of-truth for scope and rules.

## Build, Test, and Development Commands

- `npm install`: install dev dependencies.
- `npm run dev`: start Vite dev server.
- `npm run build`: build static assets into `dist/`.
- `npm run preview`: preview the production build locally.

## Coding Style & Naming Conventions

- Use 2-space indentation for CSS and JS files.
- File naming: `kebab-case` for new files, `camelCase` for variables/functions.
- Keep Google Calendar integration modules separated (e.g., `auth.js`, `gcal.js`, `sync.js`).

## Testing Guidelines

- No test framework is configured yet.
- When tests are added, specify the framework, coverage target, and naming patterns (e.g., `*.test.js`).

## Commit & Pull Request Guidelines

- There is no Git history yet; no commit message conventions are established.
- Until conventions are defined, use concise, imperative messages (e.g., `Add PWA scaffold`).
- PRs should include a brief summary, linked issues if applicable, and screenshots for UI changes.

## Security & Configuration Tips

- Store Google OAuth client IDs in local config or `localStorage` (key: `shift-client-id`); do not commit secrets.
- Use `calendarId` defaults safely (e.g., `primary`) and keep `extendedProperties.private` for app-created events.
- GitHub Pages deploys from `dist/` via `.github/workflows/deploy.yml` to `https://gennei.github.io/shift-stamp/` (after repo rename).

## Agent-Specific Instructions

- Follow `plan/shift-stamp-implementation-plan.md` for scope, shift rules, and API usage.
