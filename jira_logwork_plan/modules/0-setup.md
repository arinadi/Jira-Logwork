# Module 0: Scaffolding (Setup)

- **Estimated Complexity**: S (~3 files)
- **Estimated Files**: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `src/App.tsx`, `src/index.css`
- **Key Risks**: None.

## Requirements
Setup the project foundation with Vite, React (TS), and Tailwind CSS 4.0.

## UI Structure
- Baseline layout with a container capped at `max-w-7xl`.
- Global styles for dark/light mode.

## Technical Implementation
1. Initialize Vite project.
2. Install dependencies: `tailwindcss`, `lucide-react`, `papaparse`, `date-fns`, `clsx`, `tailwind-merge`.
3. Configure `tailwind.config.ts` for clean typography and custom Atlassian brand colors.

## Testing
- [ ] `npm run dev` starts without errors.
- [ ] Tailwind utility classes are applied (verified via smoke test).
- [ ] Project folder structure follows standard patterns.
