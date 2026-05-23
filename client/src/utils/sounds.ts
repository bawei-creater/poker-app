let audioCtx: AudioContext | null = null;
let lastVoiceAt = 0;
let voiceEnabled = false;
let speechVoices: SpeechSynthesisVoice[] = [];
const activeUtterances = new Set<SpeechSynthesisUtterance>();

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  speechVoices = window.speechSynthesis.getVoices();
}

function getChineseVoice() {
  loadVoices();
  return (
    speechVoices.find(v => v.lang.toLowerCase() === 'zh-cn') ??
    speechVoices.find(v => v.lang.toLowerCase().startsWith('zh')) ??
    speechVoices.find(v => /xiaoxiao|huihui|yaoyao|yunxi|mandarin|chinese|中文|普通话/i.test(v.name)) ??
    null
  );
}

export function getVoiceStatus() {
  if (!('speechSynthesis' in window)) {
    return { supported: false, hasChineseVoice: false, message: '当前浏览器不支持语音播报' };
  }

  const voice = getChineseVoice();
  return {
    supported: true,
    hasChineseVoice: Boolean(voice),
    message: voice ? `语音已开启：${voice.name}` : '语音已开启，但系统没有中文语音包',
  };
}

export function enableVoice() {
  voiceEnabled = true;
  loadVoices();
  window.speechSynthesis?.resume();
}

export function testVoice() {
  enableVoice();
  const status = getVoiceStatus();
  speakChinese('语音已开启', true);
  return status;
}

function speakChinese(text: string, force = false): boolean {
  if (!voiceEnabled || !('speechSynthesis' in window)) return false;

  const now = Date.now();
  if (!force && now - lastVoiceAt < 260) return false;
  lastVoiceAt = now;

  loadVoices();
  if (speechVoices.length === 0) {
    window.setTimeout(() => speakChinese(text, true), 350);
    return true;
  }

  const voice = getChineseVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 0.9;
  utterance.onend = () => activeUtterances.delete(utterance);
  utterance.onerror = () => activeUtterances.delete(utterance);
  activeUtterances.add(utterance);

  window.speechSynthesis.resume();
  if (force) window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  window.addEventListener('pointerdown', enableVoice, { once: true });
  window.addEventListener('touchend', enableVoice, { once: true });
}

// 发牌：短促清脆的"啪"
export function playDeal() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

// 筹码碰撞：金属质感的"叮"
export function playChip() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

// 弃牌：低沉的"噗"
export function playFold() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// Check：轻敲声
export function playCheck() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

// 加注：上扬的"哔"
export function playRaise() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// All-in：强烈的双音
export function playAllIn() {
  const ctx = getCtx();
  for (const freq of [600, 900]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }
}

// 赢得底池：胜利和弦
export function playWin() {
  const ctx = getCtx();
  const notes = [523, 659, 784]; // C5 E5 G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.4);
  });
}

// 轮到你：提示音
export function playYourTurn() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

// 翻牌（公共牌出现）：清亮的"叮"
export function playReveal() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

// 根据动作类型播放对应音效
export function playActionSound(action: string, amount?: number) {
  switch (action) {
    case 'fold':
      playFold();
      speakChinese('弃牌');
      break;
    case 'check':
      playCheck();
      speakChinese('过牌');
      break;
    case 'call':
      playChip();
      speakChinese(amount ? `跟注 ${amount}` : '跟注');
      break;
    case 'raise':
      playRaise();
      speakChinese(amount ? `加注到 ${amount}` : '加注');
      break;
    case 'all-in':
      playAllIn();
      speakChinese(amount ? `全下 ${amount}` : '全下');
      break;
    default: playChip();
  }
}

export function playTurnVoice() {
  speakChinese('轮到你操作');
}

export function playPhaseVoice(phase: string) {
  switch (phase) {
    case 'preflop':
      speakChinese('开始发牌');
      break;
    case 'flop':
      speakChinese('翻牌');
      break;
    case 'turn':
      speakChinese('转牌');
      break;
    case 'river':
      speakChinese('河牌');
      break;
    case 'showdown':
      speakChinese('开牌');
      break;
  }
}

export function playRemoteActionVoice(playerName: string, action: string, amount?: number) {
  switch (action) {
    case 'fold':
      speakChinese(`${playerName} 弃牌`);
      break;
    case 'check':
      speakChinese(`${playerName} 过牌`);
      break;
    case 'call':
      speakChinese(amount ? `${playerName} 跟注 ${amount}` : `${playerName} 跟注`);
      break;
    case 'raise':
      speakChinese(amount ? `${playerName} 加注到 ${amount}` : `${playerName} 加注`);
      break;
    case 'all-in':
      speakChinese(amount ? `${playerName} 全下 ${amount}` : `${playerName} 全下`);
      break;
  }
}
