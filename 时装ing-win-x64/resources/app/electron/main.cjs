const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const API_KEY_FILE = 'shizhuang-api-key.bin'
const DEFAULT_BASE_URL = 'https://www.codex2api.com/v1'
const DEFAULT_MODEL = 'gpt-image-2'
const TRANSIENT_STATUSES = new Set([502, 503, 504, 524])
const MAX_RETRIES = 2
const imageExtensionByMime = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
])

function getApiKeyPath() {
  return path.join(app.getPath('userData'), API_KEY_FILE)
}

async function readApiKey() {
  try {
    const buffer = await fs.readFile(getApiKeyPath())
    if (!safeStorage.isEncryptionAvailable()) return ''
    return safeStorage.decryptString(buffer).trim()
  } catch {
    return ''
  }
}

async function writeApiKey(apiKey) {
  const text = String(apiKey || '').trim()
  const file = getApiKeyPath()

  if (!text) {
    await fs.rm(file, { force: true })
    return false
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统不支持 Electron safeStorage，无法安全保存 API Key')
  }

  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, safeStorage.encryptString(text))
  return true
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 820,
    useContentSize: true,
    title: '时装ing',
    backgroundColor: '#fbf9f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(String(dataUrl || ''))
  if (!match) throw new Error('输入图片不是可识别的 data URL')
  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  return { mimeType, buffer }
}

function sanitizeFilename(filename) {
  const text = String(filename || 'shizhuang-result.png').trim() || 'shizhuang-result.png'
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').slice(0, 160)
}

function ensureFilenameForDataUrl(filename, dataUrl) {
  const { mimeType } = parseDataUrl(dataUrl)
  const extension = imageExtensionByMime.get(mimeType) || 'png'
  const safe = sanitizeFilename(filename)
  const stem = safe.replace(/\.[a-z0-9]+$/i, '') || 'shizhuang-result'
  return `${stem}.${extension}`
}

async function writeDataUrlToFile(dataUrl, filePath) {
  const { buffer } = parseDataUrl(dataUrl)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, buffer)
}

function createBlobFromDataUrl(image, index) {
  const { mimeType, buffer } = parseDataUrl(image.dataUrl)
  const extension = mimeType.split('/')[1] || 'png'
  const filename = image.name || `input-${index + 1}.${extension}`
  return {
    blob: new Blob([buffer], { type: mimeType }),
    filename,
  }
}

async function getApiErrorMessage(response) {
  const prefix = `图像接口请求失败：HTTP ${response.status}`
  const text = await response.text().catch(() => '')
  if (!text) return prefix

  try {
    const payload = JSON.parse(text)
    const message = payload?.error?.message || payload?.message || payload?.detail
    if (message) return `${prefix}：${String(message)}`
  } catch {
    // Fall through to raw text.
  }

  const body = text.length > 800 ? `${text.slice(0, 800)}...` : text
  return `${prefix}：${body}`
}

function getRetryDelayMs(response, attempt) {
  const retryAfter = response?.headers.get('Retry-After')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30_000, seconds * 1000)
  }
  return Math.min(10_000, 1000 * 2 ** attempt)
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(createRequest) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await createRequest()
      if (!TRANSIENT_STATUSES.has(response.status) || attempt >= MAX_RETRIES) return response
      await response.text().catch(() => undefined)
      await sleep(getRetryDelayMs(response, attempt))
    } catch (error) {
      lastError = error
      if (attempt >= MAX_RETRIES) throw error
      await sleep(getRetryDelayMs(null, attempt))
    }
  }

  throw lastError
}

async function imageUrlToDataUrl(url, fallbackMimeType = 'image/png') {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(await getApiErrorMessage(response))
  const arrayBuffer = await response.arrayBuffer()
  const mimeType = response.headers.get('Content-Type')?.split(';')[0] || fallbackMimeType
  return `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString('base64')}`
}

async function parseImageResponse(payload) {
  const data = Array.isArray(payload?.data) ? payload.data : []
  if (!data.length) throw new Error('图像接口没有返回可识别的图片数据')

  const images = []
  for (const item of data) {
    if (typeof item?.b64_json === 'string' && item.b64_json.trim()) {
      images.push(`data:image/png;base64,${item.b64_json.trim()}`)
      continue
    }
    if (typeof item?.url === 'string' && item.url.trim()) {
      images.push(await imageUrlToDataUrl(item.url.trim()))
    }
  }

  if (!images.length) throw new Error('图像接口响应中没有 b64_json 或 url 图片结果')
  return images
}

