# Frontend Dependencies Specification

Every single dependency used in `frontend/` is explicitly documented here along with the justification for its inclusion.

## Production Dependencies

- `react`: Core declarative component rendering engine (v19).
- `react-dom`: DOM renderer for React web application.
- `@tanstack/react-query`: Server state management, automatic background refetching, request deduplication, and cache synchronization for live audit logs and pending approvals.
- `lucide-react`: Lightweight, tree-shakeable SVG icon set for terminal cockpit indicators, severity levels, and power-user actions.
- `clsx`: Tiny utility (228B) for conditionally constructing CSS class strings based on component state.
- `tailwind-merge`: Resolves Tailwind class precedence and conflicts cleanly in dynamic reusable components.

## Development & Build Dependencies

- `vite`: Fast next-generation frontend development server and ES module bundler.
- `@vitejs/plugin-react`: Official Vite plugin for React fast refresh and JSX transformation.
- `typescript`: Static type checking for robust API client integration, state safety, and error prevention.
- `@types/react`: TypeScript definitions for React.
- `@types/react-dom`: TypeScript definitions for ReactDOM.
- `@types/node`: TypeScript definitions for Node.js APIs used in Vite config.
- `tailwindcss`: Utility-first CSS framework providing deterministic, atomic styles and design token constraints.
- `postcss`: CSS transformation tool required by Tailwind CSS.
- `autoprefixer`: Vendor prefixing for cross-browser CSS compatibility.
- `vitest`: Fast, Vite-native unit and component test runner.
- `@testing-library/react`: Standard React component testing utilities for user-centric interaction tests.
- `@testing-library/jest-dom`: Custom jest-dom matchers for asserting DOM states in component tests.
- `jsdom`: Browser DOM environment simulation for headless Vitest runs.
