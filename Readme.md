# Remember My Block

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Logseq](https://logseq.com) plugin that reopens pages at the block you last edited, instead of at the top.

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

- Listens for `focusout` events on block editors to detect when you leave a block
- Saves the last-edited block UUID per page
- When you navigate to a page, automatically opens that block for editing right where you left off

### Journal pages

Journal pages have partial support due to Logseq API limitations:

- **Specific journal page** (navigated by clicking a date link): position is restored normally.
- **Main Journals view** (the default multi-date scroll): Logseq does not expose which journal page is active, so the plugin restores the most recently edited block across *all* pages. In practice this is usually today's journal entry.

### Storage

The plugin remembers the last edited block for up to 50 pages. When you edit a block on a page already in the history, its entry is updated in place. When a new page is added and the limit is reached, the least recently edited page is evicted.

> **Note:** The 50-page limit is currently in place to observe Logseq performance and may change.

---

## Development

**Prerequisites:** Node.js, pnpm

```sh
pnpm install      # install dependencies
pnpm dev          # start dev server with hot reload
pnpm build        # build for development
pnpm prod         # build for production
```

Releases are automated via [semantic-release](https://semantic-release.gitbook.io/) and triggered manually from the GitHub Actions tab.

---

## License

MIT © [Pavol Pidanič](https://github.com/PaulNoth)
