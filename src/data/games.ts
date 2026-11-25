/**
 * PLAYSCAPE central game catalog.
 *
 * This is the prototype's single source of truth for game metadata. Keep the
 * numeric `id` stable: the social graph, circles, activity feed, and saved
 * lists refer to games by this ID.
 *
 * Values inherited from the original prototype are intentionally retained.
 * Price, platform, mood, and session metadata are demo values and should be
 * verified/replaced before this catalog is presented as a live store.
 */

/**
 * Optional presentation media. URLs are never invented by the prototype;
 * records without verified footage simply fall back to cover artwork.
 */
export type GameMediaType =
    | "gameplay"
    | "trailer"
    | "screenshot"
    | "cover"
    | "promotional"

export type GameMedia = {
    id: string
    type: GameMediaType
    url: string
    thumbnail?: string
    title?: string
    description?: string
    source?: string
    duration?: string
    featured?: boolean
}

export type GameRecord = {
    /** Stable internal key; currently aligned to the Steam app ID for seed data. */
    id: number
    title: string
    slug: string
    genre: string
    genres: string[]
    price: number
    players: string
    playerModes: string[]
    moods: string
    moodTags: string[]
    season: string
    atmosphere: string
    desc: string
    platform: string
    platforms: string[]
    difficulty: string
    session: number
    sessionMinutes: number
    steamAppId: number
    metadataStatus: "prototype" | "verified" | "incomplete"
    /** Optional enrichment fields; leave empty until sourced and verified. */
    developer?: string
    publisher?: string
    releaseDate?: string
    officialWebsite?: string
    trailerUrl?: string
    screenshots?: string[]
    /** Optional centralized media gallery entries; see GameMedia above. */
    media?: GameMedia[]
    estimatedMainStoryHours?: number
    estimatedCompletionistHours?: number
    reviewScore?: number
    reviewCount?: number
    priceUpdatedAt?: string
    priceSource?: string
}

export const steam = (id: number) =>
    "https://cdn.akamai.steamstatic.com/steam/apps/" + id + "/header.jpg"

