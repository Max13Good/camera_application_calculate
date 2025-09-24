# React + Tailwind

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules. One top of the standard Vite setup, [tailwindcss](https://tailwindcss.com/) is installed and ready to be used in React components.

Additional references:
* [Getting started with Vite](https://vitejs.dev/guide/)
* [Tailwind documentation](https://tailwindcss.com/docs/installation)

## Project: Cloud Pricing & Profit Calculator (RU)

How to run locally:

- Install deps: `pnpm install` (or `npm i`)
- Dev: `pnpm dev` → open the printed URL and hard‑refresh (Ctrl/Cmd+Shift+R)
- Build: `pnpm build` → Preview: `pnpm preview`

Tooltips and links:

- Custom tooltips for the `?` help icon are implemented in `src/components/Help.tsx` and are visible on hover, focus, or click. Parent cards allow overflow so tooltips are not clipped.
- The “Источники тарифов (ссылки)” section is rendered near the top of `src/App.tsx`, right below the “Руководство по использованию”.

### Public Deploy (GitHub Pages)

This repo includes a GitHub Actions workflow that deploys the app to GitHub Pages on every push to `sandbox-sync`.

Steps:

1) In the GitHub repo Settings → Pages, set:
   - Source: "GitHub Actions"

2) Push (or re-push) to `sandbox-sync` to trigger the workflow

3) The site will be available at:
   - https://max13good.github.io/camera_application_calculate/

The Vite `base` path is configured via env (`BASE_PATH=/camera_application_calculate/`) in the workflow.

### Sync to GitHub → CodeSandbox

Use the commands below to push a fresh branch and open it in CodeSandbox. Replace `<PAT>` with your GitHub Personal Access Token if prompted.

```
git init
git add .
git commit -m "sync: latest calculator (links + tooltips + split)"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Max13Good/camera_application_calculate.git
git checkout -b sandbox-sync
git push -u origin sandbox-sync
```

Then open in CodeSandbox:

- https://codesandbox.io/p/github/Max13Good/camera_application_calculate/tree/sandbox-sync?file=/src/App.tsx

If CodeSandbox shows an old UI, click “Restart Server / Restart Sandbox” and hard‑refresh the preview (Ctrl/Cmd+Shift+R).
