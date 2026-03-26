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
  // 서브텍스트
  sub: string
  // 전송 버튼
  sendBtn: string
  // 모달
  modalBackdrop: string   // fixed 배경 오버레이
  modalPanel: string      // 모달 카드
  modalTitle: string      // 제목 텍스트
  modalBody: string       // 본문 텍스트
  modalOption: string     // 선택지 버튼 (미선택)
  modalOptionSel: string  // 선택지 버튼 (선택됨)
  modalTextarea: string   // 텍스트에어리어
  modalProgressBg: string // 진행 바 배경
  modalProgressFill: string // 진행 바 채우기
  modalPrimaryBtn: string  // 주요 버튼 (시작하기 등)
}

const THEMES: Record<TimeOfDay, SceneTheme> = {
  morning: {
    chrome:           'bg-white/25 backdrop-blur-md border-black/[0.06]',
    aiBubble:         'bg-white/35 backdrop-blur-md border border-black/[0.06]',
    aiText:           'text-slate-800',
    userBubble:       'bg-sky-500/50 backdrop-blur-md border border-sky-400/30',
    userText:         'text-white',
    crisisBubble:     'bg-red-100/40 backdrop-blur-md border border-red-300/40',
    crisisText:       'text-red-800',
    input:            'bg-white/50 border-black/[0.10] text-slate-800 placeholder-slate-400 focus:border-sky-400/60 focus:ring-sky-400/20',
    inputPlaceholder: 'placeholder-slate-400',
    chip:             'border-sky-500/40 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25',
    sub:              'text-slate-500',
    sendBtn:          'bg-sky-500 hover:bg-sky-400',
    modalBackdrop:    'bg-black/30 backdrop-blur-md',
    modalPanel:       'bg-white/80 backdrop-blur-xl border border-black/[0.08]',
    modalTitle:       'text-slate-800',
    modalBody:        'text-slate-600',
    modalOption:      'bg-white/60 border-black/[0.08] text-slate-700 hover:border-sky-400/50 hover:text-slate-800',
    modalOptionSel:   'bg-sky-500/15 border-sky-500/50 text-sky-700',
    modalTextarea:    'bg-white/60 border-black/[0.08] text-slate-800 placeholder-slate-400 focus:border-sky-400/50 focus:ring-sky-400/20',
    modalProgressBg:  'bg-black/[0.06]',
    modalProgressFill:'bg-sky-500/70',
    modalPrimaryBtn:  'bg-sky-500 hover:bg-sky-400 text-white',
  },
  afternoon: {
    chrome:           'bg-sky-900/20 backdrop-blur-md border-white/[0.10]',
    aiBubble:         'bg-white/30 backdrop-blur-md border border-black/[0.05]',
    aiText:           'text-slate-800',
    userBubble:       'bg-sky-600/50 backdrop-blur-md border border-sky-500/30',
    userText:         'text-white',
    crisisBubble:     'bg-red-100/40 backdrop-blur-md border border-red-300/40',
    crisisText:       'text-red-800',
    input:            'bg-white/45 border-black/[0.08] text-slate-800 placeholder-slate-400 focus:border-sky-400/60 focus:ring-sky-400/20',
    inputPlaceholder: 'placeholder-slate-400',
    chip:             'border-sky-500/40 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25',
    sub:              'text-slate-500',
    sendBtn:          'bg-sky-600 hover:bg-sky-500',
    modalBackdrop:    'bg-black/30 backdrop-blur-md',
    modalPanel:       'bg-white/75 backdrop-blur-xl border border-black/[0.08]',
    modalTitle:       'text-slate-800',
    modalBody:        'text-slate-600',
    modalOption:      'bg-white/55 border-black/[0.08] text-slate-700 hover:border-sky-400/50 hover:text-slate-800',
    modalOptionSel:   'bg-sky-500/15 border-sky-500/50 text-sky-700',
    modalTextarea:    'bg-white/55 border-black/[0.08] text-slate-800 placeholder-slate-400 focus:border-sky-400/50 focus:ring-sky-400/20',
    modalProgressBg:  'bg-black/[0.06]',
    modalProgressFill:'bg-sky-600/70',
    modalPrimaryBtn:  'bg-sky-600 hover:bg-sky-500 text-white',
  },
  evening: {
    chrome:           'bg-orange-950/30 backdrop-blur-md border-white/[0.07]',
    aiBubble:         'bg-slate-900/38 backdrop-blur-md border border-white/[0.07]',
    aiText:           'text-slate-200',
    userBubble:       'bg-orange-900/45 backdrop-blur-md border border-orange-700/30',
    userText:         'text-orange-50',
    crisisBubble:     'bg-red-950/35 backdrop-blur-md border border-red-900/25',
    crisisText:       'text-red-200',
    input:            'bg-slate-900/40 border-white/[0.08] text-slate-200 placeholder-slate-500 focus:border-orange-500/40 focus:ring-orange-500/15',
    inputPlaceholder: 'placeholder-slate-500',
    chip:             'border-orange-500/35 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20',
    sub:              'text-slate-500',
    sendBtn:          'bg-orange-700 hover:bg-orange-600',
    modalBackdrop:    'bg-black/50 backdrop-blur-md',
    modalPanel:       'bg-slate-900/80 backdrop-blur-xl border border-white/[0.08]',
    modalTitle:       'text-slate-200',
    modalBody:        'text-slate-400',
    modalOption:      'bg-slate-800/60 border-white/[0.07] text-slate-300 hover:border-orange-500/40 hover:text-slate-200',
    modalOptionSel:   'bg-orange-500/15 border-orange-500/45 text-orange-200',
    modalTextarea:    'bg-slate-800/60 border-white/[0.07] text-slate-200 placeholder-slate-500 focus:border-orange-500/40 focus:ring-orange-500/15',
    modalProgressBg:  'bg-white/[0.06]',
    modalProgressFill:'bg-orange-500/60',
    modalPrimaryBtn:  'bg-orange-700 hover:bg-orange-600 text-white',
  },
  night: {
    chrome:           'bg-black/30 backdrop-blur-md border-white/[0.08]',
    aiBubble:         'bg-slate-900/42 backdrop-blur-md border border-white/[0.08]',
    aiText:           'text-slate-200',
    userBubble:       'bg-indigo-900/50 backdrop-blur-md border border-indigo-700/30',
    userText:         'text-indigo-100',
    crisisBubble:     'bg-red-950/38 backdrop-blur-md border border-red-900/25',
    crisisText:       'text-red-200',
    input:            'bg-slate-900/40 border-white/[0.08] text-slate-200 placeholder-slate-600 focus:border-indigo-500/40 focus:ring-indigo-500/20',
    inputPlaceholder: 'placeholder-slate-600',
    chip:             'border-indigo-500/35 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
    sub:              'text-slate-600',
    sendBtn:          'bg-indigo-600 hover:bg-indigo-500',
    modalBackdrop:    'bg-black/60 backdrop-blur-md',
    modalPanel:       'bg-slate-900/85 backdrop-blur-xl border border-white/[0.08]',
    modalTitle:       'text-slate-200',
    modalBody:        'text-slate-500',
    modalOption:      'bg-slate-800/70 border-white/[0.06] text-slate-400 hover:border-white/[0.12] hover:text-slate-300',
    modalOptionSel:   'bg-indigo-500/15 border-indigo-500/40 text-indigo-200',
    modalTextarea:    'bg-slate-800/70 border-white/[0.08] text-slate-300 placeholder-slate-600 focus:border-indigo-500/40 focus:ring-indigo-500/20',
    modalProgressBg:  'bg-white/[0.05]',
    modalProgressFill:'bg-indigo-500/60',
    modalPrimaryBtn:  'bg-indigo-600 hover:bg-indigo-500 text-white',
  },
}

export function getTheme(period: TimeOfDay): SceneTheme {
  return THEMES[period]
}
