import { Download, Loader2, Mail, MessageCircle, Send, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { downloadDocument, useSendDocument, type DocumentType } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'

const LABEL: Record<DocumentType, string> = { invoice: 'Invoice', booking: 'Booking confirmation' }

/**
 * Download / Email / WhatsApp buttons for one PDF.
 * WhatsApp opens a chat with the customer and the PDF link ready to send
 * (or sends it directly when the WhatsApp Cloud API is set up on the server).
 */
export function DocumentActions({
  type,
  bookingId,
  filename,
  customerEmail,
  compact = false,
}: {
  type: DocumentType
  bookingId: number
  filename: string
  customerEmail?: string | null
  compact?: boolean
}) {
  const send = useSendDocument()
  const [downloading, setDownloading] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [email, setEmail] = useState(customerEmail ?? '')
  const busy = send.isPending ? send.variables?.channel : null

  async function download() {
    setDownloading(true)
    try {
      await downloadDocument(type, bookingId, filename)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  async function sendEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error('Enter a valid email address')
    try {
      const r = await send.mutateAsync({ type, bookingId, channel: 'email', to: email.trim() })
      setEmailOpen(false)
      if (r.previewUrl) {
        toast.success((t) => (
          <span>
            Sent to the test inbox (SMTP not set up).{' '}
            <a href={r.previewUrl} target="_blank" rel="noreferrer" className="font-semibold underline" onClick={() => toast.dismiss(t.id)}>
              View email
            </a>
          </span>
        ), { duration: 8000 })
      } else {
        toast.success(`${LABEL[type]} emailed to ${r.to}`)
      }
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function sendWhatsApp() {
    // Open the tab now so the browser doesn't block it as a pop-up after the request.
    const tab = window.open('', '_blank')
    try {
      const r = await send.mutateAsync({ type, bookingId, channel: 'whatsapp' })
      if (r.sent) {
        tab?.close()
        toast.success(`${LABEL[type]} sent on WhatsApp to ${r.to}`)
      } else if (r.whatsappUrl) {
        if (tab) tab.location.href = r.whatsappUrl
        else window.location.href = r.whatsappUrl
      }
    } catch (err) {
      tab?.close()
      toast.error(errorMessage(err))
    }
  }

  const size = compact ? 'py-1.5 px-3 text-xs' : ''
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn-secondary ${size}`} onClick={download} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
        <button type="button" className={`btn-secondary ${size}`} onClick={() => setEmailOpen((v) => !v)} aria-expanded={emailOpen}>
          <Mail className="h-4 w-4" /> Email
        </button>
        <button
          type="button"
          className={`btn ${size} border border-[#25d366]/40 bg-[#25d366]/10 text-[#128c4a] hover:bg-[#25d366]/20`}
          onClick={sendWhatsApp}
          disabled={busy === 'whatsapp'}
        >
          {busy === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          WhatsApp
        </button>
      </div>
      {emailOpen && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendEmail()}
            placeholder="customer@example.com"
            aria-label={`Email address for the ${LABEL[type].toLowerCase()}`}
            className="field flex-1 py-2"
            autoFocus
          />
          <button type="button" className="btn-primary py-2" onClick={sendEmail} disabled={busy === 'email'}>
            {busy === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
          <button type="button" className="btn-ghost" onClick={() => setEmailOpen(false)} aria-label="Cancel email">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
