import { describe, expect, it } from 'vitest'
import { accountTransition } from './account-auth'

describe('account identity transitions', () => {
  it('keeps loaded projects and request epoch during a same-user token refresh', () => {
    expect(accountTransition({ userId: 'user-a', epoch: 3 }, 'user-a')).toEqual({ userId: 'user-a', epoch: 3, changed: false })
  })

  it('invalidates old requests when the account changes or signs out', () => {
    expect(accountTransition({ userId: 'user-a', epoch: 3 }, 'user-b')).toEqual({ userId: 'user-b', epoch: 4, changed: true })
    expect(accountTransition({ userId: 'user-a', epoch: 3 }, null)).toEqual({ userId: null, epoch: 4, changed: true })
  })
})