const gameSeeds = [
    {
        id: 413150,
        title: "Stardew Valley",
        genre: "Farming sim · Life sim",
        price: 14.99,
        players: "Solo & co-op",
        moods: "Relaxing Creative Social",
        season: "Spring",
        desc: "Build a new life, grow your farm, and get to know the people of Pelican Town.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Casual",
        session: 15,
        metadataStatus: "prototype",
    },
    {
        id: 1055540,
        title: "A Short Hike",
        genre: "Exploration · Adventure",
        price: 7.99,
        players: "Solo",
        moods: "Relaxing Atmospheric",
        season: "Spring",
        desc: "Hike, climb, and soar through the peaceful mountainside of Hawk Peak Provincial Park.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Casual",
        session: 15,
        metadataStatus: "prototype",
    },
    {
        id: 972660,
        title: "Spiritfarer",
        genre: "Cozy management · Adventure",
        price: 29.99,
        players: "Solo & local co-op",
        moods: "Relaxing Creative Story-driven",
        season: "Autumn",
        desc: "Build a boat and care for spirit friends in a tender adventure about saying goodbye.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Casual",
        session: 60,
        metadataStatus: "prototype",
    },
    {
        id: 383870,
        title: "Firewatch",
        genre: "Narrative · Exploration",
        price: 19.99,
        players: "Solo",
        moods: "Story-driven Atmospheric Relaxing",
        season: "Autumn",
        desc: "Explore the Wyoming wilderness as a fire lookout, with a voice on the radio as your only company.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Casual",
        session: 60,
        metadataStatus: "prototype",
    },
    {
        id: 1145360,
        title: "Hades",
        genre: "Action · Roguelike",
        price: 24.99,
        players: "Solo",
        moods: "Exciting Challenging Story-driven",
        season: "Summer",
        desc: "Defy the god of the dead as you battle out of the Underworld, one run at a time.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Challenging",
        session: 15,
        metadataStatus: "prototype",
    },
    {
        id: 323190,
        title: "Frostpunk",
        genre: "Strategy · Survival",
        price: 29.99,
        players: "Solo",
        moods: "Challenging Atmospheric",
        season: "Winter",
        desc: "Lead the last city on Earth in a frozen world where every decision has a cost.",
        platform: "PC PlayStation Xbox",
        difficulty: "Very challenging",
        session: 60,
        metadataStatus: "prototype",
    },
    {
        id: 1172620,
        title: "Sea of Thieves",
        genre: "Adventure · Multiplayer",
        price: 39.99,
        players: "Online multiplayer & co-op",
        moods: "Social Exciting Competitive",
        season: "Summer",
        desc: "Set sail with your crew for treasure, tall tales, and unpredictable adventures.",
        platform: "PC PlayStation Xbox",
        difficulty: "Moderate",
        session: 120,
        metadataStatus: "prototype",
    },
    {
        id: 1030300,
        title: "Hollow Knight: Silksong",
        genre: "Action · Metroidvania",
        price: 19.99,
        players: "Solo",
        moods: "Challenging Atmospheric",
        season: "Winter",
        desc: "Explore a vast, haunted kingdom as the lethal hunter Hornet.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Very challenging",
        session: 60,
        metadataStatus: "prototype",
    },
    {
        id: 504230,
        title: "Celeste",
        genre: "Platformer · Precision",
        price: 14.99,
        players: "Solo",
        moods: "Challenging Atmospheric Story-driven",
        season: "Winter",
        desc: "Climb a mountain and confront your own limits in a tightly designed platformer filled with heart.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Challenging",
        session: 45,
        developer: "Maddy Makes Games",
        publisher: "Matt Makes Games",
        releaseDate: "2018-01-25",
        officialWebsite: "https://www.celestegame.com/",
        metadataStatus: "verified",
    },
    {
        id: 261550,
        title: "Mount & Blade II: Bannerlord",
        genre: "Strategy · Sandbox",
        price: 39.99,
        players: "Solo & online multiplayer",
        moods: "Exciting Social Competitive",
        season: "Summer",
        desc: "Lead your clan across a living medieval world with diplomacy, warfare, and emergent stories.",
        platform: "PC",
        difficulty: "Moderate",
        session: 120,
        developer: "TaleWorlds Entertainment",
        publisher: "TaleWorlds Entertainment",
        releaseDate: "2020-03-30",
        officialWebsite: "https://www.taleworlds.com/en/games/bannerlord",
        metadataStatus: "verified",
    },
    {
        id: 646570,
        title: "Slay the Spire",
        genre: "Deckbuilder · Roguelike",
        price: 24.99,
        players: "Solo",
        moods: "Strategic Challenging Creative",
        season: "Autumn",
        desc: "Build a deck, survive the spire, and test your tactical choices in one more run.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Moderate",
        session: 60,
        developer: "Mega Crit",
        publisher: "Mega Crit",
        releaseDate: "2017-11-14",
        officialWebsite: "https://www.megacrit.com/",
        metadataStatus: "verified",
    },
    {
        id: 105600,
        title: "Terraria",
        genre: "Sandbox · Adventure",
        price: 9.99,
        players: "Solo & co-op",
        moods: "Creative Relaxing Exploratory",
        season: "Summer",
        desc: "Dig, build, fight, and explore in a procedurally generated world built for endless invention.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Moderate",
        session: 45,
        developer: "Re-Logic",
        publisher: "Re-Logic",
        releaseDate: "2011-05-16",
        officialWebsite: "https://terraria.org/",
        metadataStatus: "verified",
    },
    {
        id: 219760,
        title: "Pillars of Eternity II: Deadfire",
        genre: "RPG · Story-rich",
        price: 29.99,
        players: "Solo",
        moods: "Story-driven Challenging Strategic",
        season: "Autumn",
        desc: "Sail a breathtaking archipelago, shape your crew, and decide who you become in a complex RPG.",
        platform: "PC PlayStation Xbox",
        difficulty: "Moderate",
        session: 120,
        developer: "Obsidian Entertainment",
        publisher: "Private Division",
        releaseDate: "2018-05-08",
        officialWebsite: "https://eternity.obsidian.net/",
        metadataStatus: "verified",
    },
    {
        id: 1200,
        title: "Red Dead Redemption 2",
        genre: "Open world · Western",
        price: 59.99,
        players: "Solo",
        moods: "Atmospheric Story-driven Social",
        season: "Autumn",
        desc: "Ride, hunt, and survive the frontier in a cinematic open-world epic about loyalty and consequence.",
        platform: "PC PlayStation Xbox",
        difficulty: "Moderate",
        session: 180,
        developer: "Rockstar Games",
        publisher: "Rockstar Games",
        releaseDate: "2018-10-26",
        officialWebsite: "https://www.rockstargames.com/reddeadredemption2",
        metadataStatus: "verified",
    },
    {
        id: 747200,
        title: "Wattam",
        genre: "Puzzle · Sandbox",
        price: 19.99,
        players: "Solo & local co-op",
        moods: "Creative Relaxing Social",
        season: "Spring",
        desc: "Experiment with an oddball cast of objects and characters in a playful physics-driven puzzle toy box.",
        platform: "PC PlayStation Nintendo Switch",
        difficulty: "Casual",
        session: 30,
        developer: "Funomena",
        publisher: "Funomena",
        releaseDate: "2020-11-18",
        officialWebsite: "https://www.funomena.com/wattam",
        metadataStatus: "incomplete",
    },
    {
        id: 600480,
        title: "Yoku's Island Express",
        genre: "Metroidvania · Puzzle",
        price: 14.99,
        players: "Solo",
        moods: "Relaxing Creative Atmospheric",
        season: "Spring",
        desc: "Roll around a lush island as a tiny dung beetle on a surprising amphibious adventure.",
        platform: "PC PlayStation Nintendo Switch",
        difficulty: "Casual",
        session: 40,
        developer: "Villa Nora",
        publisher: "Team17",
        releaseDate: "2018-05-29",
        officialWebsite: "https://www.team17.com/games/yokus-island-express",
        metadataStatus: "verified",
    },
    {
        id: 1092790,
        title: "Inside",
        genre: "Adventure · Puzzle",
        price: 9.99,
        players: "Solo",
        moods: "Atmospheric Story-driven Challenging",
        season: "Autumn",
        desc: "Follow a boy through a haunting industrial landscape in a tense, atmospheric journey.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Moderate",
        session: 60,
        developer: "Playdead",
        publisher: "Playdead",
        releaseDate: "2016-06-07",
        officialWebsite: "https://playdead.com/games/inside/",
        metadataStatus: "verified",
    },
    {
        id: 650700,
        title: "The Longing",
        genre: "Narrative · Simulation",
        price: 14.99,
        players: "Solo",
        moods: "Atmospheric Story-driven Relaxing",
        season: "Winter",
        desc: "Spend long, slow minutes in a kingdom of endless waiting in a true slow-burn adventure.",
        platform: "PC PlayStation Nintendo Switch",
        difficulty: "Casual",
        session: 60,
        developer: "The Longing Team",
        publisher: "Puppet Combo",
        releaseDate: "2020-03-05",
        officialWebsite: "https://www.thelonginggame.com/",
        metadataStatus: "incomplete",
    },
    {
        id: 1091500,
        title: "Cyberpunk 2077",
        genre: "Open world · RPG",
        price: 39.99,
        players: "Solo",
        moods: "Exciting Story-driven Social",
        season: "Summer",
        desc: "Navigate Night City, build your legend, and survive a dystopian world full of choices.",
        platform: "PC PlayStation Xbox",
        difficulty: "Moderate",
        session: 180,
        developer: "CD Projekt Red",
        publisher: "CD Projekt Red",
        releaseDate: "2020-12-10",
        officialWebsite: "https://www.cyberpunk.net/",
        metadataStatus: "verified",
    },
    {
        id: 864050,
        title: "Little Kitty, Big City",
        genre: "Adventure · Exploration",
        price: 19.99,
        players: "Solo",
        moods: "Relaxing Social Creative",
        season: "Spring",
        desc: "Skulk through a city as a curious cat, exploring rooftops, food stalls, and hidden corners.",
        platform: "PC Nintendo Switch",
        difficulty: "Casual",
        session: 30,
        developer: "Double Dagger Studio",
        publisher: "Double Dagger Studio",
        releaseDate: "2024-06-11",
        officialWebsite: "https://double-dagger.com/",
        metadataStatus: "verified",
    },
    {
        id: 1605220,
        title: "PowerWash Simulator",
        genre: "Simulation · Cozy",
        price: 24.99,
        players: "Solo & co-op",
        moods: "Relaxing Creative Social",
        season: "Summer",
        desc: "Blast grime off driveways, houses, and vehicles in the most satisfying cleaning game around.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Casual",
        session: 45,
        developer: "FuturLab",
        publisher: "FuturLab",
        releaseDate: "2021-07-13",
        officialWebsite: "https://www.powerwashsimulator.com/",
        metadataStatus: "verified",
    },
    {
        id: 275850,
        title: "Noita",
        genre: "Action · Sandbox",
        price: 14.99,
        players: "Solo",
        moods: "Creative Challenging Exciting",
        season: "Autumn",
        desc: "Wield magical physics to shape a dangerous world in a roguelite full of explosive experimentation.",
        platform: "PC",
        difficulty: "Very challenging",
        session: 60,
        developer: "Nolla Games",
        publisher: "Nolla Games",
        releaseDate: "2020-10-15",
        officialWebsite: "https://nolla.com/noita/",
        metadataStatus: "verified",
    },
    {
        id: 257510,
        title: "The Sims 4",
        genre: "Life sim · Sandbox",
        price: 39.99,
        players: "Solo",
        moods: "Relaxing Creative Social",
        season: "Spring",
        desc: "Build homes, tell stories, and design a life in one of the most flexible virtual life sims ever made.",
        platform: "PC",
        difficulty: "Casual",
        session: 45,
        developer: "Maxis",
        publisher: "Electronic Arts",
        releaseDate: "2014-09-02",
        officialWebsite: "https://www.ea.com/games/the-sims/the-sims-4",
        metadataStatus: "verified",
    },
    {
        id: 1057090,
        title: "Ori and the Will of the Wisps",
        genre: "Action · Platformer",
        price: 19.99,
        players: "Solo",
        moods: "Atmospheric Challenging Story-driven",
        season: "Spring",
        desc: "Explore a luminous world and fight through beautifully composed platforming challenges.",
        platform: "PC Xbox Nintendo Switch",
        difficulty: "Challenging",
        session: 60,
        developer: "Moon Studios",
        publisher: "Xbox Game Studios",
        releaseDate: "2020-03-11",
        officialWebsite: "https://www.orithegame.com/",
        metadataStatus: "verified",
    },
    {
        id: 200710,
        title: "Torchlight II",
        genre: "Action RPG · Looting",
        price: 19.99,
        players: "Solo & co-op",
        moods: "Exciting Social Challenging",
        season: "Autumn",
        desc: "Dive into a bright, charming action RPG with satisfying combat and co-op play.",
        platform: "PC",
        difficulty: "Moderate",
        session: 60,
        developer: "Runic Games",
        publisher: "Runic Games",
        releaseDate: "2012-09-20",
        officialWebsite: "https://www.runicgames.com/",
        metadataStatus: "incomplete",
    },
    {
        id: 1129580,
        title: "Magicka 2",
        genre: "Action · Co-op",
        price: 9.99,
        players: "Online multiplayer & co-op",
        moods: "Social Exciting Creative",
        season: "Summer",
        desc: "Cast elemental combinations and laugh through chaotic co-op wizardry with friends.",
        platform: "PC",
        difficulty: "Moderate",
        session: 45,
        developer: "Pieces Interactive",
        publisher: "Paradox Interactive",
        releaseDate: "2015-05-26",
        officialWebsite: "https://www.paradoxinteractive.com/games/magicka-2/about",
        metadataStatus: "verified",
    },
    {
        id: 322330,
        title: "Don't Starve Together",
        genre: "Survival · Co-op",
        price: 14.99,
        players: "Solo & online co-op",
        moods: "Challenging Social Survival",
        season: "Winter",
        desc: "Survive the wilderness with ruthless management, hostile creatures, and your own sanity.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Very challenging",
        session: 90,
        developer: "Klei Entertainment",
        publisher: "Klei Entertainment",
        releaseDate: "2016-12-15",
        officialWebsite: "https://www.dontstarvegame.com/",
        metadataStatus: "verified",
    },
    {
        id: 488790,
        title: "Never Alone",
        genre: "Adventure · Puzzle",
        price: 14.99,
        players: "Solo & local co-op",
        moods: "Story-driven Atmospheric Social",
        season: "Winter",
        desc: "Solve environmental puzzles while exploring a moving, story-rich Alaskan landscape.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Casual",
        session: 50,
        developer: "Upper One Games",
        publisher: "E-Line Media",
        releaseDate: "2014-11-18",
        officialWebsite: "https://neveralonegame.com/",
        metadataStatus: "verified",
    },
    {
        id: 381210,
        title: "Dead Cells",
        genre: "Action · Roguelike",
        price: 24.99,
        players: "Solo",
        moods: "Exciting Challenging Competitive",
        season: "Summer",
        desc: "Fight through an ever-changing castle with tight combat, clever upgrades, and a lot of improvisation.",
        platform: "PC PlayStation Xbox Nintendo Switch",
        difficulty: "Very challenging",
        session: 45,
        developer: "Motion Twin",
        publisher: "Motion Twin",
        releaseDate: "2018-08-07",
        officialWebsite: "https://dead-cells.com/",
        metadataStatus: "verified",
    },
    {
        id: 39210,
        title: "FINAL FANTASY XIV Online",
        genre: "MMORPG · Role-playing",
        price: 39.99,
        players: "Online multiplayer",
        moods: "Social Story-driven Cooperative",
        season: "Summer",
        desc: "Join friends in a huge world of quests, raids, and social play across Eorzea.",
        platform: "PC PlayStation",
        difficulty: "Moderate",
        session: 180,
        developer: "Square Enix",
        publisher: "Square Enix",
        releaseDate: "2013-08-27",
        officialWebsite: "https://na.finalfantasyxiv.com/",
        metadataStatus: "verified",
    },
    {
        id: 1086940,
        title: "Baldur's Gate 3",
        genre: "RPG · Story-rich",
        price: 59.99,
        players: "Solo & co-op",
        moods: "Story-driven Social Challenging",
        season: "Autumn",
        desc: "Forge alliances, negotiate consequences, and shape a fantasy world through a vast role-playing campaign.",
        platform: "PC PlayStation Xbox",
        difficulty: "Moderate",
        session: 180,
        developer: "Larian Studios",
        publisher: "Larian Studios",
        releaseDate: "2023-08-03",
        officialWebsite: "https://baldursgate3.game/",
        metadataStatus: "verified",
    },
]

