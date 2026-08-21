interface PhotoViewerProps {
  src: string
  onClose: () => void
}

export function PhotoViewer({ src, onClose }: PhotoViewerProps) {
  return (
    <div className="viewer" onClick={onClose} role="dialog" aria-label="Fotoğraf">
      <img src={src} alt="" />
      <span className="viewer-hint">kapatmak için dokun</span>
    </div>
  )
}
