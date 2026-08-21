import type { PhotoId } from '../lib/types'
import { PHOTO_LIST } from '../lib/photos'
import { Avatar } from './Avatar'

interface ProfileSheetProps {
  sentIds: Set<PhotoId>
  onClose: () => void
  onOpenPhoto: (src: string) => void
}

/** Aylin's profile: bio + photo gallery. Photos unlock as she sends them in chat. */
export function ProfileSheet({ sentIds, onClose, onOpenPhoto }: ProfileSheetProps) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <div className="sheet-head">
          <div className="sheet-avatar">
            <Avatar size={92} />
          </div>
          <h2 className="sheet-name">
            aylin <span className="sheet-age">24</span>
          </h2>
          <p className="sheet-bio">kadıköy, istanbul · gece kuşu 🌙 · buradaysan uslu değilsin</p>
          <p className="sheet-note">fotoğrafları sohbette gönderdikçe burada açılır</p>
        </div>
        <div className="gallery">
          {PHOTO_LIST.map((photo) => {
            const unlocked = sentIds.has(photo.id)
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
                {!unlocked && <span className="lock">🔒</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
