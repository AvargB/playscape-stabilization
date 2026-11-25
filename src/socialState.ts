import { socialPeople, type InviteStatus, type SocialInvite } from './socialData'

/** Re-exported so existing imports of these helpers keep working. */
export type { InviteStatus, SocialInvite } from './socialData'

export type CircleLike = {
  id: string
  name?: string
  members: string[]
  joined?: boolean
  wishlist?: number[]
}

export type PersonLike = {
  id: string
  name: string
  interests?: string[]
  wishlist?: number[]
  owned?: number[]
  playing?: number[]
}

export function buildInviteSuggestions(
  circles: CircleLike[] = [],
  people: PersonLike[] = [],
  circleId: string,
  pendingInvites: { circle: string; person: string; status?: string }[] = []
) {
  const circle = circles.find((entry) => entry.id === circleId)
  if (!circle) return []

  const memberIds = new Set(circle.members)
  const memberWishlist = new Set(circle.wishlist || [])
  const pendingPersonIds = new Set(
    pendingInvites
      .filter((invite) => invite.circle === circleId && invite.status === 'pending')
      .map((invite) => invite.person)
  )
  const memberInterests = new Set(
    people
      .filter((person) => memberIds.has(person.id))
      .flatMap((person) => person.interests || [])
  )

  return people
    .filter(
      (person) =>
        person.id !== 'you' &&
        !memberIds.has(person.id) &&
        !pendingPersonIds.has(person.id)
    )
    .map((person) => {
      const sharedInterests = (person.interests || []).filter((interest) =>
        memberInterests.has(interest)
      )
      const wishlistOverlap = (person.wishlist || []).filter((gameId) =>
        memberWishlist.has(gameId)
      )
      const ownedOverlap = (person.owned || []).filter((gameId) =>
        memberWishlist.has(gameId)
      )
      const score =
        wishlistOverlap.length * 4 +
        sharedInterests.length * 3 +
        ownedOverlap.length * 2

      const reason = [
        wishlistOverlap.length
          ? `shares ${wishlistOverlap.length} wishlist pick${wishlistOverlap.length === 1 ? '' : 's'}`
          : null,
        sharedInterests.length
          ? `matches ${sharedInterests.length} interest${sharedInterests.length === 1 ? '' : 's'}`
          : null,
      ]
        .filter(Boolean)
        .join(' and ')

      return {
        personId: person.id,
        score,
        reason: reason || 'could bring a fresh perspective to the group',
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function getPendingInviteSummary(
  invites: SocialInvite[],
  circles: CircleLike[] = []
) {
  const pending = invites.filter((invite) => invite.status === 'pending')
  const accepted = invites.filter((invite) => invite.status === 'accepted')
  const declined = invites.filter((invite) => invite.status === 'declined')
  const counts = pending.reduce<Record<string, number>>((acc, invite) => {
    acc[invite.circle] = (acc[invite.circle] || 0) + 1
    return acc
  }, {})

  return {
    total: pending.length,
    pending: pending.length,
    accepted: accepted.length,
    declined: declined.length,
    byCircle: Object.entries(counts).map(([circleId, count]) => ({
      circleId,
      count,
      name:
        circles.find((circle) => circle.id === circleId)?.name || 'Unknown circle',
    })),
  }
}

export function applyInviteDecision<T extends CircleLike = CircleLike>(
  invites: SocialInvite[],
  circles: T[] = [],
  inviteId: string,
  nextStatus: InviteStatus
): { invites: SocialInvite[]; circles: T[] } {
  const invite = invites.find((entry) => entry.id === inviteId)
  if (!invite) {
    return { invites, circles }
  }

  const updatedInvites = invites.map((entry) =>
    entry.id === inviteId ? { ...entry, status: nextStatus } : entry
  )

  if (nextStatus !== 'accepted') {
    return { invites: updatedInvites, circles }
  }

  const updatedCircles = circles.map((circle) => {
    if (circle.id !== invite.circle) return circle
    if (circle.members.includes(invite.person)) {
      return circle
    }

    return {
      ...circle,
      joined: true,
      members: [...circle.members, invite.person],
    }
  })

  return { invites: updatedInvites, circles: updatedCircles }
}

export type CircleInviteResult = 'added' | 'invalid' | 'member' | 'pending'

/**
 * Creates a pending invitation without changing circle membership. This is the
 * single implementation used by dialogs and by the shared social-state hook.
 */
export function createCircleInvite(
  invites: SocialInvite[],
  circles: CircleLike[],
  circleId: string,
  personId: string,
  id: string
): { invites: SocialInvite[]; result: CircleInviteResult } {
  const circle = circles.find((entry) => entry.id === circleId)
  if (!circle || !socialPeople.some((person) => person.id === personId)) {
    return { invites, result: 'invalid' }
  }
  if (circle.members.includes(personId)) {
    return { invites, result: 'member' }
  }
  if (
    invites.some(
      (invite) =>
        invite.circle === circleId &&
        invite.person === personId &&
        invite.status === 'pending'
    )
  ) {
    return { invites, result: 'pending' }
  }

  return {
    invites: [
      ...invites,
      { id, circle: circleId, person: personId, status: 'pending' },
    ],
    result: 'added',
  }
}