async function generateImage(payload) {
  const apiKey = await readApiKey()
  if (!apiKey) throw new Error('请先配置 API Key')

  const prompt = String(payload?.prompt || '').trim()
  if (!prompt) throw new Error('缺少模板提示词')

  const params = payload?.params || {}
  const images = Array.isArray(payload?.images) ? payload.images : []
  const headers = { Authorization: `Bearer ${apiKey}` }

  let response
  if (images.length) {
    const formData = new FormData()
    formData.set('model', DEFAULT_MODEL)
    formData.set('prompt', prompt)
    formData.set('size', params.size || '1024x1024')
    formData.set('quality', params.quality || 'high')
    formData.set('output_format', params.output_format || 'png')

    images.forEach((image, index) => {
      const { blob, filename } = createBlobFromDataUrl(image, index)
      formData.append('image[]', blob, filename)
    })

    response = await fetchWithRetry(() => fetch(`${DEFAULT_BASE_URL}/images/edits`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
    }))
  } else {
    response = await fetchWithRetry(() => fetch(`${DEFAULT_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        size: params.size || '1024x1024',
        quality: params.quality || 'high',
        output_format: params.output_format || 'png',
        n: 1,
      }),
      cache: 'no-store',
    }))
  }

  if (!response.ok) throw new Error(await getApiErrorMessage(response))

  const rawPayload = await response.json()
  const resultImages = await parseImageResponse(rawPayload)
  return {
    images: resultImages,
    rawResponse: JSON.stringify(rawPayload, null, 2),
  }
}

async function saveDataUrl(item) {
  const dataUrl = String(item?.dataUrl || '')
  const defaultPath = path.join(app.getPath('pictures'), ensureFilenameForDataUrl(item?.filename, dataUrl))
  const result = await dialog.showSaveDialog({
    title: '保存生成结果',
    defaultPath,
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    ],
  })
  if (result.canceled || !result.filePath) return { saved: false, canceled: true }
  await writeDataUrlToFile(dataUrl, result.filePath)
  return { saved: true, filePath: result.filePath, count: 1 }
}

async function saveDataUrls(items) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.dataUrl && item?.filename) : []
  if (!safeItems.length) return { saved: false, count: 0 }
  const result = await dialog.showOpenDialog({
    title: '选择批量导出目录',
    defaultPath: app.getPath('pictures'),
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths?.[0]) return { saved: false, canceled: true }
  const directory = result.filePaths[0]
  const usedNames = new Map()
  for (const item of safeItems) {
    const filename = ensureFilenameForDataUrl(item.filename, item.dataUrl)
    const ext = path.extname(filename)
    const stem = path.basename(filename, ext)
    const count = usedNames.get(filename) || 0
    usedNames.set(filename, count + 1)
    const uniqueName = count ? `${stem}-${count + 1}${ext}` : filename
    await writeDataUrlToFile(item.dataUrl, path.join(directory, uniqueName))
  }
  return { saved: true, directory, count: safeItems.length }
}

app.whenReady().then(() => {
  ipcMain.handle('shizhuang:get-api-key-status', async () => {
    const apiKey = await readApiKey()
    return {
      configured: Boolean(apiKey),
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
    }
  })

  ipcMain.handle('shizhuang:set-api-key', async (_event, apiKey) => {
    await writeApiKey(apiKey)
    return {
      configured: Boolean(String(apiKey || '').trim()),
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
    }
  })

  ipcMain.handle('shizhuang:clear-api-key', async () => {
    await writeApiKey('')
    return {
      configured: false,
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
    }
  })

  ipcMain.handle('shizhuang:generate-image', async (_event, payload) => generateImage(payload))
  ipcMain.handle('shizhuang:save-data-url', async (_event, item) => saveDataUrl(item))
  ipcMain.handle('shizhuang:save-data-urls', async (_event, items) => saveDataUrls(items))

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
