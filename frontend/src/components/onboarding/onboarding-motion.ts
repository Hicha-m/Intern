import { createContext, useContext, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

export type Motion = {
  pointer: boolean
  previousStep: number | null
  enterStep: (step: number) => number | null
  animations: Set<Animation>
  play: (element: HTMLElement | null, frames: Keyframe[], staged?: boolean, delay?: number) => Animation | null
}
export const MotionContext = createContext<RefObject<Motion> | null>(null)

export function cancel(motion: Motion) {
  motion.animations.forEach(animation => animation.cancel())
  motion.animations.clear()
}

export function useOnboardingStepMotion(step: number, ready: boolean) {
  const motionRef = useContext(MotionContext)
  const card = useRef<HTMLDivElement>(null)
  const entry = useRef<{ from: number | null; played: boolean } | null>(null)
  useLayoutEffect(() => {
    const motion = motionRef?.current
    if (!motion || !card.current) return
    if (!entry.current) {
      entry.current = { from: motion.enterStep(step), played: false }
    }
    if (!ready || entry.current.played) return
    entry.current.played = true
    const from = entry.current.from
    // Initial visits and reloads are immediate. Animate only an actual step change.
    if (from === null || from === step) return
    const heading = card.current.querySelector<HTMLElement>('h1')
    heading?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
    const style = getComputedStyle(card.current)
    const offset = style.getPropertyValue('--motion-enter-offset').trim()
    const direction = from < step ? offset : `calc(-1 * ${offset})`
    const frames = [{ opacity: 0, transform: `translateX(${direction})` }, { opacity: 1, transform: 'translateX(0)' }]
    const animations = [
      motion.play(heading, frames, true),
      motion.play(card.current.querySelector('form'), frames, true, parseFloat(style.getPropertyValue('--duration-stagger'))),
      motion.play(card.current.querySelector('[aria-current="step"] .onboarding-step-line'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], true),
    ]
    return () => animations.forEach(animation => animation?.cancel())
  }, [motionRef, ready, step])
  return card
}

/** Reveal newly added content; loading an existing profile never replays it. */
export function useOnboardingReveals(root: RefObject<HTMLElement | null>, revision: string, ready: boolean) {
  const motionRef = useContext(MotionContext)
  const previous = useRef<Set<string> | null>(null)
  useLayoutEffect(() => {
    const motion = motionRef?.current
    if (!motion || !root.current || !ready) return
    const elements = [...root.current.querySelectorAll<HTMLElement>('[data-onboarding-reveal]')]
    const keys = new Set(elements.map(element => element.dataset.onboardingReveal!))
    const animations = elements.filter(element => previous.current && !previous.current.has(element.dataset.onboardingReveal!)).map(element =>
      motion.play(element, [{ opacity: 0, transform: 'translateY(var(--space-2))' }, { opacity: 1, transform: 'translateY(0)' }]))
    previous.current = keys
    return () => animations.forEach(animation => animation?.cancel())
  }, [motionRef, root, revision, ready])
}
