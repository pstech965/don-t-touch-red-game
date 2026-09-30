# GitHub Pages White Screen Issue: Cause & Resolution

**Repository:** [pstech965/don-t-touch-red-game](https://github.com/pstech965/don-t-touch-red-game)  
**Live URL:** [https://pstech965.github.io/don-t-touch-red-game/](https://pstech965.github.io/don-t-touch-red-game/)  
**Status:** Resolved & Fully Functional  

---

## 1. What Was the Problem?

When navigating to the deployed GitHub Pages website, only a **blank white screen** was visible. Neither the cyberpunk game canvas nor the menus appeared, and no errors were directly shown on screen.

---

## 2. Root Cause Analysis

Investigation identified three distinct root causes leading to the white screen:

### Root Cause 1: Serving Uncompiled Source Code Instead of the Production Build
* **The Symptom:** When inspecting the live HTML, GitHub Pages was serving the repository's root `index.html`:
  ```html
  <script type="module" src="/src/main.jsx"></script>
  ```
* **The Impact:** Browsers cannot natively understand JSX syntax (`<App />`) without Vite transpiling it into standard JavaScript first.
* When the browser hit `<App />` inside `src/main.jsx`, it immediately threw a fatal syntax error (`Unexpected token '<'`) and halted JavaScript execution. Because JavaScript stopped, React never mounted to `#root`, leaving the background empty and white.

### Root Cause 2: Broken Action Versions in `deploy.yml`
* In `.github/workflows/deploy.yml`, non-existent action versions were specified:
  ```yaml
  # BROKEN CONFIGURATION
  - name: Checkout
    uses: actions/checkout@v6         # ERROR: checkout@v6 does not exist!
  - name: Setup Node
    uses: actions/setup-node@v6       # ERROR: setup-node@v6 does not exist!
  - name: Upload build
    uses: actions/upload-pages-artifact@v4  # ERROR: upload-pages-artifact@v4 does not exist!
  ```
* Furthermore, `npm ci` failed inside the GitHub Actions runner due to lockfile version discrepancies between local npm (npm 11 / Node 24) and Ubuntu runner environments.
* Because this workflow crashed on every run, the compiled React files were never published.

### Root Cause 3: Conflicting Default Deployment Workflows
* Two additional auto-generated workflows existed in `.github/workflows/`:
  - `jekyll-gh-pages.yml`
  - `static.yml`
* `static.yml` configured GitHub to upload `path: '.'` (the root repository folder). It ran concurrently with the deployment pipeline and repeatedly deployed unbundled source code over GitHub Pages.

### Root Cause 4: Browser HTTP Caching
* Even after GitHub Pages successfully deployed the new assets, the user's web browser retained the old cached HTML and 404 responses for up to 10 minutes (`max-age=600`).
* Normal refreshes continued serving the cached blank page until a hard refresh (`Ctrl + F5`) or incognito session cleared the cache.

---

## 3. How We Solved It

### Step 1: Removed Conflicting Workflow Files
Deleted the conflicting static and Jekyll workflows so that only the dedicated React workflow manages deployments:
* Deleted `.github/workflows/jekyll-gh-pages.yml`
* Deleted `.github/workflows/static.yml`

### Step 2: Fixed and Standardized `.github/workflows/deploy.yml`
Rewrote the workflow using official, stable GitHub Action versions and replaced `npm ci` with `npm install`:
```yaml
name: Deploy React App to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm install

      - name: Build React app
        run: npm run build

      - name: Deploy to gh-pages branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload build
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 3: Verified Vite Base Path
Confirmed that `vite.config.js` properly configured the repository base path so that all assets resolve correctly under the GitHub Pages subfolder:
```javascript
export default defineConfig({
  base: '/don-t-touch-red-game/',
  plugins: [react(), tailwindcss()],
})
```

### Step 4: Switched Deployment Source in GitHub Settings
Configured repository settings:
* **Settings > Pages > Build and deployment > Source**: Set to **"GitHub Actions"**.

### Step 5: Dual-Deployment Redundancy (Branch + Actions)
Added `peaceiris/actions-gh-pages@v4` to simultaneously push the compiled `dist/` folder to a clean **`gh-pages`** branch. This ensures that even if GitHub Pages is switched back to "Deploy from a branch", selecting `gh-pages` will continue to serve the fully-built site without white-screen failures.

---

## 4. Verification & Results

1. **GitHub Actions Run:** Completed with **`SUCCESS`** (Run ID: `36708756851`).
2. **Assets Check:** `index.html`, `index-*.js`, and `index-*.css` return HTTP 200 OK.
3. **DOM Check:** Verified via Chrome DevTools Protocol that the `#root` element loads 6,900+ characters of rendered React components with 0 runtime errors.
4. **Visual Confirmation:** A full-page render test confirmed the title screen, start button, difficulty toggles, audio, and high score cards are functioning properly.

---

## 5. Quick Troubleshooting for Future Updates

If you make changes to the game and push them to GitHub:
1. Wait ~45 seconds for the **Deploy React App to GitHub Pages** action to finish in the **Actions** tab.
2. If the page does not immediately reflect changes, press **`Ctrl + F5`** (Windows) or **`Cmd + Shift + R`** (Mac) to bypass the browser's 10-minute cache.
