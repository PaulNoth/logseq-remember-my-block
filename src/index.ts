import '@logseq/libs' //https://plugins-doc.logseq.com/

const PLUGIN_ID = 'logseq-plugin-remeber-my-block'

const MAX_LAST_BLOCK_POSITIONS_MAP_ENTRIES = 50
const STORAGE_KEY = 'last-block-position'

type BlockMode = 'edit' | 'view'

type LastBlockPosition = {
  blockUuid: string
  pageName: string
  charOffset: number
  updatedAt: number
  mode: BlockMode
}

type LastBlockPositionMap = {
  [pageName: string]: LastBlockPosition
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 1000) {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer != null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

async function loadBlockPositions(): Promise<LastBlockPositionMap> {
  const stored = await logseq.App.getStateFromStore(STORAGE_KEY);
  if(!stored) {
    return {}
  }
  const map = JSON.parse(stored) as LastBlockPositionMap
  return map
}

async function saveBlockPositions(map: LastBlockPositionMap) {
  await logseq.App.setStateFromStore(STORAGE_KEY, JSON.stringify(map))
}

async function recordPositionForBlock(uuid: string, mode: BlockMode = 'edit') {
  const block = await logseq.Editor.getBlock(uuid)
  if (!block) return

  const page = await logseq.Editor.getPage(block.page.id)
  if (!page) return

  const pageName = page.name.toLowerCase()
  const pos: LastBlockPosition = {
    pageName,
    blockUuid: block.uuid,
    charOffset: 0,
    updatedAt: Date.now(),
    mode,
  }

  const map = await loadBlockPositions()

  if (!(pageName in map) && Object.keys(map).length >= MAX_LAST_BLOCK_POSITIONS_MAP_ENTRIES) {
    const leastRecentPageName = Object.values(map).sort((a, b) => a.updatedAt - b.updatedAt)[0].pageName
    delete map[leastRecentPageName]
  }

  map[pageName] = pos
  await saveBlockPositions(map)
}

const debouncedRecordPosition = debounce(recordPositionForBlock, 500)

function startBlockFocusTracking() {
  const editorDoc = top?.document
  if (!editorDoc) return

  editorDoc.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement
    if (!target.matches('.block-editor textarea, .block-editor [contenteditable]')) return

    const blockEl = target.closest('[blockid]')
    const uuid = blockEl?.getAttribute('blockid')
    if (uuid) debouncedRecordPosition(uuid, 'edit')
  }, true)
}

function startBlockSelectionTracking() {
  const appContainer = top?.document.getElementById('app-container')
  if (!appContainer) return

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue
      const el = mutation.target as HTMLElement
      if (!el.classList.contains('ls-block')) continue

      if (el.classList.contains('selected')) {
        const uuid = el.getAttribute('blockid')
        if (uuid) debouncedRecordPosition(uuid, 'view')
      }
    }
  })

  observer.observe(appContainer, {
    attributes: true,
    attributeFilter: ['class'],
    // attributeOldValue: true,
    subtree: true,
  })
}

async function scrollToAndSelectBlock(blockUuid: string) {
  const id = 'block-content-' + blockUuid
  const elem = top?.document.getElementById(id)
  if (elem) {
    elem.scrollIntoView({ behavior: 'smooth' })
    await logseq.Editor.selectBlock(blockUuid)
  } else {
    // Block is inside a collapsed parent — editBlock expands and scrolls
    await logseq.Editor.editBlock(blockUuid)
  }
}

async function restorePositionForCurrentPage() {
  let pageName: string | null = null;

  const page = await logseq.Editor.getCurrentPage() as { name?: string } | null
  if (page?.name) {
    pageName = page.name.toLowerCase()
  } else {
    // // Journals view: getCurrentPage() returns null because multiple pages are shown.
    // // Fall back to the route for specific journal page navigation.
    // try {
    //   const route = await (logseq.App as any).getCurrentRoute() as { page?: { name?: string } } | null
    //   pageName = route?.page?.name?.toLowerCase()
    // } catch (_) {
    // // getCurrentRoute() throws on the main journals view — fall through to most-recent restore
    // }
  }

  const map = await loadBlockPositions()
  let pos: LastBlockPosition | undefined

  if (pageName) {
    pos = map[pageName]
  } else {
    // Main journals view — no single page, restore the most recently saved position
    pos = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  if (!pos) return

  const block = await logseq.Editor.getBlock(pos.blockUuid)

  if (!block) return

  // Wait for DOM to render after the route change before attempting DOM access
  await new Promise<void>((resolve) => setTimeout(resolve, 200))

  const mode: BlockMode = pos.mode ?? 'edit'
  if (mode === 'view') {
    await scrollToAndSelectBlock(block.uuid)
  } else {
    await logseq.Editor.editBlock(block.uuid)
  }
}

const main = async () => {
  console.log(PLUGIN_ID, "initialized")

  startBlockFocusTracking()
  startBlockSelectionTracking()

  logseq.App.onRouteChanged(async () => {
    await restorePositionForCurrentPage()
  })

}


logseq.ready(main).catch(console.error)