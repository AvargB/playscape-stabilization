import { gameCatalog, type GameRecord } from "./data/games"

/**
 * Shared social entity contracts.
 *
 * These types are the canonical shapes used by sample data, persisted state,
 * feature modules, and The Web. Keep them here so every feature resolves the
 * same people, circles, recommendations, shares, and invitations.
 */
export type SocialPerson = {
  id: string
  name: string
  handle: string
  initials: string
  bio: string
  interests: string[]
  owned: number[]
  playing: number[]
  recent: number[]
  favorites: number[]
  completed: number[]
  recommends: number[]
  wishlist: number[]
  privacy: string
}

export type SocialCircle = {
  id: string
  name: string
  desc: string
  members: string[]
  wishlist: number[]
  playing: number[]
  topic: string
  joined: boolean
  initialCircleTab?: string
}

export type SocialActivity = {
  id: string
  person: string
  game: number
  category: string
  action: string
  time: string
  quote: string
  why: string
  circle: string | null
  likes: number
}

export type SocialFriendship = {
  id: string
  members: [string, string]
  status: 'friends'
}

export type SocialRecommendation = {
  id: string
  sender: string
  recipient: string
  game: number
  text: string
  createdAt: string
}

export type SocialWishlistShare = {
  id: string
  sender: string
  recipient: string
  games: number[]
  createdAt: string
}

export type InviteStatus = "pending" | "accepted" | "declined"

export type SocialInvite = {
    id: string
    circle: string
    person: string
    status: InviteStatus
}

/** A game nomination with votes from circle members. */
export type CircleGameVote = {
    id: string
    circleId: string
    gameId: number
    nominatedBy: string
    nominatedAt: string
    votes: Record<string, boolean>
}

/** A planned gaming session for a circle. */
export type CircleGamePlan = {
    id: string
    circleId: string
    gameId: number
    title: string
    scheduledAt: string
    createdBy: string
    createdAt: string
    attendees: string[]
}

/** A game recommendation made to a circle by a member. */
export type CircleGroupRecommendation = {
    id: string
    circleId: string
    gameId: number
    recommendedBy: string
    recommendedAt: string
    text: string
    savedBy: string[]
}

/** A shared gaming goal for a circle. */
export type CircleGoal = {
    id: string
    circleId: string
    title: string
    description: string
    targetGameId?: number
    targetDate?: string
    completed: boolean
    completedAt?: string
    createdBy: string
    createdAt: string
    progress: number
}

export type SocialPrivacy = {
    profile: "Public" | "Friends only" | "Private"
    wishlist: "Public" | "Friends only" | "Private"
    activity: "Public" | "Friends only" | "Private"
}

/**
 * The complete locally persisted social model. Game and person references are
 * resolved against the canonical catalog and the sample people at load time.
 */
export type SocialState = {
    circles: SocialCircle[]
    reactions: string[]
    comments: Record<string, Array<{ person: string; text: string }>>
    savedRecs: string[]
    privacy: SocialPrivacy
    sent: SocialRecommendation[]
    shares: SocialWishlistShare[]
    activity: SocialActivity[]
    discussions: Record<string, Array<{ person: string; text: string }>>
    invites: SocialInvite[]
    circleVotes: CircleGameVote[]
    circlePlans: CircleGamePlan[]
    circleGroupRecommendations: CircleGroupRecommendation[]
    circleGoals: CircleGoal[]
}

export type SocialGraphRelationship = readonly [string, string, string]

export type SocialGraphNode = {
    id: string
    name: string
    type: "You" | "Friend" | "Interest" | "Genre" | "Game" | "Circle"
    game?: number
    initials?: string
    note?: string
}

export type SocialGraph = {
    nodes: SocialGraphNode[]
    relationships: SocialGraphRelationship[]
}

