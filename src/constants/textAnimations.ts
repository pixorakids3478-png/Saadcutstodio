import { TextAnimationType, TextClipData } from '../types/editor';

export interface TextAnimationPreset {
  id: TextAnimationType;
  name: string;
  category: 'Entrance' | 'Titles' | 'Kinetic' | 'Broadcast';
  description: string;
  defaultDuration: number;
}

export const TEXT_ANIMATIONS: TextAnimationPreset[] = [
  {
    id: 'typewriter',
    name: 'Typewriter',
    category: 'Kinetic',
    description: 'Letter-by-letter mechanical typing effect with blinking cursor emulation.',
    defaultDuration: 1.8,
  },
  {
    id: 'fade_in',
    name: 'Fade In',
    category: 'Entrance',
    description: 'Silky smooth opacity dissolve from complete transparency.',
    defaultDuration: 0.8,
  },
  {
    id: 'fade_out',
    name: 'Fade Out',
    category: 'Entrance',
    description: 'Graceful opacity exit at the tail of the clip.',
    defaultDuration: 0.8,
  },
  {
    id: 'slide_left',
    name: 'Slide In Left',
    category: 'Entrance',
    description: 'Accelerated glide entering from the left edge to resting position.',
    defaultDuration: 0.7,
  },
  {
    id: 'slide_right',
    name: 'Slide In Right',
    category: 'Entrance',
    description: 'Dynamic entrance sliding in from the right edge.',
    defaultDuration: 0.7,
  },
  {
    id: 'slide_up',
    name: 'Slide Up',
    category: 'Entrance',
    description: 'Modern vertical upward translation with smooth deceleration.',
    defaultDuration: 0.7,
  },
  {
    id: 'slide_down',
    name: 'Slide Down',
    category: 'Entrance',
    description: 'Authoritative downward descent with subtle dampening.',
    defaultDuration: 0.7,
  },
  {
    id: 'pop_in',
    name: 'Pop In',
    category: 'Kinetic',
    description: 'Energetic scale expansion with a punchy snappy bounce overshoot.',
    defaultDuration: 0.5,
  },
  {
    id: 'zoom_in',
    name: 'Zoom In',
    category: 'Kinetic',
    description: 'Dramatic push-in scaling from 0% to 100% full frame presence.',
    defaultDuration: 0.9,
  },
  {
    id: 'zoom_out',
    name: 'Zoom Out',
    category: 'Kinetic',
    description: 'Cinematic wide pullback scaling from 180% down to 100%.',
    defaultDuration: 0.9,
  },
  {
    id: 'bounce',
    name: 'Bounce',
    category: 'Kinetic',
    description: 'Playful multi-stage elastic bounce landing on baseline.',
    defaultDuration: 0.9,
  },
  {
    id: 'tracking_reveal',
    name: 'Tracking Reveal',
    category: 'Titles',
    description: 'Slow expansive letter spacing stretch inspired by high-end title design.',
    defaultDuration: 2.2,
  },
  {
    id: 'cinematic_title',
    name: 'Cinematic Title',
    category: 'Titles',
    description: 'Epic slow push forward with subtle tracking and soft atmospheric fade.',
    defaultDuration: 2.5,
  },
  {
    id: 'lower_third',
    name: 'Lower Third',
    category: 'Broadcast',
    description: 'Broadcast documentary lower-third ribbon slide with subtitle hierarchy.',
    defaultDuration: 1.0,
  },
  {
    id: 'subtitle_style',
    name: 'Subtitle Style',
    category: 'Broadcast',
    description: 'Clean high-readability caption box with instant syllable cadence.',
    defaultDuration: 0.3,
  },
  {
    id: 'end_credits',
    name: 'End Credits',
    category: 'Broadcast',
    description: 'Steady cinematic vertical roll upwards from bottom to top of screen.',
    defaultDuration: 4.0,
  },
];

export const DEFAULT_TEXT_CLIP: TextClipData = {
  text: 'SaadCut Studio',
  fontFamily: 'Inter',
  fontSize: 56,
  fontWeight: '700',
  color: '#ffffff',
  textAlign: 'center',
  letterSpacing: 2,
  outlineWidth: 0,
  outlineColor: '#000000',
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 4,
  shadowColor: 'rgba(0,0,0,0.7)',
  backgroundColor: 'transparent',
  backgroundPadding: 12,
  borderRadius: 8,
  animation: 'fade_in',
  animationDuration: 0.8,
  animationDelay: 0,
  isUrdu: false,
  titleSafeGuide: false,
};
