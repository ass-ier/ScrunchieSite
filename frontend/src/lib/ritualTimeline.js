export const RITUAL_LOOKS = [
  {
    id: 'ponytail', label: 'The ponytail', prompt: 'Ponytails?', answer: 'Up for anything.',
    copy: 'A little lift. A little swish. A whole lot of you.',
    alt: 'The owner of AKEYA in profile, wearing a pink scrunchie around a curly ponytail.',
    progress: 0.2, width: 667, height: 667,
  },
  {
    id: 'bun', label: 'The messy bun', prompt: 'Messy buns?', answer: 'Perfectly unplanned.',
    copy: 'Twist it up. Let a few curls do their own thing.',
    alt: 'The owner of AKEYA in profile, wearing a pink scrunchie around a high curly bun.',
    progress: 0.6, width: 666, height: 667,
  },
  {
    id: 'wrist', label: 'On your wrist', prompt: 'On your wrist?', answer: 'Not just for your hair.',
    copy: 'A little company for your hand. Ready whenever your hair is.',
    alt: 'The owner of AKEYA with her hand raised beside her hair and a pink scrunchie on her wrist.',
    progress: 1, width: 667, height: 667,
  },
]

export function scrollProgress(top, sectionHeight, stageHeight, stickyTop) {
  const travel = sectionHeight - stageHeight
  if (travel <= 0) return 0
  return Math.max(0, Math.min(1, (stickyTop - top) / travel))
}

export function lookAtProgress(progress) {
  return Math.min(2, Math.floor(Math.round(positionAtProgress(progress)) / 2))
}

export function positionAtProgress(progress, animated = true) {
  const distance = Math.max(0, Math.min(1, progress)) * 5
  if (!animated) return Math.round(distance)
  const segment = Math.floor(distance)
  const fraction = distance - segment
  // Hold each composition briefly, then ease the whole scene into the next one.
  const t = Math.max(0, Math.min(1, (fraction - 0.16) / 0.68))
  return segment + t * t * (3 - 2 * t)
}
