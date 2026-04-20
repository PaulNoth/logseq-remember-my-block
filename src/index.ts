import '@logseq/libs' //https://plugins-doc.logseq.com/
import { t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { logseqModelCheck } from './logseqModelCheck'
import { settingsTemplate } from './settings'
import { loadLogseqL10n } from './translations/l10nSetup'

const MAX_LAST_BLOCK_POSITIONS_MAP_ENTRIES = 50

export const PLUGIN_ID = 'logseq-remeber-my-block'


export const consoleText = PLUGIN_ID + " :: "

// Variables (used within the same module, not exported)
let logseqVersion: string = "" // For version checking
let logseqMdModel: boolean = false // For model checking
let logseqDbGraph: boolean = false // For DB graph checking
// Exported for external reference
export const getLogseqVersion = () => logseqVersion // For version checking
export const replaceLogseqVersion = (version: string) => logseqVersion = version
export const booleanLogseqMdModel = () => logseqMdModel // For model checking
export const replaceLogseqMdModel = (mdModel: boolean) => logseqMdModel = mdModel

export const booleanDbGraph = () => logseqDbGraph // For DB graph checking
export const replaceLogseqDbGraph = (dbGraph: boolean) => logseqDbGraph = dbGraph

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
  console.log('Remember my block', 'recordPositionForBlock', 'uuid', uuid, mode)
  const block = await logseq.Editor.getBlock(uuid)
  if (!block) return

  console.log('Remember my block', 'recordPositionForBlock', 'pageId', block.page.id, mode)

  const page = await logseq.Editor.getPage(block.page.id)
  if (!page) return

  const pageName = page.name.toLowerCase()
  console.log('Remember my block', 'recordPositionForBlock', 'pageName', pageName)
  const pos: LastBlockPosition = {
    pageName,
    blockUuid: block.uuid,
    charOffset: 0,
    updatedAt: Date.now(),
    mode,
  }

  const map = await loadBlockPositions()
  console.log('Remember my block', 'recordPositionForBlock', 'map', map)

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
    //// @ts-expect-error
		// window.parent.logseq.api.select_block(blockUuid);
  } else {
    // Block is inside a collapsed parent — editBlock expands and scrolls
    await logseq.Editor.editBlock(blockUuid)
  }
}

async function restorePositionForCurrentPage() {
  let pageName: string | undefined

  const page = await logseq.Editor.getCurrentPage() as { name?: string } | null
  if (page?.name) {
    pageName = page.name.toLowerCase()
  } else {
    // Journals view: getCurrentPage() returns null because multiple pages are shown.
    // Fall back to the route for specific journal page navigation.
    try {
      const route = await (logseq.App as any).getCurrentRoute() as { page?: { name?: string } } | null
      pageName = route?.page?.name?.toLowerCase()
    } catch (_) {
      // getCurrentRoute() throws on the main journals view — fall through to most-recent restore
    }
  }

  console.log('Remember my block', 'restorePositionForCurrentPage', 'pageName', pageName)

  const map = await loadBlockPositions()
  let pos: LastBlockPosition | undefined

  if (pageName) {
    pos = map[pageName]
  } else {
    // Main journals view — no single page, restore the most recently saved position
    pos = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  console.log('Remember my block', 'restorePositionForCurrentPage', 'pos', pos)
  if (!pos) return

  const block = await logseq.Editor.getBlock(pos.blockUuid)
  console.log('Remember my block', 'restorePositionForCurrentPage', 'block', block)
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


/* main */
/**
 * Initializes the Logseq plugin by performing the following steps:
 * 1. Checks the Logseq model type (Markdown or Database) and determines the graph type.
 * 2. Loads the user's preferred language and date format for localization (L10N).
 * 3. Initializes the user settings schema based on the detected Logseq model and graph type.
 * 4. Displays the settings UI if user settings are not yet configured.
 * 5. Shows a localized success message in the Logseq UI upon successful initialization.
 *
 * @async
 * @returns {Promise<void>} A promise that resolves when initialization is complete.
 */
const main = async () => {

  // Execute Logseq model check
  const [logseqDbGraph, logseqMdModel] = await logseqModelCheck()
  /**
    * logseqMdModel===true: MD model
    + logseqMdModel===false: DB model
    + logseqMdModel===false && logseqDbGraph===false: file-based graph
    * logseqMdModel===false && logseqDbGraph===true: DB graph
    */

  // Get user setting language and set up L10N
  const { preferredLanguage, preferredDateFormat } = await loadLogseqL10n()
  // preferredLanguage: user setting language
  // preferredDateFormat: user setting date format

  // User Settings
  logseq.useSettingsSchema(settingsTemplate(logseqDbGraph, logseqMdModel)) // Initialize user settings schema
  if (!logseq.settings) setTimeout(() => logseq.showSettingsUI(), 300) // Show settings UI if not configured yet

  // end initialization



  /**
   * logseq-l10n message sample
   * translations/ja.json
   */
  logseq.UI.showMsg(t("Remember my block!!"), "success", { timeout: 6000 }) //test
  console.log(t("Remember my block!!")) // test

  startBlockFocusTracking()
  startBlockSelectionTracking()

  logseq.App.onRouteChanged(async () => {
    await restorePositionForCurrentPage()
  })

}


logseq.ready(main).catch(console.error)