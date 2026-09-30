import { useState } from 'react'
import type { LectureDeliveryAction } from './learningService'

interface DriveRecordingFrameProps {
  action: LectureDeliveryAction
  title: string
}

export function DriveRecordingFrame({ action, title }: DriveRecordingFrameProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="learning-drive-player">
      <button
        className="button button-small"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Hide recording' : action.label}
      </button>
      {open && (
        <div className="learning-drive-frame" role="region" aria-label={`${title} recording`}>
          <iframe
            src={action.actionUrl}
            title={`${title} recording`}
            allow="autoplay; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  )
}