const normalizeGame = (game: (typeof gameSeeds)[number]): GameRecord => ({
    ...game,
    slug: game.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    genres: game.genre.split(" · ").map((value) => value.trim()),
    playerModes: game.players.split(/\s*&\s*|\s*·\s*/).map((value) => value.trim()),
    moodTags: game.moods.split(/\s+/).filter(Boolean),
    atmosphere: game.season,
    platforms: game.platform.match(/Nintendo Switch|PlayStation|Xbox|PC/g) ?? [],
    sessionMinutes: game.session,
    steamAppId: game.id,
    metadataStatus: (game.metadataStatus ?? "prototype") as GameRecord["metadataStatus"],
})

export const defaultGames: GameRecord[] = gameSeeds.map(normalizeGame)

/** Alias used by new catalog-facing code. */
export const gameCatalog = defaultGames

/** Validate key catalog invariants during development or data imports. */
export const validateGameCatalog = (games: GameRecord[] = gameCatalog): string[] => {
    const issues: string[] = []
    const ids = new Set<number>()
    const slugs = new Set<string>()
    for (const game of games) {
        if (ids.has(game.id)) issues.push(`Duplicate game ID: ${game.id}`)
        if (slugs.has(game.slug)) issues.push(`Duplicate game slug: ${game.slug}`)
        if (!game.title.trim()) issues.push(`Game ${game.id} is missing a title`)
        if (!game.slug.trim()) issues.push(`Game ${game.id} is missing a slug`)
        if (!game.genre.trim()) issues.push(`Game ${game.id} is missing a genre`)
        if (!Number.isFinite(game.price) || game.price < 0) issues.push(`Game ${game.id} has an invalid sample price`)
        if (!Number.isFinite(game.sessionMinutes) || game.sessionMinutes <= 0) issues.push(`Game ${game.id} has an invalid session estimate`)
        if (game.metadataStatus === "verified" && !game.developer?.trim()) issues.push(`Verified game ${game.id} is missing a developer`)
        if (game.metadataStatus === "verified" && !game.publisher?.trim()) issues.push(`Verified game ${game.id} is missing a publisher`)
        if (game.metadataStatus === "verified" && !game.releaseDate?.trim()) issues.push(`Verified game ${game.id} is missing a release date`)
        ids.add(game.id)
        slugs.add(game.slug)
    }
    return issues
}

