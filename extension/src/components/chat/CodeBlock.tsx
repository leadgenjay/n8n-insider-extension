import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'json' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group mt-2 mb-1">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors',
            copied
              ? 'bg-green-600/20 text-green-400'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="bg-gray-900 rounded-b-lg overflow-x-auto">
        <pre className="p-3 text-xs font-mono text-gray-100 whitespace-pre-wrap break-words">
          {code}
        </pre>
      </div>
    </div>
  )
}
