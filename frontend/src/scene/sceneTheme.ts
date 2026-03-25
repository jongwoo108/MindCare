import type { TimeOfDay } from './useTimeOfDay'

export interface SceneTheme {
  // 헤더 / 푸터
  chrome: string
  // AI 말풍선
  aiBubble: string
  aiText: string
  // 사용자 말풍선
  userBubble: string
  userText: string
  // 위기 버블
  crisisBubble: string
  crisisText: string
  // 입력창
  input: string
  inputPlaceholder: string
  // Quick reply 칩
  chip: string
  // 서브텍스트 (에이전트 레이블, 타임스탬프)
  sub: string
  // 전송 버튼
  sendBtn: string
}

const THEMES: Record<TimeOfDay, SceneTheme> = {
  morning: {
    chrome:        'bg-white/25 backdrop-blur-md border-black/[0.06]',
    aiBubble:      'bg-white/65 backdrop-blur-sm border border-black/[0.07]',
    aiText:        'text-slate-800',
    userBubble:    'bg-sky-500/80 backdrop-blur-sm border border-sky-400/40',
    userText:      'text-white',
    crisisBubble:  'bg-red-100/70 backdrop-blur-sm border border-red-300/50',
    crisisText:    'text-red-800',
    input:         'bg-white/50 border-black/[0.10] text-slate-800 placeholder-slate-400 focus:border-sky-400/60 focus:ring-sky-400/20',
    inputPlaceholder: 'placeholder-slate-400',
    chip:          'border-sky-500/40 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25',
    sub:           'text-slate-500',
    sendBtn:       'bg-sky-500 hover:bg-sky-400',
  },
  afternoon: {
    chrome:        'bg-sky-900/20 backdrop-blur-md border-white/[0.10]',
    aiBubble:      'bg-white/55 backdrop-blur-sm border border-black/[0.06]',
    aiText:        'text-slate-800',
    userBubble:    'bg-sky-600/75 backdrop-blur-sm border border-sky-500/40',
    userText:      'text-white',
    crisisBubble:  'bg-red-100/70 backdrop-blur-sm border border-red-300/50',
    crisisText:    'text-red-800',
    input:         'bg-white/45 border-black/[0.08] text-slate-800 placeholder-slate-400 focus:border-sky-400/60 focus:ring-sky-400/20',
    inputPlaceholder: 'placeholder-slate-400',
    chip:          'border-sky-500/40 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25',
    sub:           'text-slate-500',
    sendBtn:       'bg-sky-600 hover:bg-sky-500',
  },
  evening: {
    chrome:        'bg-orange-950/30 backdrop-blur-md border-white/[0.07]',
    aiBubble:      'bg-slate-900/55 backdrop-blur-sm border border-white/[0.08]',
    aiText:        'text-slate-200',
    userBubble:    'bg-orange-900/65 backdrop-blur-sm border border-orange-700/40',
    userText:      'text-orange-50',
    crisisBubble:  'bg-red-950/50 backdrop-blur-sm border border-red-900/30',
    crisisText:    'text-red-200',
    input:         'bg-slate-900/40 border-white/[0.08] text-slate-200 placeholder-slate-500 focus:border-orange-500/40 focus:ring-orange-500/15',
    inputPlaceholder: 'placeholder-slate-500',
    chip:          'border-orange-500/35 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20',
    sub:           'text-slate-500',
    sendBtn:       'bg-orange-700 hover:bg-orange-600',
  },
  night: {
    chrome:        'bg-black/30 backdrop-blur-md border-white/[0.08]',
    aiBubble:      'bg-slate-900/60 backdrop-blur-sm border border-white/[0.09]',
    aiText:        'text-slate-200',
    userBubble:    'bg-indigo-900/70 backdrop-blur-sm border border-indigo-700/40',
    userText:      'text-indigo-100',
    crisisBubble:  'bg-red-950/50 backdrop-blur-sm border border-red-900/30',
    crisisText:    'text-red-200',
    input:         'bg-slate-900/40 border-white/[0.08] text-slate-200 placeholder-slate-600 focus:border-indigo-500/40 focus:ring-indigo-500/20',
    inputPlaceholder: 'placeholder-slate-600',
    chip:          'border-indigo-500/35 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
    sub:           'text-slate-600',
    sendBtn:       'bg-indigo-600 hover:bg-indigo-500',
  },
}

export function getTheme(period: TimeOfDay): SceneTheme {
  return THEMES[period]
}
