import type { LectureDeliveryAction } from './learningService'

interface DriveRecordingFrameProps {
  action: LectureDeliveryAction
  title: string
}

export function DriveRecordingFrame({ action, title }: DriveRecordingFrameProps) {
  return (
    <div className="learning-drive-player" role="region" aria-label={`${title} recording`}>
      <iframe
        src={action.actionUrl}
        title={`${title} recording`}
        loading="lazy"
        allow="autoplay; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