export type SocialGraphOptions = {
    people?: SocialPerson[]
    circles?: SocialCircle[]
    friendships?: SocialFriendship[]
    recommendations?: SocialRecommendation[]
    shares?: SocialWishlistShare[]
    games?: GameRecord[]
}

export const socialPeople: SocialPerson[] = [
  {
    id: 'you',
    name: 'Sarah Chen',
    handle: '@sarahchen',
    initials: 'SC',
    bio: 'A little exploration, a good story, and a world worth getting lost in.',
    interests: ['Exploration', 'Cozy worlds', 'Great stories'],
    owned: [413150, 383870, 1172620, 1145360],
    playing: [1145360],
    recent: [383870, 1055540],
    favorites: [383870, 1145360],
    completed: [383870],
    recommends: [383870],
    wishlist: [],
    privacy: 'Friends only',
  },
  {
    id: 'jamie',
    name: 'Jamie Lee',
    handle: '@jamiewanders',
    initials: 'JL',
    bio: 'Taking the scenic route. Small adventures, big feelings. Usually collecting everything except the main objective.',
    interests: ['Exploration', 'Cozy worlds'],
    owned: [1055540, 413150, 1092790, 864050],
    playing: [413150],
    recent: [1055540, 1092790],
    favorites: [1055540, 413150],
    completed: [1055540],
    recommends: [1055540],
    wishlist: [972660, 383870, 105600],
    privacy: 'Public',
  },
  {
    id: 'alex',
    name: 'Alex Kim',
    handle: '@alexafterhours',
    initials: 'AK',
    bio: 'The friend who always asks for one more round. Building farms and finding a crew for the next adventure.',
    interests: ['Cozy worlds', 'Co-op adventures'],
    owned: [413150, 1172620, 105600, 1605220, 322330],
    playing: [413150, 1172620],
    recent: [413150],
    favorites: [413150, 1172620],
    completed: [],
    recommends: [413150],
    wishlist: [39210],
    privacy: 'Friends only',
  },
  {
    id: 'morgan',
    name: 'Morgan Reed',
    handle: '@morganreads',
    initials: 'MR',
    bio: 'Here for stories that stay with you long after the credits. Ask me about the ending, but no spoilers.',
    interests: ['Great stories', 'Exploration'],
    owned: [383870, 972660, 219760, 1091500, 488790, 1086940],
    playing: [972660],
    recent: [383870, 1091500],
    favorites: [383870, 972660],
    completed: [383870],
    recommends: [972660, 383870],
    wishlist: [413150, 1055540, 1200, 1092790, 650700, 1057090],
    privacy: 'Public',
  },
  {
    id: 'casey',
    name: 'Casey Harper',
    handle: '@caseyplays',
    initials: 'CH',
    bio: 'Looking for the next great challenge. I love complex systems and worlds that don’t hold your hand.',
    interests: ['Strategy', 'Hardcore adventures'],
    owned: [323190, 261550],
    playing: [323190],
    recent: [323190],
    favorites: [323190],
    completed: [],
    recommends: [323190],
    wishlist: [646570, 219760, 1086940],
    privacy: 'Public',
  },
  {
    id: 'riley',
    name: 'Riley Chen',
    handle: '@rileyretries',
    initials: 'RC',
    bio: 'Precision jumps, fast restarts, and one more run. I like games that ask me to get better.',
    interests: ['Precision platformers', 'Action roguelikes', 'Challenging combat'],
    owned: [1145360, 504230, 381210, 1030300],
    playing: [1030300],
    recent: [1145360, 381210],
    favorites: [504230, 1145360],
    completed: [504230],
    recommends: [504230],
    wishlist: [275850, 200710, 1129580, 1057090],
    privacy: 'Public',
  },
  {
    id: 'sam',
    name: 'Sam Okafor',
    handle: '@sambuilds',
    initials: 'SO',
    bio: 'Give me a cozy loop, a blank room, and a strange little toy to play with.',
    interests: ['Creative sandboxes', 'Cozy simulations', 'Relaxing puzzles'],
    owned: [1605220, 257510, 747200, 864050],
    playing: [1605220],
    recent: [747200, 864050],
    favorites: [747200, 257510],
    completed: [864050],
    recommends: [747200],
    wishlist: [600480, 105600],
    privacy: 'Public',
  },
  {
    id: 'devon',
    name: 'Devon Brooks',
    handle: '@devonexplores',
    initials: 'DB',
    bio: 'Big worlds, long journeys, and an online crew whenever the mood strikes.',
    interests: ['Cinematic worlds', 'Online adventures', 'Open worlds'],
    owned: [1200, 39210, 1091500, 1172620],
    playing: [39210],
    recent: [1200, 1091500],
    favorites: [1200, 39210],
    completed: [1200],
    recommends: [1091500],
    wishlist: [1086940],
    privacy: 'Public',
  },
]

