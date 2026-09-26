import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function token(name:string):string {
  const match=css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`,'i'))
  if (!match) throw new Error(`Missing color token ${name}`)
  return match[1]
}
function luminance(hex:string):number {
  const channels=[1,3,5].map(index=>Number.parseInt(hex.slice(index,index+2),16)/255).map(channel=>channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4)
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722
}
function contrast(foreground:string,background:string):number {
  const [a,b]=[luminance(token(foreground)),luminance(token(background))].sort((x,y)=>y-x)
  return (a+0.05)/(b+0.05)
}

describe('design-system readable color pairs',()=>{
  it.each([
    ['--color-black','--color-gold'],['--color-text','--color-white'],['--color-text-secondary','--color-white'],['--color-text-secondary','--color-surface'],['--color-warning-text','--color-warning-bg'],['--color-live-text','--color-live-bg'],['--color-snapshot-text','--color-snapshot-bg'],['--color-error-text','--color-error-bg'],['--color-assumption-text','--color-assumption-bg'],
  ])('%s on %s meets normal-text contrast', (foreground,background)=>{
    expect(contrast(foreground,background)).toBeGreaterThanOrEqual(4.5)
  })
  it('provides a visible field boundary on white',()=>{
    expect(contrast('--color-field-border','--color-white')).toBeGreaterThanOrEqual(3)
  })
})
