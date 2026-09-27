export type AccountIdentity = { userId: string | null; epoch: number }

export function accountTransition(current: AccountIdentity, nextUserId: string | null): AccountIdentity & { changed: boolean } {
  const changed = current.userId !== nextUserId
  return { userId: nextUserId, epoch: current.epoch + (changed ? 1 : 0), changed }
}
