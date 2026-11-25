import React from "react"
import { createRoot } from "react-dom/client"
import Playscape from "./PLAYSCAPE-cleaner.tsx"
import "./index.css"
import "./features/compare/compare.css"
import "./features/reviews/reviews.css"
import "./features/checkout/checkout.css"

const root = createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <Playscape />
  </React.StrictMode>
)
