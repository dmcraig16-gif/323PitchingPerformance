// Parsing/embedding for demo videos — accepts any common YouTube URL
// shape (watch?v=, youtu.be/, shorts/, embed/, live/) and any of its
// timestamp formats, and embeds via youtube-nocookie.com.

// "90", "90s", "1m30s", "1h2m3s" -> seconds. Returns 0 for anything blank
// or unparseable rather than throwing — a bad timestamp shouldn't block
// the video from embedding at all.
function parseTimestamp(raw) {
  if (!raw) return 0
  if (/^\d+$/.test(raw)) return Number(raw)
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!match) return 0
  const [, h, m, s] = match
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)
}

// Returns { videoId, startSeconds } for any recognizable YouTube URL, or
// null if the URL doesn't look like YouTube at all — so callers can show
// "that doesn't look like a YouTube link" instead of silently embedding
// nothing.
export function parseYoutubeUrl(url) {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  let parsed
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')
  let videoId = null

  if (host === 'youtu.be') {
    videoId = parsed.pathname.split('/')[1]
  } else if (host === 'youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v')
    } else {
      const match = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)
      videoId = match?.[1] ?? null
    }
  }

  if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null

  const rawTimestamp = parsed.searchParams.get('t') ?? parsed.searchParams.get('start') ?? parsed.hash.replace(/^#t=/, '')
  return { videoId, startSeconds: parseTimestamp(rawTimestamp) }
}

export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

// youtube-nocookie.com avoids setting tracking cookies until the viewer
// actually presses play, which combined with the lazy-load pattern in
// YouTubeEmbed.jsx means a workout page never talks to YouTube at all
// unless a video is opened.
export function youtubeEmbedUrl(videoId, startSeconds = 0) {
  const params = startSeconds ? `?start=${startSeconds}` : ''
  return `https://www.youtube-nocookie.com/embed/${videoId}${params}`
}
