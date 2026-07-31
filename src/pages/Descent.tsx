import { useRef, type CSSProperties } from 'react'
import {
  gsap,
  useGSAP,
  MOTION_OK,
  MOTION_REDUCED,
  Stage3D,
  useScrollProgress,
} from '@/engine'
import { DescentScene } from './descent/Scene'
import { Hud, type HudHandle } from './descent/Hud'
import { descent, entryDepth, formatMetres } from './descent/depth'
import posterUrl from './descent/assets/poster.svg'
import './descent/fonts.css'

/**
 * The Descent Log.
 *
 * One structural idea: the page is a depth gauge. There are no sections —
 * depth is the only structure, scroll maps to it linearly, and the fish holds
 * frame while the world moves past it.
 *
 * Everything is driven by a single scrubbed ScrollTrigger writing to a plain
 * mutable object (`descent.progress`), which the shaders and the HUD read.
 * No React state is involved in the scroll path.
 */

const ENTRIES = [
  'Red is the first colour the sea takes. It is already gone. He is still orange — but not to anything down here, and not to himself.',
  'The last depth at which a plant has ever grown. Below this, nothing photosynthesises. Everything that lives is living on what falls.',
  'Twilight. Ninety-nine percent of the surface is gone. The things that live here have stopped waiting for light and started making it.',
  'He was bred for a bowl. Forty generations of still water, fed twice a day, turning in a circle roughly the length of his own body.',
  'Nothing at this depth has needed eyes for a very long time. Several things down here still have them anyway.',
  'Three hundred and forty atmospheres. Four degrees. This is perfectly ordinary — most of the ocean is like this. The surface is the strange part.',
]

export function Descent() {
  const root = useRef<HTMLDivElement>(null)
  const hud = useRef<HudHandle | null>(null)

  // The scroll -> WebGL bridge. Writes `descent` for the shaders and drives the
  // HUD's textContent directly, so nothing here costs a React render. Reduced
  // motion drops the scrub easing but keeps tracking scroll.
  useScrollProgress(root, descent, {
    onUpdate: (progress) => hud.current?.update(progress),
  })

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add(MOTION_OK, () => {
        gsap.from('[data-entry]', {
          y: 34,
          opacity: 0,
          duration: 1.1,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: '[data-log]',
            start: 'top 80%',
            end: 'bottom 60%',
            scrub: 1,
          },
        })

        gsap.from('[data-hero-line]', {
          y: 26,
          opacity: 0,
          duration: 1.2,
          ease: 'power3.out',
          stagger: 0.12,
          delay: 0.15,
        })
      })

      mm.add(MOTION_REDUCED, () => {
        // The resolved end state, instantly. Without this the copy sits at
        // opacity 0 forever and the page is blank water.
        gsap.set('[data-entry], [data-hero-line]', { y: 0, opacity: 1 })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div
      ref={root}
      className="relative text-white"
      style={
        {
          '--color-accent': '#ff6b1a',
          '--font-display': "'Instrument Serif', Georgia, serif",
          '--font-text': "'JetBrains Mono', ui-monospace, monospace",
        } as CSSProperties
      }
    >
      <Stage3D
        placement="layer"
        poster={posterUrl}
        posterAlt=""
        camera={{ position: [0, 0, 5], fov: 42 }}
        frameloop="always"
      >
        <DescentScene />
      </Stage3D>

      <Hud handleRef={hud} />

      {/* Surface */}
      <section className="relative flex min-h-screen flex-col justify-end px-6 pb-[14vh] sm:px-16">
        <p
          data-hero-line
          className="font-text text-[10px] tracking-[0.34em] text-white/40 uppercase"
        >
          descent log — specimen 001
        </p>
        <h1
          data-hero-line
          className="mt-6 font-display text-[clamp(2.8rem,10vw,7.5rem)] leading-[0.86] font-normal tracking-[-0.02em]"
        >
          Carassius
          <br />
          <span className="italic text-accent">auratus</span>
        </h1>
        <p
          data-hero-line
          className="mt-8 max-w-[34ch] font-text text-[13px] leading-relaxed text-white/55"
        >
          Common goldfish. Native range: still, shallow, fresh water. Present
          position: the open ocean, and going down.
        </p>
      </section>

      {/* The descent. One entry per depth, spaced a screen apart so the water
          has room to change between them. */}
      <div data-log>
        {ENTRIES.map((body, index) => (
          <section
            key={body}
            /* Portrait puts the copy in the lower third so the fish keeps the
               upper frame to itself — centred text lands straight on top of it
               at 375, where there is no horizontal room to step aside. */
            className="relative flex min-h-screen items-end px-6 pb-[20vh] sm:items-center sm:px-16 sm:pb-0"
          >
            {/* Capped at 40ch: the measure reads better for display type, and a
                wider column ran into the fish, which sits just right of centre. */}
            <div data-entry className="max-w-[40ch]">
              <p className="font-text text-[10px] tracking-[0.3em] text-accent uppercase">
                {formatMetres(entryDepth(index))} m
              </p>
              <p className="mt-5 font-display text-[clamp(1.35rem,3.2vw,2.4rem)] leading-[1.24] text-white/92">
                {body}
              </p>
            </div>
          </section>
        ))}
      </div>

      {/* Floor */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p
          data-entry
          className="font-text text-[10px] tracking-[0.3em] text-white/50 uppercase"
        >
          3 800 m — seafloor
        </p>
        <p
          data-entry
          className="mt-8 max-w-[30ch] font-display text-[clamp(1.6rem,4vw,3rem)] leading-[1.15] text-white/85"
        >
          Somewhere above, on a windowsill, the tank light is still on its timer.
        </p>
        <p
          data-entry
          className="mt-10 font-text text-[10px] tracking-[0.3em] text-white/35 uppercase"
        >
          end of log
        </p>
      </section>
    </div>
  )
}
