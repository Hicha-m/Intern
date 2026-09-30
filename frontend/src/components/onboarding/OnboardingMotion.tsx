import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MotionContext, cancel, type Motion } from './onboarding-motion'

/** Motion is progressive enhancement: no animation delays a save or hides a control. */
export function OnboardingMotion({ children }: { children: ReactNode }) {
  const shell = useRef<HTMLDivElement>(null)
  const [motion] = useState<Motion>(() => ({
    pointer: false, previousStep: null, animations: new Set(),
    enterStep(step) { const previous = this.previousStep; this.previousStep = step; return previous },
    play(element, frames, staged = false, delay = 0) {
      if (!element || !this.pointer || !element.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return null
      const style = getComputedStyle(element)
      // Cancel only animations we own, not a nested control's independent feedback.
      this.animations.forEach(animation => {
        if ((animation.effect as KeyframeEffect | null)?.target === element) { animation.cancel(); this.animations.delete(animation) }
      })
      const animation = element.animate(frames, {
        duration: parseFloat(style.getPropertyValue(staged ? '--duration-enter' : '--duration-fast')),
        easing: style.getPropertyValue(staged ? '--ease-enter' : '--ease-interactive').trim(),
        delay, fill: 'backwards',
      })
      this.animations.add(animation)
      animation.onfinish = animation.oncancel = () => this.animations.delete(animation)
      return animation
    },
  }))
  const motionRef = useRef(motion)
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = () => { motion.pointer = true; if (shell.current) shell.current.dataset.motion = 'pointer' }
    const keyboard = () => { motion.pointer = false; if (shell.current) shell.current.dataset.motion = 'keyboard'; cancel(motion) }
    const preference = () => { if (reduce.matches) cancel(motion) }
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('keydown', keyboard, true)
    reduce.addEventListener('change', preference)
    return () => {
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('keydown', keyboard, true)
      reduce.removeEventListener('change', preference)
      cancel(motion)
    }
  }, [motion])
  return <MotionContext value={motionRef}><div ref={shell} className="resume-shell" data-motion="keyboard">{children}</div></MotionContext>
}
