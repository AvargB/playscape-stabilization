# PLAYSCAPE information architecture

This visual reflects the active prototype only: `src/main.tsx` mounts `src/PLAYSCAPE-cleaner.tsx`, which owns hash routing, view state, overlays, and feature composition.

Solid lines are structural shell/navigation links. Dashed lines are cross-links, actions, or derived state flows.

## Navigation and view hierarchy

```mermaid
flowchart TB
  ROOT["PLAYSCAPE prototype<br/>main.tsx → PLAYSCAPE-cleaner.tsx"]

  subgraph Shell["Global shell"]
    direction TB
    HEADER["Header / MainNavigation"]
    BRAND["playscape<br/>Playscape home"]
    PRIMARY["Main navigation<br/>Discover · Store · Wishlist (n) · Community"]
    STORENAV["Store pages subnav<br/>Store · Compare"]
    COMMUNITYNAV["Community pages subnav<br/>Community · The Web · Gaming Circles"]
    MOBILE["Mobile navigation<br/>Discover · Store · Wishlist · Community"]
    UTIL["Utilities<br/>Atmosphere · Search games · Cart · Avatar"]
    FOOTER["GlobalFooter<br/>PLAYSCAPE is a prototype."]
  end

  subgraph Routes["Primary routes / views"]
    direction TB
    DISCOVER["Discover<br/>#/discover<br/>Experience finder · results · seasons"]
    STORE["Store / Browse<br/>#/browse<br/>Catalog filters · results"]
    WISHLIST["Wishlist<br/>#/wishlist<br/>Saved games · social wishlist"]
    COMPARE["Compare<br/>#/compare<br/>Picker · table · summary"]
    COMMUNITY["Community<br/>#/community<br/>Activity filters · feed · sidebar"]
    WEB["The Web<br/>#/the-web/:personId<br/>Network canvas · controls · node panel"]
    CIRCLES["Gaming Circles<br/>#/circles/:circleId<br/>Directory · circle detail tabs"]
    PROFILE["Profile<br/>#/profile/:personId<br/>Overview · Friends · Gifts & Orders · Collections"]
  end

  subgraph Overlays["Global overlays (do not change route)"]
    direction TB
    GAMEDETAILS["GameDetails<br/>Media · reviews · game actions"]
    CHECKOUT["CheckoutDialog<br/>Review · fake payment · receipt<br/>PLAYSCAPE Prototype Checkout — No real payment will be processed."]
    SOCIAL["SocialDialog<br/>createCircle · recommend · invite<br/>privacy · circleGame · shareWishlist"]
    PERSONAL["Personalization panel<br/>Summer · Spring · Autumn · Winter"]
    TOAST["Toast<br/>social message or notice"]
  end

  ROOT --> HEADER
  ROOT --> FOOTER
  ROOT --> DISCOVER
  ROOT --> GAMEDETAILS

  HEADER --> BRAND
  HEADER --> PRIMARY
  HEADER --> STORENAV
  HEADER --> COMMUNITYNAV
  HEADER --> MOBILE
  HEADER --> UTIL

  BRAND -->|"Playscape home"| DISCOVER
  PRIMARY --> DISCOVER
  PRIMARY --> STORE
  PRIMARY --> WISHLIST
  PRIMARY --> COMMUNITY
  STORENAV --> STORE
  STORENAV --> COMPARE
  COMMUNITYNAV --> COMMUNITY
  COMMUNITYNAV --> WEB
  COMMUNITYNAV --> CIRCLES
  UTIL -->|"Search games"| DISCOVER
  UTIL -->|"Cart"| CHECKOUT
  UTIL -->|"Avatar"| PROFILE
  UTIL -->|"Atmosphere"| PERSONAL
  FOOTER -->|"Return to PLAYSCAPE home"| DISCOVER

  DISCOVER -.->|"Browse full catalog"| STORE
  DISCOVER -.->|"Your community"| COMMUNITY
  DISCOVER -.->|"Find your next group game"| CIRCLES
  DISCOVER -.->|"Explore game"| GAMEDETAILS
  STORE -.->|"Use in Discover"| DISCOVER
  STORE -.->|"Compare games"| COMPARE
  STORE -.->|"Explore game / Checkout"| GAMEDETAILS
  WISHLIST -.->|"Browse the catalog"| STORE
  WISHLIST -.->|"circles' shared wishlists"| CIRCLES
  WISHLIST -.->|"friend overlap / saved game"| PROFILE
  WISHLIST -.->|"Saved game"| GAMEDETAILS
  COMPARE -.->|"Find games to compare"| STORE
  COMPARE -.->|"View details"| GAMEDETAILS
  COMPARE -.->|"Simulated checkout"| CHECKOUT
  COMMUNITY -.->|"person / game / circle links"| PROFILE
  COMMUNITY -.->|"activity game"| GAMEDETAILS
  COMMUNITY -.->|"circle link"| CIRCLES
  COMMUNITY -.->|"Recommend a game / Create a circle"| SOCIAL
  WEB -.->|"Open profile"| PROFILE
  WEB -.->|"Open game"| GAMEDETAILS
  WEB -.->|"Recommend game"| SOCIAL
  CIRCLES -.->|"member profiles"| PROFILE
  CIRCLES -.->|"Explore in Experience Finder"| DISCOVER
  CIRCLES -.->|"Invite / recommend to circle"| SOCIAL
  PROFILE -.->|"Find them in The Web"| WEB
  PROFILE -.->|"circle cards"| CIRCLES
  PROFILE -.->|"privacy / recommend"| SOCIAL
  PROFILE -.->|"review game title"| GAMEDETAILS
  GAMEDETAILS -.->|"Purchase / gift"| CHECKOUT
  GAMEDETAILS -.->|"Recommend / circle wishlist"| SOCIAL
  CHECKOUT -.->|"View in library / recipient profile"| PROFILE
  CHECKOUT -.->|"local recipient ownership overlay"| WEB
  CHECKOUT -.->|"Return to store"| STORE
  SOCIAL -.->|"status message"| TOAST
  ROOT -.->|"notice"| TOAST

  classDef shell fill:#f7f1e8,stroke:#8b7355,color:#2b2218
  classDef route fill:#e8f2ff,stroke:#3c6e9e,color:#102b46
  classDef overlay fill:#f3ebff,stroke:#7758a6,color:#241738
  classDef root fill:#eef6f2,stroke:#4b8d78,color:#123027

  class ROOT root
  class HEADER,BRAND,PRIMARY,STORENAV,COMMUNITYNAV,MOBILE,UTIL,FOOTER shell
  class DISCOVER,STORE,WISHLIST,COMPARE,COMMUNITY,WEB,CIRCLES,PROFILE route
  class GAMEDETAILS,CHECKOUT,SOCIAL,PERSONAL,TOAST overlay
```