export const getGameById = (id: number, games: GameRecord[] = gameCatalog): GameRecord | undefined =>
    games.find((game) => game.id === id)

export const getGameBySlug = (slug: string, games: GameRecord[] = gameCatalog): GameRecord | undefined =>
    games.find((game) => game.slug === slug)

export const resolveGameRecord = (
    value: number | GameRecord | null | undefined,
    games: GameRecord[] = gameCatalog,
): GameRecord | undefined => {
    if (value == null) return undefined
    if (typeof value === "number") return getGameById(value, games)
    if (typeof value === "object" && "id" in value && typeof value.id === "number") {
        return getGameById(value.id, games) ?? value
    }
    return undefined
}

export const getGamesByIds = (
    ids: Array<number | null | undefined>,
    games: GameRecord[] = gameCatalog,
): GameRecord[] => {
    const seen = new Set<number>()
    return ids.flatMap((id) => {
        if (id == null || !Number.isFinite(id)) return []
        const resolved = getGameById(Number(id), games)
        if (!resolved || seen.has(resolved.id)) return []
        seen.add(resolved.id)
        return [resolved]
    })
}

export type WishlistOverlap = {
    id: string
    name: string
    sharedCount: number
    sharedIds: number[]
}

export type FriendGameSignal = {
    gameId: number
    friends: Array<{ id: string; name: string }>
    score: number
    reason: string
    isSaved: boolean
}

