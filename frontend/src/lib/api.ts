const TOKEN_KEY = 'relay.token'
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable: session lasts until reload */
    }
    memoryToken = token
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
    memoryToken = null
  },
}

let memoryToken: string | null = null

export function currentToken() {
  return tokenStore.get() ?? memoryToken
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  form?: FormData
  signal?: AbortSignal
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = currentToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (opts.form) {
    body = opts.form
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method: opts.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }

  if (res.status === 401 && token) {
    tokenStore.clear()
    window.dispatchEvent(new Event('relay:signed-out'))
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const blobCache = new Map<string, Promise<string>>()

/** Attachments need the auth header, so they are fetched as blobs and shown via object URLs. */
export function attachmentObjectUrl(url: string): Promise<string> {
  let cached = blobCache.get(url)
  if (!cached) {
    cached = fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${currentToken() ?? ''}` } })
      .then((res) => {
        if (!res.ok) throw new ApiError(res.status, 'Could not load file')
        return res.blob()
      })
      .then((blob) => URL.createObjectURL(blob))
    cached.catch(() => blobCache.delete(url))
    blobCache.set(url, cached)
  }
  return cached
}

export function uploadFile(file: File, onProgress?: (fraction: number) => void) {
  return new Promise<import('./types').Attachment>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/attachments`)
    const token = currentToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      let data: { message?: string } | null = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* empty */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as never)
      else reject(new ApiError(xhr.status, data?.message ?? 'Upload failed'))
    }
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed. Check your connection.'))
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}