## Route map

| Hash | View | Navigation home |
| --- | --- | --- |
| `#/discover` | Discover | Brand, main nav, footer |
| `#/browse` | Browse, displayed as `Store` | Main nav, Store pages subnav |
| `#/wishlist` | Wishlist | Main nav |
| `#/compare` | Compare | Store pages subnav |
| `#/community` | Community | Main nav, Community pages subnav |
| `#/the-web/:personId` | The Web | Community pages subnav; `webFocus` on person links |
| `#/circles/:circleId` | Gaming Circles | Community pages subnav |
| `#/profile/:personId` | Profile | Avatar and profile cross-links; not a primary nav item |

Overlays render over the current route and do not write a new hash. `#/profile/:id`, `#/circles/:id`, and `#/the-web/:id` use the suffix for the selected person or circle.

## State and data domains

```mermaid
flowchart LR
  CATALOG["Canonical catalog + media<br/>games.ts · gameMedia.ts"]
  APPSTATE["App preferences + wishlist<br/>playscape-v1"]
  COMPSTATE["Comparison selection<br/>playscape-compare-v1"]
  SOCIALSTATE["Social state, single owner<br/>playscape-social-v1 v3<br/>legacy playscape-community-v2 read-only"]
  REVIEWS["Reviews<br/>playscape-reviews-v1"]
  CHECKOUTSTATE["Checkout ledger + cart<br/>playscape-checkout-v1 · playscape-cart-v1"]
  SEED["Seed people + ownership + graph<br/>socialData.ts"]
  RESET["Scoped prototype reset<br/>prototypeReset.ts"]

  CATALOG --> DISCOVER2["Discover · Store · Compare"]
  CATALOG --> GAMEDETAILS2["GameDetails · Game cards"]
  CATALOG --> WEB2["The Web · Profile"]

  APPSTATE --> APPVIEWS["Header · Discover · Store · Wishlist · Cards · Compare"]
  COMPSTATE --> COMPARE2["Compare · GameDetails tray"]
  SOCIALSTATE --> SOCIALVIEWS["Community · Circles · The Web · Profile · SocialDialog"]
  REVIEWS --> REVIEWVIEWS["Discover · GameDetails · Compare · Profile"]
  CHECKOUTSTATE --> CHECKOUTVIEWS["CheckoutDialog · GiftHistory · Profile · Web ownership"]
  SEED --> SOCIALSTATE
  SEED --> CHECKOUTVIEWS

  RESET --> APPSTATE
  RESET --> COMPSTATE
  RESET --> SOCIALSTATE
  RESET --> REVIEWS
  RESET --> CHECKOUTSTATE

  classDef state fill:#eef6f2,stroke:#4b8d78,color:#123027
  classDef consumer fill:#e8f2ff,stroke:#3c6e9e,color:#102b46
  classDef reset fill:#fff1e8,stroke:#b06b3c,color:#3a2112

  class CATALOG,APPSTATE,COMPSTATE,SOCIALSTATE,REVIEWS,CHECKOUTSTATE,SEED state
  class DISCOVER2,GAMEDETAILS2,WEB2,APPVIEWS,COMPARE2,SOCIALVIEWS,REVIEWVIEWS,CHECKOUTVIEWS consumer
  class RESET reset
```

## Prototype boundaries

- `Store` is a display label for the `Browse` view; there is no separate `Store` route.
- The checkout ledger is the single source of truth for prototype purchases and gifts. Seeded ownership plus ledger-derived per-person ownership feed profiles and The Web.
- Gifts are accepted at creation: the recipient gains local prototype ownership, the sender does not, and no delivery or notification occurs.
- Fake payment inputs are not transmitted, persisted, or stored. Checkout always shows `PLAYSCAPE Prototype Checkout — No real payment will be processed.`
- `PLAYSCAPE is a prototype.` remains in the global footer on every route.
- Reset lives in Profile → Gifts & Orders with explicit `purchases` and `all` scopes and a confirmation step.