export const buildFriendGameSignals = (
    gameId: number,
    people: Array<{ id: string; name: string; wishlist?: Array<number | null | undefined> }> = [],
    savedIds: Array<number | null | undefined> = [],
): FriendGameSignal => {
    const normalizedSaved = new Set(
        savedIds
            .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
            .map((id) => Number(id)),
    )
    const friends = people.filter(
        (person) =>
            person.id !== "you" &&
            (person.wishlist ?? []).some(
                (id) => typeof id === "number" && Number.isFinite(id) && Number(id) === gameId,
            ),
    )

    const reason = friends.length
        ? `${friends
              .slice(0, 2)
              .map((friend) => friend.name)
              .join(" and ")}${friends.length > 2 ? " + others" : ""} want${normalizedSaved.has(gameId) ? " this too" : " this"}`
        : normalizedSaved.has(gameId)
          ? "Already in your wishlist"
          : "A new pick for your next save"

    return {
        gameId,
        friends,
        score: friends.length * 2,
        reason,
        isSaved: normalizedSaved.has(gameId),
    }
}

export type WishlistRecommendation = {
    game: GameRecord
    score: number
    friends: string[]
    why: string
}

export const buildWishlistRecommendations = (
    savedIds: Array<number | null | undefined> = [],
    people: Array<{ id: string; name: string; wishlist?: Array<number | null | undefined> }> = [],
    games: GameRecord[] = gameCatalog,
): WishlistRecommendation[] => {
    const dedupedSaved = new Set(
        savedIds
            .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
            .map((id) => Number(id)),
    )

    const candidateMap = new Map<number, { game: GameRecord; friends: string[]; score: number }>()
    for (const person of people) {
        if (person.id === "you") continue
        for (const id of person.wishlist ?? []) {
            const gameId = typeof id === "number" && Number.isFinite(id) ? Number(id) : null
            if (!gameId || dedupedSaved.has(gameId)) continue
            const current = candidateMap.get(gameId) ?? {
                game: getGameById(gameId, games) ?? null,
                friends: [],
                score: 0,
            }
            if (!current.game) continue
            current.friends = [...new Set([...current.friends, person.name])]
            current.score += 2
            candidateMap.set(gameId, current as any)
        }
    }

    for (const person of people) {
        if (person.id === "you") continue
        for (const id of person.wishlist ?? []) {
            const gameId = typeof id === "number" && Number.isFinite(id) ? Number(id) : null
            if (!gameId || dedupedSaved.has(gameId)) continue
            const game = getGameById(gameId, games)
            if (!game) continue
            const current = candidateMap.get(gameId)
            if (!current) continue
            current.score += game.price <= 25 ? 1 : 0
            current.score += game.platforms.includes("PC") ? 1 : 0
            candidateMap.set(gameId, current)
        }
    }

    return [...candidateMap.values()]
        .map(({ game, friends, score }) => ({
            game,
            friends,
            score,
            why: friends.length
                ? `Shared by ${friends.slice(0, 2).join(" and ")}${friends.length > 2 ? " + others" : ""}`
                : "A strong fit for your wishlist",
        }))
        .filter((entry) => entry.game)
        .sort((a, b) => b.score - a.score || a.game.price - b.game.price)
}

