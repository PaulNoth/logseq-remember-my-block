# Remember My Block

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Logseq](https://logseq.com) plugin that remembers where you left off. When you reopen a page, it scrolls back to your last block — ready to edit or just to read.

---

<!-- Add a demo GIF here showing: navigate away from a page mid-edit, come back, cursor jumps back to that block -->

---

## Installation

**Via Logseq Marketplace**

1. Open Logseq → Settings → Plugins
2. Search for **Remember My Block**
3. Click Install

**Manual**

1. Download the latest release zip from the [Releases](https://github.com/PaulNoth/logseq-remember-my-block/releases) page
2. Unzip into your Logseq plugins folder
3. Enable the plugin in Logseq → Settings → Plugins

---

## How it works

- Tracks the last visited block per page
- Restores your position automatically when you navigate back to that page

### Modes

- **Edit mode**: opens the block for editing, placing the cursor at the end
- **View mode**: scrolls to the block and highlights it without entering edit — good for resuming reading

### Journal pages

Journal pages have partial support due to Logseq API limitations:

- **Specific journal page** (reached by clicking a date link): position is restored normally
- **Main Journals view**: NOT SUPPORTED — Logseq does not expose which journal page is currently active

### Storage

The plugin tracks the last visited block for up to 50 pages. Revisiting a page updates its entry in place. When the limit is reached, the least recently visited page is dropped.

> **Note:** The 50-page limit is in place to observe Logseq performance and may change.

---

## Development

**Prerequisites:** Node.js, pnpm

```sh
pnpm install      # install dependencies
pnpm dev          # start dev server with hot reload
pnpm build        # build for development
pnpm prod         # build for production
```

---

## License

MIT © [Pavol Pidanič](https://github.com/PaulNoth)