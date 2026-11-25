import * as React from "react"
import { Icon } from "../Icon"

export interface GameCardProps {
  title: string
  genre?: string
  price?: number
  image?: string
  saved?: boolean
  onOpen?: () => void
  onToggleSave?: () => void
}

export function GameCard({ title, genre, price, image, saved, onOpen, onToggleSave }: GameCardProps) {
  return (
    <article className="game-card">
      {image && <button className="game-card-art" onClick={onOpen}><img src={image} alt={title} /></button>}
      <div className="game-card-body">
        <button className="game-card-title" onClick={onOpen}>{title}</button>
        {genre && <p>{genre}</p>}
        {typeof price === "number" && <span>$ {price.toFixed(2)}</span>}
      </div>
      {onToggleSave && (
        <button
          className="icon-button"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          onClick={(event) => {
            event.stopPropagation()
            onToggleSave()
          }}
        >
          <Icon name={saved ? "heart-filled" : "heart"} size={15} />
        </button>
      )}
    </article>
  )
}