export const buildWishlistSummary = (
    savedIds: Array<number | null | undefined> = [],
    people: Array<{ id: string; name: string; wishlist?: Array<number | null | undefined> }> = [],
    games: GameRecord[] = gameCatalog,
): { savedGames: GameRecord[]; overlaps: WishlistOverlap[]; totalSaved: number; totalShared: number } => {
    const dedupedSaved = Array.from(
        new Set(
            savedIds
                .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
                .map((id) => Number(id)),
        ),
    )
    const savedGames = getGamesByIds(dedupedSaved, games)
    const overlaps = people
        .filter((person) => person.id !== "you")
        .map((person) => {
            const sharedIds = (person.wishlist ?? []).filter(
                (id): id is number => typeof id === "number" && Number.isFinite(id) && dedupedSaved.includes(Number(id)),
            )
            return {
                id: person.id,
                name: person.name,
                sharedCount: sharedIds.length,
                sharedIds: sharedIds.map((id) => Number(id)),
            }
        })
        .filter((person) => person.sharedCount > 0)
        .sort((a, b) => b.sharedCount - a.sharedCount)

    return {
        savedGames,
        overlaps,
        totalSaved: savedGames.length,
        totalShared: overlaps.reduce((total, person) => total + person.sharedCount, 0),
    }
}

