import { useState } from 'react'
import { Play } from 'lucide-react'
import { youtubeThumbnailUrl, youtubeEmbedUrl } from '../lib/youtube.js'

// Lazy YouTube embed — shows a thumbnail + play button until tapped, so a
// workout with a dozen items never loads a dozen iframes at once. Only
// swaps to a youtube-nocookie.com iframe once the viewer actually wants
// to watch.
export default function YouTubeEmbed({ videoId, startSeconds = 0, title = 'Demo video' }) {
  const [playing, setPlaying] = useState(false)

  if (!videoId) return null

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900">
      {playing ? (
        <iframe
          src={youtubeEmbedUrl(videoId, startSeconds)}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group relative block w-full h-full"
          aria-label={`Play ${title}`}
        >
          <img src={youtubeThumbnailUrl(videoId)} alt="" className="w-full h-full object-cover" loading="lazy" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
            <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play size={24} className="text-neutral-900 ml-1" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