export const initialCircles: SocialCircle[] = [
  {
    id: 'afterhours',
    name: 'The After Hours Club',
    desc: 'A small circle for winding down, discovering something new, and finding our next co-op evening.',
    members: ['you', 'jamie', 'alex', 'morgan'],
    wishlist: [413150, 1172620],
    playing: [413150],
    topic: 'Co-op · Cozy worlds',
    joined: true,
  },
  {
    id: 'scenic',
    name: 'The Scenic Route',
    desc: 'Unhurried exploration, tiny discoveries, and games where the journey is the whole point.',
    members: ['jamie', 'morgan'],
    wishlist: [1055540, 383870, 972660],
    playing: [1055540],
    topic: 'Exploration · Story-rich',
    joined: false,
  },
  {
    id: 'story',
    name: 'One More Chapter',
    desc: 'A spoiler-conscious corner for memorable characters, meaningful choices, and shared recommendations.',
    members: ['morgan', 'alex'],
    wishlist: [383870, 972660],
    playing: [972660],
    topic: 'Narrative · Adventure',
    joined: false,
  },
  {
    id: 'tactics',
    name: 'The Long Game',
    desc: 'A separate circle for strategy, systems, and games that respect your time by not holding your hand.',
    members: ['you', 'casey'],
    wishlist: [323190, 261550, 646570],
    playing: [323190],
    topic: 'Strategy · Hardcore',
    joined: true,
  },
]

/**
 * Everyone who authors sample content is a real friend in the shared social
 * model. Reviews, recommendations, The Web, profiles, and game pages all read
 * this one friendship list instead of keeping their own casts.
 */
export const directFriendIds = [
  'jamie',
  'alex',
  'morgan',
  'casey',
  'riley',
  'sam',
  'devon',
] as const

export const initialFriendships: SocialFriendship[] = [
  /* Non-you friendships mirror shared owned/wishlisted games, so friend-of-friend
     bridges in The Web stay traceable to the same canonical collections. */
  ...directFriendIds.map((personId) => ({
    id: `friendship-you-${personId}`,
    members: ['you', personId] as [string, string],
    status: 'friends' as const,
  })),
  {
    id: 'friendship-alex-morgan',
    members: ['alex', 'morgan'],
    status: 'friends',
  },
  {
    id: 'friendship-alex-sam',
    members: ['alex', 'sam'],
    status: 'friends',
  },
  {
    id: 'friendship-jamie-sam',
    members: ['jamie', 'sam'],
    status: 'friends',
  },
  {
    id: 'friendship-morgan-riley',
    members: ['morgan', 'riley'],
    status: 'friends',
  },
  {
    id: 'friendship-alex-devon',
    members: ['alex', 'devon'],
    status: 'friends',
  },
  {
    id: 'friendship-morgan-devon',
    members: ['morgan', 'devon'],
    status: 'friends',
  },
  {
    id: 'friendship-casey-devon',
    members: ['casey', 'devon'],
    status: 'friends',
  },
]