export type GameSort = "featured" | "title" | "price-low" | "price-high"

export type ComparisonSummary = {
    gameCount: number
    cheapest: GameRecord | null
    priciest: GameRecord | null
    lowestPrice: number
    highestPrice: number
    averageSessionMinutes: number
    platforms: string[]
    bestValue: GameRecord | null
    tagSummary: string[]
}

export const buildComparisonSummary = (
    games: Array<GameRecord | number | null | undefined> = [],
    catalog: GameRecord[] = gameCatalog,
): ComparisonSummary => {
    const selected = games
        .map((game) => resolveGameRecord(game, catalog))
        .filter((game): game is GameRecord => Boolean(game))

    if (!selected.length) {
        return {
            gameCount: 0,
            cheapest: null,
            priciest: null,
            lowestPrice: 0,
            highestPrice: 0,
            averageSessionMinutes: 0,
            platforms: [],
            bestValue: null,
            tagSummary: [],
        }
    }

    const cheapest = [...selected].sort((a, b) => a.price - b.price)[0]
    const priciest = [...selected].sort((a, b) => b.price - a.price)[0]
    const platforms = Array.from(
        new Set(selected.flatMap((game) => game.platforms))
    ).sort((a, b) => a.localeCompare(b))
    const tagSummary = Array.from(
        new Set(selected.flatMap((game) => game.moodTags))
    ).slice(0, 5)
    const averageSessionMinutes =
        selected.reduce((total, game) => total + (game.sessionMinutes || game.session), 0) /
        selected.length
    const bestValue = [...selected].sort((a, b) => a.price - b.price)[0]

    return {
        gameCount: selected.length,
        cheapest,
        priciest,
        lowestPrice: cheapest.price,
        highestPrice: priciest.price,
        averageSessionMinutes: Number(averageSessionMinutes.toFixed(1)),
        platforms,
        bestValue,
        tagSummary,
    }
}

