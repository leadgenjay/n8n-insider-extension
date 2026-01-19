import { X, Play, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LOOM_VIDEO_ID = 'e4b2d8d73ed64182b53c5217a41e5e81'
const SETUP_VIDEO_URL = `https://www.loom.com/share/${LOOM_VIDEO_ID}`

interface WelcomeModalProps {
  onClose: () => void
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Video embed */}
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.loom.com/embed/${LOOM_VIDEO_ID}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
            frameBorder="0"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-bold mb-2">Welcome to N8N Insider!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Watch this quick setup guide to get started with your AI copilot for n8n workflows.
          </p>

          <div className="flex gap-3">
            <Button onClick={onClose} className="flex-1">
              Get Started
            </Button>
            <a
              href={SETUP_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              <Play className="w-4 h-4" />
              Open in Loom
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
