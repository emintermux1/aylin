import type { PhotoId } from '../lib/types'
import { PHOTO_LIST } from '../lib/photos'
import { Avatar } from './Avatar'

interface ProfileSheetProps {
  sentIds: Set<PhotoId>
  onClose: () => void
  onOpenPhoto: (src: string) => void
}

/** Asya's profile: bio + photo gallery. Photos unlock as she sends them in chat. */
export function ProfileSheet({ sentIds, onClose, onOpenPhoto }: ProfileSheetProps) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <div className="sheet-head">
          <Avatar size={84} className="sheet-avatar" />
          <h2 className="sheet-name">asya</h2>
          <p className="sheet-bio">24 · istanbul · geceleri yazar</p>
          <p className="sheet-note">fotoğraflar o gönderdikçe açılır</p>
        </div>
        <div className="gallery">
          {PHOTO_LIST.map((photo) => {
            const unlocked = photo.id === 'ben' || sentIds.has(photo.id)
            return (
              <button
                key={photo.id}
                type="button"
                className={`gallery-item${unlocked ? '' : ' locked'}`}
                onClick={() => {
                  if (unlocked) onOpenPhoto(photo.src)
                }}
                aria-label={unlocked ? photo.alt : 'kilitli fotoğraf'}
              >
                <img src={photo.src} alt="" loading="lazy" />
                {!unlocked && <span className="lock">kilitli</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
