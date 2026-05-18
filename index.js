const PLUGIN_ID = 'logseq-plugin-remeber-my-block'

const MAX_LAST_BLOCK_POSITIONS_MAP_ENTRIES = 50
const STORAGE_KEY = 'last-block-position'

function debounce(fn, delay = 1000) {
  let timer = null
  return (...args) => {
    if (timer != null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

async function loadBlockPositions() {
  const stored = await logseq.App.getStateFromStore(STORAGE_KEY)
  if (!stored) return {}
  return JSON.parse(stored)
}

async function saveBlockPositions(map) {
  await logseq.App.setStateFromStore(STORAGE_KEY, JSON.stringify(map))
}

async function recordPositionForBlock(uuid, mode = 'edit') {
  const block = await logseq.Editor.getBlock(uuid)
  if (!block) return

  const page = await logseq.Editor.getPage(block.page.id)
  if (!page) return

  const pageName = page.name.toLowerCase()
  const pos = {
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
    const target = e.target
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
      const el = mutation.target
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
    subtree: true,
  })
}

async function scrollToAndSelectBlock(blockUuid) {
  const id = 'block-content-' + blockUuid
  const elem = top?.document.getElementById(id)
  if (elem) {
    elem.scrollIntoView({ behavior: 'smooth' })
    await logseq.Editor.selectBlock(blockUuid)
  } else {
    await logseq.Editor.editBlock(blockUuid)
  }
}

async function restorePositionForCurrentPage() {
  let pageName = null

  const page = await logseq.Editor.getCurrentPage()
  if (page?.name) {
    pageName = page.name.toLowerCase()
  }

  const map = await loadBlockPositions()
  let pos

  if (pageName) {
    pos = map[pageName]
  } else {
    pos = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  if (!pos) return

  const block = await logseq.Editor.getBlock(pos.blockUuid)
  if (!block) return

  await new Promise((resolve) => setTimeout(resolve, 200))

  const mode = pos.mode ?? 'edit'
  if (mode === 'view') {
    await scrollToAndSelectBlock(block.uuid)
  } else {
    await logseq.Editor.editBlock(block.uuid)
  }
}

const main = async () => {
  console.log(PLUGIN_ID, 'initialized')

  startBlockFocusTracking()
  startBlockSelectionTracking()

  logseq.App.onRouteChanged(async () => {
    await restorePositionForCurrentPage()
  })
}

logseq.ready(main).catch(console.error)
