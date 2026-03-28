import { LazyLoadImage } from "react-lazy-load-image-component"
import "react-lazy-load-image-component/src/effects/blur.css"

type Props = {
  src: string
  alt?: string
  className?: string
}

export default function OptimizedImage({ src, alt = "", className }: Props) {
  if (!src) return null

  return (
    <LazyLoadImage
      src={src}
      alt={alt}
      effect="blur"
      className={className}
      wrapperClassName={className}
    />
  )
}