export const initialActivity: SocialActivity[] = [
  {
    id: 'a1',
    person: 'jamie',
    game: 1055540,
    category: 'Recommendations',
    action: 'has a little escape for you',
    time: '28 minutes ago',
    quote: 'If you have an hour, take the scenic route. The climb is lovely, but the little conversations along the way are the real treasure.',
    why: 'You both enjoy exploration and gentle adventures.',
    circle: 'scenic',
    likes: 8,
  },
  {
    id: 'a2',
    person: 'alex',
    game: 413150,
    category: 'Friends are playing',
    action: 'is growing something good',
    time: '1 hour ago',
    quote: 'Our farm is open tonight. There’s room for one more, and absolutely no pressure to be productive.',
    why: 'Jamie and Alex own this. Your circle is playing together.',
    circle: 'afterhours',
    likes: 12,
  },
  {
    id: 'a3',
    person: 'morgan',
    game: 972660,
    category: 'Reviews',
    action: 'shared an impression',
    time: '2 hours ago',
    quote: 'A beautifully gentle game about a very difficult thing. Come for the boat-building; stay for the people you meet. Story: 5/5. Best played slowly.',
    why: 'You both love thoughtful stories. Jamie and Alex have wishlisted this.',
    circle: 'story',
    likes: 17,
  },
  {
    id: 'a4',
    person: 'casey',
    game: 323190,
    category: 'Recently discovered',
    action: 'is plotting a colder kind of city',
    time: 'Yesterday',
    quote: 'Every decision matters, and I haven’t stopped thinking about the city I built.',
    why: 'Strategy is a different side of your gaming circle.',
    circle: 'tactics',
    likes: 5,
  },
  {
    id: 'a5',
    person: 'morgan',
    game: 383870,
    category: 'Completed games',
    action: 'finished a story worth sharing',
    time: 'Yesterday',
    quote: 'Those quiet walks and that voice on the radio. I wish I could experience the beginning all over again.',
    why: 'One of your shared favorites. Compare impressions, without spoilers.',
    circle: 'story',
    likes: 11,
  },
  {
    id: 'a6',
    person: 'alex',
    game: 1172620,
    category: 'Multiplayer',
    action: 'is putting a crew together',
    time: 'Yesterday',
    quote: 'Four pirates. One ship. A very questionable sense of direction. Who’s joining this weekend?',
    why: 'Alex and Morgan already own it. Jamie has it on their wishlist.',
    circle: 'afterhours',
    likes: 6,
  },
  {
    id: 'a7',
    person: 'morgan',
    game: 413150,
    category: 'Circle activity',
    action: 'added a possibility to the circle',
    time: '2 days ago',
    quote: 'Could this be our next shared world? I added it to the After Hours wishlist so we can decide together.',
    why: 'Your circle can compare ownership and budget in the Group Finder.',
    circle: 'afterhours',
    likes: 9,
  },
  {
    id: 'a8',
    person: 'riley',
    game: 504230,
    category: 'Recently discovered',
    action: 'kept retrying a very fair challenge',
    time: '3 hours ago',
    quote: 'Hard in the best way. The audio cues and precise jumps make each retry feel fair.',
    why: 'Precision platformers are another side of your gaming circle.',
    circle: null,
    likes: 7,
  },
  {
    id: 'a9',
    person: 'sam',
    game: 747200,
    category: 'Reviews',
    action: 'is building a strange new base',
    time: '5 hours ago',
    quote: 'The planet keeps throwing new systems at me. The base-building between expeditions has become my odd little comfort loop.',
    why: 'A survival sandbox with room for the whole crew.',
    circle: null,
    likes: 6,
  },
  {
    id: 'a10',
    person: 'devon',
    game: 1172620,
    category: 'Multiplayer',
    action: 'is putting a crew together',
    time: 'Yesterday',
    quote: 'Funny with a full crew, less convincing when I am playing alone.',
    why: 'Alex owns this one, so there is already a shared starting point.',
    circle: null,
    likes: 8,
  },
]