/** Sort a filtered catalog without mutating the caller's array. */
export const sortGames = (games: GameRecord[], sort: GameSort = "featured"): GameRecord[] => {
    const originalOrder = new Map(games.map((game, index) => [game.id, index]))
    return [...games].sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title)
        if (sort === "price-low") return a.price - b.price || a.title.localeCompare(b.title)
        if (sort === "price-high") return b.price - a.price || a.title.localeCompare(b.title)
        return (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0)
    })
}

export const searchGames = (query: string, games: GameRecord[] = gameCatalog): GameRecord[] => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return games
    return games.filter((game) =>
        [
            game.title,
            game.desc,
            game.genre,
            game.genres.join(" "),
            game.moods,
            game.moodTags.join(" "),
            game.players,
            game.playerModes.join(" "),
            game.platform,
            game.platforms.join(" "),
            game.developer,
            game.publisher,
            game.releaseDate,
            game.officialWebsite,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized),
    )
}

export type GameCatalogFilters = {
    moods?: string[]
    genres?: string[]
    platforms?: string[]
    maxPrice?: number
    minSessionMinutes?: number
    maxSessionMinutes?: number
    playerModes?: string[]
    difficulty?: string[]
}

const normalizeTag = (value: string) => value.trim().toLowerCase()

export const filterGames = (
    filters: GameCatalogFilters,
    games: GameRecord[] = gameCatalog,
): GameRecord[] =>
    games.filter((game) => {
        if (filters.moods?.length && !filters.moods.some((tag) => game.moodTags.some((value) => normalizeTag(value) === normalizeTag(tag)))) return false
        if (filters.genres?.length && !filters.genres.some((tag) => game.genres.some((value) => normalizeTag(value) === normalizeTag(tag)))) return false
        if (filters.platforms?.length && !filters.platforms.some((tag) => game.platforms.some((value) => normalizeTag(value) === normalizeTag(tag)))) return false
        if (filters.playerModes?.length) {
            const modes = game.playerModes.map(normalizeTag)
            const matchesMode = filters.playerModes.some((requested) => {
                const mode = normalizeTag(requested)
                if (mode === "cooperative") return modes.some((value) => value.includes("co-op") || value.includes("cooperative"))
                if (mode === "online multiplayer") return modes.some((value) => value.includes("online") && value.includes("multiplayer"))
                return modes.includes(mode)
            })
            if (!matchesMode) return false
        }
        if (filters.maxPrice !== undefined && game.price > filters.maxPrice) return false
        if (filters.minSessionMinutes !== undefined && game.sessionMinutes < filters.minSessionMinutes) return false
        if (filters.maxSessionMinutes !== undefined && game.sessionMinutes > filters.maxSessionMinutes) return false
        if (filters.difficulty?.length && !filters.difficulty.some((value) => normalizeTag(value) === normalizeTag(game.difficulty))) return false
        return true
    })
