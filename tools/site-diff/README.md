# Visual Site Difference Tool

This tool compares the local version of the blog running via your local `hugo server` against the live version on the internet (`https://chandlerc.blog`), and generates a premium visual comparison report showing any rendering differences.

## How it Works

1. The script connects to your local `hugo server` and reads its `sitemap.xml` to discover all site routes.
2. It automatically spins up a headless web browser (Playwright) to capture screenshots of all routes on both the local and live sites.
3. It uses `reg-cli` to compare the two sets of screenshots.
4. It outputs an interactive HTML report (`report.html`) with a slider interface so you can explore differences.

## Prerequisites

- **Node.js**: Make sure you have Node.js installed on your computer.
- **Hugo**: A running `hugo server` instance.

## Step-by-Step Usage Instructions

### 1. Start the Hugo Local Server

Ensure your Hugo local server is running before launching the visual diff tool:

```bash
# In the blog root directory:
hugo server -D
```

This will serve the site locally, usually at `http://localhost:1313`.

### 2. Open a New Terminal and Navigate to the Tool Directory

```bash
cd tools/site-diff
```

### 3. Install Dependencies

Use Node's package manager (`npm`) to install everything the tool needs:

```bash
npm install
```

> [!NOTE]
> This will install all the required libraries (Playwright, `reg-cli`, etc.) in a local `node_modules` directory.

### 4. Setup Browsers (First time only)

Tell Playwright to download the required browser binaries:

```bash
npm run setup
```

### 5. Run the Comparison

Now execute the visual regression tests:

```bash
npm run compare
```

## Viewing the Results

Once the comparison completes, the script outputs a link to view the report in your browser:

```text
-----------------------------------------------------------------
Visual Diff Report generated!
View Report: file:///Users/chandlerc/src/blog/tools/site-diff/report.html
-----------------------------------------------------------------
```

Open `tools/site-diff/report.html` in your favorite web browser to see the interactive visual diff report. Any rendering discrepancies will be highlighted in high-contrast red overlays, and you can use the slider to compare the local version against the live site side-by-side.