/**
 * Fresh copy of the seed social state. Seed identities and relationships are
 * always restored; persisted data can extend them but cannot remove them.
 */
export function createEmptySocialState(): SocialState {
  return {
    circles: initialCircles.map((circle) => ({
      ...circle,
      members: [...circle.members],
      wishlist: [...circle.wishlist],
      playing: [...circle.playing],
    })),
    reactions: [],
    comments: {
      a1: [{ person: "alex", text: "The fishing detour got me too. Highly recommend it." }],
    },
    savedRecs: [],
    privacy: {
      profile: "Friends only",
      wishlist: "Friends only",
      activity: "Friends only",
    },
    sent: [],
    shares: [],
    activity: [],
    discussions: {
      afterhours: [{ person: "alex", text: "A farm night or a pirate crew this weekend?" }],
    },
    invites: [],
    circleVotes: [],
    circlePlans: [],
    circleGroupRecommendations: [],
    circleGoals: [],
  }
}

/** Recipients are either a sample person id or a `circle:`-prefixed circle id. */
export function getRecipientId(recipient: string, circles: SocialCircle[] = initialCircles) {
  if (circles.some((circle) => circle.id === recipient)) return recipient
  if (recipient.startsWith("circle:")) {
    const circleId = recipient.slice("circle:".length)
    return circles.some((circle) => circle.id === circleId) ? circleId : null
  }
  return null
}

export function isPersonRecipient(recipient: string, people: SocialPerson[] = socialPeople) {
  return people.some((person) => person.id === recipient)
}

const interestSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Builds The Web from the same shared model used by every social feature.
 * Recommendations and shared wishlists from persisted state become graph
 * relationships, and all game references are checked against the catalog.
 */
