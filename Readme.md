# Logseq plugin - Remember my block

Reopen pages at the block you last edited, instead of at the top.

## Journal pages

Journal pages have partial support due to Logseq API limitations:

- **Specific journal page** (navigated by clicking a date link): position is restored normally.
- **Main Journals view** (the default multi-date scroll): Logseq does not expose which journal page is active, so the plugin restores the most recently edited block across *all* pages. In practice this is usually today's journal entry.

## Storage

The plugin remembers the last edited block for up to 50 pages. When you edit a block on a page already in the history, its entry is updated in place. When a new page is added and the limit is reached, the least recently edited page is evicted.

> **Note:** The 50-page limit is currently in place to observe Logseq performance and may change.