export function buildSocialGraph({
  people = socialPeople,
  circles = initialCircles,
  friendships = initialFriendships,
  recommendations = [],
  shares = [],
  games = gameCatalog,
}: SocialGraphOptions = {}): SocialGraph {
  const validGameIds = new Set(games.map((game) => game.id))
  const gameTitles = new Map(games.map((game) => [game.id, game.title]))
  const personIds = new Set(people.map((person) => person.id))
  const circleIds = new Set(circles.map((circle) => circle.id))
  const validGameId = (id: unknown): id is number =>
    Number.isInteger(id) && validGameIds.has(id as number)

  // 1. Resolve Friendship structure
  const directFriendIds = new Set(
    friendships
      .filter(f => f.members.includes("you"))
      .flatMap(f => f.members)
      .filter(id => id !== "you" && personIds.has(id))
  )

  const fofIds = new Set<string>()
  friendships.forEach(f => {
    const [a, b] = f.members
    if (!personIds.has(a) || !personIds.has(b)) return
    if (directFriendIds.has(a) && !directFriendIds.has(b) && b !== "you") fofIds.add(b)
    if (directFriendIds.has(b) && !directFriendIds.has(a) && a !== "you") fofIds.add(a)
  })

  const relevantPersonIds = new Set(["you", ...directFriendIds, ...fofIds])
  const relevantPeople = people.filter(p => relevantPersonIds.has(p.id))

  // 2. Identify relevant games based on actual social data
  const gameDiscovery = new Set<number>()
  relevantPeople.forEach(p => {
    [...p.favorites, ...p.playing, ...p.recent, ...p.wishlist, ...p.recommends, ...p.owned].forEach(id => {
      if (validGameId(id)) gameDiscovery.add(id)
    })
  })
  circles.forEach(c => {
    [...c.wishlist, ...c.playing].forEach(id => {
      if (validGameId(id)) gameDiscovery.add(id)
    })
  })
  recommendations.forEach(r => { if (validGameId(r.game)) gameDiscovery.add(r.game) })
  shares.forEach(s => s.games.forEach(id => { if (validGameId(id)) gameDiscovery.add(id) }))

  // 3. Build Nodes
  const nodes: SocialGraphNode[] = []

  relevantPeople.forEach(p => {
    nodes.push({
      id: p.id,
      name: p.id === "you" ? "You" : p.name,
      type: p.id === "you" ? "You" : "Friend",
      initials: p.initials,
      note: p.id === "you" ? "Your discovery thread. Follow what you like, what your friends love, and what your circles keep recommending." : p.bio,
    })
  })

  const allInterests = new Set(relevantPeople.flatMap(p => p.interests))
  const interestNodes: SocialGraphNode[] = Array.from(allInterests).map((interest, index) => ({
    id: interestSlug(interest),
    name: interest,
    type: index % 2 === 0 ? "Interest" : "Genre",
    note: `${interest} is a shared thread in your network.`,
  }))
  nodes.push(...interestNodes)

  gameDiscovery.forEach(gameId => {
    nodes.push({
      id: String(gameId),
      name: gameTitles.get(gameId) || `Game ${gameId}`,
      type: "Game",
      game: gameId,
    })
  })

  circles.forEach(circle => {
    nodes.push({
      id: circle.id,
      name: circle.name,
      type: "Circle",
      initials: circle.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(),
      note: circle.desc,
    })
  })

  // 4. Build Relationships
  const edgeMap = new Map<string, SocialGraphRelationship>()
  const addEdge = (from: string, to: string, label: string) => {
    if (from === to) return
    const key = `${from}-${to}-${label}`
    if (!edgeMap.has(key)) edgeMap.set(key, [from, to, label] as const)
  }

  friendships.forEach(f => {
    const [a, b] = f.members
    if (relevantPersonIds.has(a) && relevantPersonIds.has(b)) addEdge(a, b, "Friends")
  })

  relevantPeople.forEach(p => {
    p.interests.forEach(interest => addEdge(p.id, interestSlug(interest), "Enjoys"))
    p.favorites.filter(validGameId).forEach(id => addEdge(p.id, String(id), "Favorite"))
    p.owned.filter(validGameId).forEach(id => addEdge(p.id, String(id), "Owned"))
    p.playing.filter(validGameId).forEach(id => addEdge(p.id, String(id), "Currently playing"))
    p.wishlist.filter(validGameId).forEach(id => addEdge(p.id, String(id), "Wishlist"))
    p.recommends.filter(validGameId).forEach(id => addEdge(p.id, String(id), "Recommendation"))
  })

  circles.forEach(c => {
    c.members.forEach(m => { if (relevantPersonIds.has(m)) addEdge(m, c.id, "Member") })
    c.wishlist.filter(validGameId).forEach(id => addEdge(c.id, String(id), "Shared wishlist"))
  })

  recommendations.forEach(r => {
    if (relevantPersonIds.has(r.sender) && validGameId(r.game)) {
      const recipientId = getRecipientId(r.recipient, circles) || (personIds.has(r.recipient) ? r.recipient : null)
      if (recipientId && (relevantPersonIds.has(recipientId) || circleIds.has(recipientId))) {
        addEdge(r.sender, String(r.game), "Recommendation")
        addEdge(String(r.game), recipientId, "Recommended to")
      }
    }
  })

  shares.forEach(s => {
    if (relevantPersonIds.has(s.sender)) {
      const recipientId = getRecipientId(s.recipient, circles) || (personIds.has(s.recipient) ? s.recipient : null)
      if (recipientId && (relevantPersonIds.has(recipientId) || circleIds.has(recipientId))) {
        s.games.filter(validGameId).forEach(gameId => {
          addEdge(s.sender, String(gameId), "Shared wishlist")
          addEdge(String(gameId), recipientId, "Shared with")
        })
      }
    }
  })

  const nodeIds = new Set(nodes.map(n => n.id))
  return { nodes, relationships: Array.from(edgeMap.values()).filter(([from, to]) => nodeIds.has(from) && nodeIds.has(to)) }
}
