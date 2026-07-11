import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Volume2, VolumeX, RotateCcw, X, Play, Download, Upload, Shield, Zap } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

// Helper and Constants
function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

// ── Leveling ─────────────────────────────────────────────────────────────────
// XP is lifetime doggos earned (it survives rebirths). Each level costs 25% more
// XP than the last. Higher level → bigger click/income multiplier and a growing
// discount on everything in the shop.
const LEVEL_BASE_XP = 50;     // XP to go from level 1 → 2
const LEVEL_GROWTH = 1.25;    // each level needs 25% more than the previous
const LEVEL_CLICK_BONUS = 0.02; // +2% click & income per level
const LEVEL_DISCOUNT_STEP = 0.015; // 1.5% cheaper shop per level…
const LEVEL_DISCOUNT_MAX = 0.75;   // …capped at 75% off

function levelInfo(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let need = LEVEL_BASE_XP;
  let acc = 0; // total XP at the start of the current level
  while (xp >= acc + need) {
    acc += need;
    level++;
    need = Math.floor(need * LEVEL_GROWTH);
  }
  return { level, into: xp - acc, need };
}

const levelClickMult = (level: number) => 1 + (level - 1) * LEVEL_CLICK_BONUS;
const levelDiscount = (level: number) => Math.min(LEVEL_DISCOUNT_MAX, (level - 1) * LEVEL_DISCOUNT_STEP);

const CLICKERS = [
  { id: 'doggo',          cost: 0,                mult: 1,    name: 'Doggo' },
  { id: 'tung-tung-sahur',cost: 0,                mult: 1,    name: 'Tung Tung Tung Sahur' },
  { id: 'caterpillar',    cost: 500,              mult: 1.1,  name: 'Caterpillar' },
  { id: 'kitten',         cost: 1_000,            mult: 1.2,  name: 'Kitten' },
  { id: 'chicken',        cost: 2_500,            mult: 1.28, name: 'Chicken' },
  { id: 'duck',           cost: 3_500,            mult: 1.32, name: 'Duck' },
  { id: 'monkey',         cost: 5_000,            mult: 1.35, name: 'Monkey' },
  { id: 'pug',            cost: 7_500,            mult: 1.42, name: 'Pug' },
  { id: 'scorpion',       cost: 8_500,            mult: 1.44, name: 'Scorpion' },
  { id: 'turtle',         cost: 10_000,           mult: 1.5,  name: 'Turtle' },
  { id: 'snake',          cost: 12_000,           mult: 1.52, name: 'Snake' },
  { id: 'fox',            cost: 15_000,           mult: 1.55, name: 'Fox' },
  { id: 'spider',         cost: 18_000,           mult: 1.58, name: 'Spider' },
  { id: 'bear',           cost: 20_000,           mult: 1.6,  name: 'Bear' },
  { id: 'bird',           cost: 25_000,           mult: 1.62, name: 'Bird' },
  { id: 'lion',           cost: 30_000,           mult: 1.65, name: 'Lion' },
  { id: 'armadillo',      cost: 35_000,           mult: 1.67, name: 'Armadillo' },
  { id: 'kiwi',           cost: 40_000,           mult: 1.7,  name: 'Kiwi' },
  { id: 'emu',            cost: 45_000,           mult: 1.72, name: 'Emu' },
  { id: 'panda',          cost: 50_000,           mult: 1.75, name: 'Panda' },
  { id: 'blue-jay',       cost: 60_000,           mult: 1.8,  name: 'Blue Jay' },
  { id: 'pufferfish',     cost: 75_000,           mult: 1.85, name: 'Puffer Fish' },
  { id: 'chinchilla',     cost: 90_000,           mult: 1.88, name: 'Chinchilla' },
  { id: 'toad',           cost: 125_000,          mult: 1.95, name: 'Toad' },
  { id: 'jellyfish',      cost: 150_000,          mult: 1.98, name: 'Jellyfish' },
  { id: 'puffin',         cost: 175_000,          mult: 2,    name: 'Puffin' },
  { id: 'dolphin',        cost: 220_000,          mult: 2.1,  name: 'Dolphin' },
  { id: 'shark',          cost: 260_000,          mult: 2.2,  name: 'Shark' },
  { id: 'elephant',       cost: 280_000,          mult: 2.25, name: 'Elephant' },
  { id: 'octopus',        cost: 300_000,          mult: 2.3,  name: 'Octopus',         rare: true },
  { id: 'blue-whale',     cost: 420_000,          mult: 2.45, name: 'Blue Whale',      rare: true },
  { id: 'red-panda',      cost: 550_000,          mult: 2.55, name: 'Red Panda',       rare: true },
  { id: 'flamingo',       cost: 650_000,          mult: 2.65, name: 'Flamingo',        rare: true },
  { id: 'peacock',        cost: 700_000,          mult: 2.7,  name: 'Peacock',         rare: true },
  { id: 'axolotl',        cost: 800_000,          mult: 2.8,  name: 'Axolotl',         rare: true },
  { id: 'money-axolotl',  cost: 900_000,          mult: 2.9,  name: 'Money Axolotl',   rare: true },
  { id: 'orca',           cost: 1_000_000,        mult: 3.0,  name: 'Orca',            rare: true },
  { id: 'chameleon',      cost: 1_200_000,        mult: 3.1,  name: 'Chameleon',       rare: true },
  { id: 'toucan',         cost: 1_600_000,        mult: 3.3,  name: 'Tropical Toucan', rare: true },
  { id: 'anglerfish',     cost: 2_000_000,        mult: 3.5,  name: 'Angler Fish',     rare: true },
  { id: 'ghost',          cost: 3_500_000,        mult: 4,    name: 'Ghost',           legendary: true },
  { id: 'leo',            cost: 4_500_000,        mult: 4.5,  name: 'Leo',             legendary: true },
  { id: 'dodo',           cost: 5_000_000,        mult: 5,    name: 'Schafer Dodo',    legendary: true },
  { id: 'amanda-dodo',    cost: 15_000_000,       mult: 7,    name: 'Amanda Dodo',     legendary: true },
  { id: 'larus-dodo',     cost: 50_000_000,       mult: 9,    name: 'Lárus Dodo',      legendary: true },
  { id: 'rainbow-dodo',   cost: 500_000_000,      mult: 15,   name: 'Rainbow Dodo',    impossible: true },
  { id: 'golden-axolotl', cost: 1_000_000_000,    mult: 25,   name: 'Golden Axolotl', impossible: true },
  { id: 'megalodon',      cost: 5_000_000_000,    mult: 40,   name: 'Megalodon',       impossible: true },
];

const UPGRADES_META = {
  betterPetting:  { name: 'Better Petting',   desc: '+1 click per level',    emoji: '🐾', baseCost: 15,      getCost: (l:number) => Math.floor(15       * 1.15**l) },
  autoWalker:     { name: 'Auto-Walker',      desc: '+0.5 Doggos/sec',       emoji: '🦮', baseCost: 50,      getCost: (l:number) => Math.floor(50       * 1.15**l) },
  treatDispenser: { name: 'Treat Dispenser',  desc: '+5 Doggos/sec',         emoji: '🦴', baseCost: 500,     getCost: (l:number) => Math.floor(500      * 1.15**l) },
  goldenLeash:    { name: 'Golden Leash',     desc: '+3 click per level',    emoji: '✨', baseCost: 2500,    getCost: (l:number) => Math.floor(2500     * 1.15**l) },
  fetchTraining:  { name: 'Fetch Training',   desc: '+5 Doggos/sec',         emoji: '🎾', baseCost: 3500,    getCost: (l:number) => Math.floor(3500     * 1.15**l) },
  biscuitFactory: { name: 'Biscuit Factory',  desc: '+25 Doggos/sec',        emoji: '🍪', baseCost: 12000,   getCost: (l:number) => Math.floor(12000    * 1.15**l) },
  dogWhisperer:   { name: 'Dog Whisperer',    desc: '+100 Doggos/sec',       emoji: '🌟', baseCost: 75000,   getCost: (l:number) => Math.floor(75000    * 1.15**l) },
  cosmicBone:     { name: 'Cosmic Bone',      desc: '+20 click +500 dps',    emoji: '💫', baseCost: 1000000, getCost: (l:number) => Math.floor(1000000  * 1.15**l) },
};

const THEMES = [
  { id: 'classic', name: 'Classic Doggo', cost: 0,       palette: ['#FF9A3C','#FFF5E0','#E85D3A'] },
  { id: 'night',   name: 'Night Howl',    cost: 5000,    palette: ['#6C63FF','#0D0D1A','#A78BFA'] },
  { id: 'ocean',   name: 'Ocean Pup',     cost: 20000,   palette: ['#06B6D4','#E0F7FA','#0891B2'] },
  { id: 'lavender',name: 'Lavender Dream',cost: 40000,   palette: ['#8B5CF6','#F5F3FF','#A855F7'] },
  { id: 'cherry',  name: 'Cherry Blossom',cost: 75000,   palette: ['#F472B6','#FFF0F6','#DB2777'] },
  { id: 'teal',    name: 'Teal Tide',     cost: 120000,  palette: ['#14B8A6','#F0FDFA','#0D9488'] },
  { id: 'forest',  name: 'Forest Paw',    cost: 200000,  palette: ['#22C55E','#F0FDF4','#15803D'] },
  { id: 'void',    name: 'Void',          cost: 1000000, palette: ['#7C3AED','#0A0A14','#4C1D95'] },
];

const SOUNDS = [
  { id: 'woofpop', name: 'Woof Pop',       cost: 0,       desc: 'A cheerful chirpy pop' },
  { id: 'boing',   name: 'Boing',          cost: 10000,   desc: 'Springy and bouncy' },
  { id: 'bark',    name: 'Bark',           cost: 30000,   desc: 'A sharp doggy bark' },
  { id: 'squeak',  name: 'Squeak',         cost: 100000,  desc: 'Squeaky toy energy' },
  { id: 'cosmic',  name: 'Cosmic',         cost: 500000,  desc: 'Spacey synth chord' },
  { id: 'howl',    name: 'Legendary Howl', cost: 5000000, desc: 'Dramatic deep howl' },
];

// ── Events ("Hours") ─────────────────────────────────────────────────────────
// Three escalating events. Each is better than the last. Timing lives on the
// server (see api-server) so every player is in sync; the admin panel triggers
// an event for everyone. The client just polls for the current event and renders
// its multiplier, banner, rain, and theme.
type EventId = 'golden' | 'rainbow' | 'galaxy';
const EVENTS: Record<EventId, { name: string; emoji: string; mult: number; banner: string }> = {
  golden:  { name: 'Golden Hour',  emoji: '✨', mult: 5,  banner: '5× multiplier active!' },
  rainbow: { name: 'Rainbow Hour', emoji: '🌈', mult: 10, banner: '10× multiplier + rainbow rain!' },
  galaxy:  { name: 'Galaxy Hour',  emoji: '🌌', mult: 20, banner: '20× multiplier · every animal rains!' },
};

interface UpgState { level: number; cost: number; }

interface GameState {
  doggos: number;
  totalDoggosEarned: number;
  xp: number;
  upgrades: {
    betterPetting:  UpgState;
    autoWalker:     UpgState;
    treatDispenser: UpgState;
    goldenLeash:    UpgState;
    fetchTraining:  UpgState;
    biscuitFactory: UpgState;
    dogWhisperer:   UpgState;
    cosmicBone:     UpgState;
  };
  unlockedClickers: string[];
  activeClicker: string;
  soundEnabled: boolean;
  activeSound: string;
  unlockedSounds: string[];
  activeTheme: string;
  unlockedThemes: string[];
  rebirths: number;
}

const DEFAULT_STATE: GameState = {
  doggos: 0,
  totalDoggosEarned: 0,
  xp: 0,
  upgrades: {
    betterPetting:  { level: 0, cost: UPGRADES_META.betterPetting.baseCost },
    autoWalker:     { level: 0, cost: UPGRADES_META.autoWalker.baseCost },
    treatDispenser: { level: 0, cost: UPGRADES_META.treatDispenser.baseCost },
    goldenLeash:    { level: 0, cost: UPGRADES_META.goldenLeash.baseCost },
    fetchTraining:  { level: 0, cost: UPGRADES_META.fetchTraining.baseCost },
    biscuitFactory: { level: 0, cost: UPGRADES_META.biscuitFactory.baseCost },
    dogWhisperer:   { level: 0, cost: UPGRADES_META.dogWhisperer.baseCost },
    cosmicBone:     { level: 0, cost: UPGRADES_META.cosmicBone.baseCost },
  },
  unlockedClickers: ['doggo'],
  activeClicker: 'doggo',
  soundEnabled: true,
  activeSound: 'woofpop',
  unlockedSounds: ['woofpop'],
  activeTheme: 'classic',
  unlockedThemes: ['classic'],
  rebirths: 0,
};

let audioCtx: AudioContext | null = null;
const playSound = (soundId: string) => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const t = audioCtx.currentTime;

    if (soundId === 'woofpop') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (soundId === 'boing') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } else if (soundId === 'bark') {
      const osc1 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(180, t);
      osc1.frequency.exponentialRampToValueAtTime(120, t + 0.06);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + 0.08);
      osc1.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.start(t);
      osc1.stop(t + 0.08);
    } else if (soundId === 'squeak') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.exponentialRampToValueAtTime(3000, t + 0.05);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } else if (soundId === 'cosmic') {
      const freqs = [220, 261.6, 330];
      freqs.forEach(f => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } else if (soundId === 'howl') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.linearRampToValueAtTime(140, t + 0.6);
      osc.frequency.linearRampToValueAtTime(80, t + 1.2);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.2);
      gain.gain.linearRampToValueAtTime(0.3, t + 1.0);
      gain.gain.linearRampToValueAtTime(0, t + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    }
  } catch(e) {
    console.error("Audio error", e);
  }
}

type Floater = { id: number; x: number; y: number; val: number };
type RainDrop = { id: number; x: number; size: number; duration: number; delay: number; drift: number; src?: string; variant?: EventId };

export default function Game() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('doggoClickerState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          upgrades: {
            ...DEFAULT_STATE.upgrades,
            ...(parsed.upgrades || {})
          },
          unlockedThemes: parsed.unlockedThemes || DEFAULT_STATE.unlockedThemes,
          unlockedSounds: parsed.unlockedSounds || DEFAULT_STATE.unlockedSounds,
          rebirths: parsed.rebirths || 0,
          activeTheme: parsed.activeTheme || 'classic',
          activeSound: parsed.activeSound || 'woofpop',
        };
      } catch (e) {}
    }
    return DEFAULT_STATE;
  });

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextFloaterId = useRef(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const nextRainId = useRef(0);
  const [shopOpen, setShopOpen] = useState(false);

  // ── Admin Panel ──────────────────────────────────────────
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState('');
  const [adminPwError, setAdminPwError] = useState(false);
  const [adminMsg, setAdminMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const adminVerifiedPw = useRef('');
  const stateRef = useRef(state);
  const [lastSaved, setLastSaved] = useState(0); // ms epoch of the last successful auto-save

  // ── Events (Golden / Rainbow / Galaxy Hour) — server-driven ─────────────
  const [activeEvent, setActiveEvent] = useState<EventId | null>(null);
  const [eventSecondsLeft, setEventSecondsLeft] = useState(0);
  const eventMultRef = useRef(1);                       // current event multiplier (1 when none)
  const eventRef = useRef<EventId | null>(null);        // current event id
  const eventEndsAt = useRef(0);                        // ms epoch the current event ends
  
  // ── Auto-save ────────────────────────────────────────────
  // Saves on every change, on a periodic heartbeat, and whenever the tab is
  // hidden or closed (important on mobile, where closing a tab may not fire a
  // normal unload). Wrapped in try/catch so a storage failure never crashes the
  // game (e.g. Safari private mode returns quota errors on write).
  const saveGame = () => {
    try {
      localStorage.setItem('doggoClickerState', JSON.stringify(stateRef.current));
      setLastSaved(Date.now());
      return true;
    } catch {
      return false;
    }
  };

  // Save on every state change (and keep the ref current for the savers below)
  useEffect(() => {
    stateRef.current = state;
    saveGame();
  }, [state]);

  // Heartbeat + save-on-hide/close, set up once
  useEffect(() => {
    const interval = setInterval(saveGame, 15_000);
    const onVisibility = () => { if (document.visibilityState === 'hidden') saveGame(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', saveGame);
    window.addEventListener('beforeunload', saveGame);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', saveGame);
      window.removeEventListener('beforeunload', saveGame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rebirthMult = 1 + state.rebirths * 0.5;
  const activeClickerDef = CLICKERS.find(c => c.id === state.activeClicker) || CLICKERS[0];
  const eventMult = activeEvent ? EVENTS[activeEvent].mult : 1;
  eventMultRef.current = eventMult;

  // ── Level & its perks ──────────────────────────────────────
  const { level, into: xpInto, need: xpNeed } = levelInfo(state.xp);
  const levelMult = levelClickMult(level);            // boosts click power & income
  const shopDiscount = levelDiscount(level);          // cheaper shop
  const priceOf = (base: number) => Math.max(0, Math.ceil(base * (1 - shopDiscount)));

  // Price display: when a level discount is active, show the original price
  // struck through, the discounted price, and a "-N%" badge so it reads clearly
  // as a discount. No discount → just the plain price.
  const priceLabel = (base: number, verb: string) => {
    const p = priceOf(base);
    if (shopDiscount > 0 && base > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
          <span>{verb}:</span>
          <span className="line-through opacity-60">{formatNumber(base)}</span>
          <span>{formatNumber(p)}</span>
          <span className="text-[10px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">
            -{Math.round(shopDiscount * 100)}%
          </span>
        </span>
      );
    }
    return <>{verb}: {formatNumber(p)}</>;
  };

  const clickValue = (
    1
    + state.upgrades.betterPetting.level
    + state.upgrades.goldenLeash.level * 3
    + state.upgrades.cosmicBone.level * 20
  ) * activeClickerDef.mult * rebirthMult * eventMult * levelMult;

  const dps = (
    state.upgrades.autoWalker.level * 0.5
    + state.upgrades.treatDispenser.level * 5
    + state.upgrades.fetchTraining.level * 5
    + state.upgrades.biscuitFactory.level * 25
    + state.upgrades.dogWhisperer.level * 100
    + state.upgrades.cosmicBone.level * 500
  ) * rebirthMult * eventMult * levelMult;

  // Passive Income loop
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current;
      const currentRebirthMult = 1 + s.rebirths * 0.5;
      const currentLevelMult = levelClickMult(levelInfo(s.xp).level);
      const currentDps = (
        s.upgrades.autoWalker.level * 0.5
        + s.upgrades.treatDispenser.level * 5
        + s.upgrades.fetchTraining.level * 5
        + s.upgrades.biscuitFactory.level * 25
        + s.upgrades.dogWhisperer.level * 100
        + s.upgrades.cosmicBone.level * 500
      ) * currentRebirthMult * eventMultRef.current * currentLevelMult;

      if (currentDps > 0) {
        setState(prev => ({
          ...prev,
          doggos: prev.doggos + currentDps,
          totalDoggosEarned: prev.totalDoggosEarned + currentDps,
          xp: prev.xp + currentDps
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Events: poll the server so every player is in sync ──
  // The server owns the schedule and the admin trigger, so an event started by
  // the admin (or on the server's own timer) reaches everyone within a poll.
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/golden-event');
        if (!res.ok) return;
        const data: { active: boolean; event: EventId | null; endsAt: number } = await res.json();
        const ev = data.active ? data.event : null;

        if (ev !== eventRef.current) {
          eventRef.current = ev;
          eventEndsAt.current = data.endsAt || 0;
          eventMultRef.current = ev ? EVENTS[ev].mult : 1;
          setActiveEvent(ev);
        } else if (ev) {
          eventEndsAt.current = data.endsAt;
        }
      } catch {
        // Server unreachable — keep current state (no event)
      }
    };

    poll();
    const interval = setInterval(poll, 3_000);
    return () => clearInterval(interval);
  }, []);

  // ── Event rain: golden pups, rainbow droplets, or every animal (galaxy) ──
  useEffect(() => {
    if (!activeEvent) return;
    const BASE = import.meta.env.BASE_URL;
    const goldenSrcs = [`${BASE}animals/pug.png`, `${BASE}animals/axolotl.png`];

    const spawn = () => {
      const count = activeEvent === 'golden' ? 5 : 6;
      const drops: RainDrop[] = Array.from({ length: count }, (_, i) => {
        const base: RainDrop = {
          id: nextRainId.current++,
          x: Math.random() * 90 + 5,
          size: Math.random() * 26 + 30,
          duration: Math.random() * 0.5 + 0.9,
          delay: i * 0.09,
          drift: (Math.random() - 0.5) * 80,
          variant: activeEvent,
        };
        if (activeEvent === 'golden') {
          return { ...base, src: goldenSrcs[Math.floor(Math.random() * goldenSrcs.length)] };
        }
        if (activeEvent === 'galaxy') {
          // Galaxy Hour rains every animal — pick a random one per drop
          const c = CLICKERS[Math.floor(Math.random() * CLICKERS.length)];
          return { ...base, src: `${BASE}animals/${c.id}.png` };
        }
        return base; // rainbow: no image — a CSS rainbow droplet
      });
      setRainDrops(prev => [...prev, ...drops]);
      const maxMs = (Math.max(...drops.map(d => d.delay + d.duration)) + 0.1) * 1000;
      setTimeout(() => {
        const ids = new Set(drops.map(d => d.id));
        setRainDrops(prev => prev.filter(d => !ids.has(d.id)));
      }, maxMs);
    };

    spawn();
    const interval = setInterval(spawn, 650);
    return () => clearInterval(interval);
  }, [activeEvent]);

  // ── Event: countdown ticker ────────────────────────────
  useEffect(() => {
    if (!activeEvent) { setEventSecondsLeft(0); return; }
    const tick = () => setEventSecondsLeft(Math.max(0, Math.ceil((eventEndsAt.current - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeEvent]);

  const handleAnimalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextFloaterId.current++;

    setState(prev => ({
      ...prev,
      doggos: prev.doggos + clickValue,
      totalDoggosEarned: prev.totalDoggosEarned + clickValue,
      xp: prev.xp + clickValue
    }));

    setFloaters(prev => [...prev, { id, x, y, val: clickValue }]);

    // Spawn rain drops across the viewport
    const src = `${import.meta.env.BASE_URL}animals/${activeClickerDef.id}.png`;
    const count = 6;
    const newDrops: RainDrop[] = Array.from({ length: count }, (_, i) => ({
      id: nextRainId.current++,
      x: Math.random() * 90 + 5,          // 5–95% of viewport width
      size: Math.random() * 28 + 28,       // 28–56px
      duration: Math.random() * 0.5 + 0.8, // 0.8–1.3s fall
      delay: i * 0.06,                     // stagger each drop slightly
      drift: (Math.random() - 0.5) * 60,  // horizontal drift px
      src,
    }));
    setRainDrops(prev => [...prev, ...newDrops]);
    const maxLifetime = (Math.max(...newDrops.map(d => d.delay + d.duration)) + 0.1) * 1000;
    setTimeout(() => {
      const ids = new Set(newDrops.map(d => d.id));
      setRainDrops(prev => prev.filter(d => !ids.has(d.id)));
    }, maxLifetime);
    
    if (state.soundEnabled) playSound(state.activeSound);

    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 150);

    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== id));
    }, 800);
  };

  const buyUpgrade = (upgradeKey: keyof GameState['upgrades']) => {
    setState(prev => {
      const upg = prev.upgrades[upgradeKey];
      const price = priceOf(upg.cost);
      if (prev.doggos >= price) {
        const nextLevel = upg.level + 1;
        const nextCost = UPGRADES_META[upgradeKey].getCost(nextLevel);
        return {
          ...prev,
          doggos: prev.doggos - price,
          upgrades: {
            ...prev.upgrades,
            [upgradeKey]: { level: nextLevel, cost: nextCost }
          }
        };
      }
      return prev;
    });
  };

  const buyClicker = (clickerId: string, cost: number) => {
    const price = priceOf(cost);
    setState(prev => {
      if (!prev.unlockedClickers.includes(clickerId) && prev.doggos >= price) {
        return {
          ...prev,
          doggos: prev.doggos - price,
          unlockedClickers: [...prev.unlockedClickers, clickerId],
          activeClicker: clickerId
        };
      }
      return prev;
    });
  };

  const selectClicker = (clickerId: string) => {
    setState(prev => ({ ...prev, activeClicker: clickerId }));
  };

  const buyTheme = (themeId: string, cost: number) => {
    const price = priceOf(cost);
    setState(prev => {
      if (!prev.unlockedThemes.includes(themeId) && prev.doggos >= price) {
        return {
          ...prev,
          doggos: prev.doggos - price,
          unlockedThemes: [...prev.unlockedThemes, themeId],
          activeTheme: themeId
        };
      }
      return prev;
    });
  };

  const selectTheme = (themeId: string) => {
    setState(prev => ({ ...prev, activeTheme: themeId }));
  };

  const buySound = (soundId: string, cost: number) => {
    const price = priceOf(cost);
    setState(prev => {
      if (!prev.unlockedSounds.includes(soundId) && prev.doggos >= price) {
        return {
          ...prev,
          doggos: prev.doggos - price,
          unlockedSounds: [...prev.unlockedSounds, soundId],
          activeSound: soundId
        };
      }
      return prev;
    });
  };

  const selectSound = (soundId: string) => {
    setState(prev => ({ ...prev, activeSound: soundId }));
  };

  const resetGame = () => {
    if (confirm("Are you sure you want to reset all progress?")) {
      setState(DEFAULT_STATE);
      localStorage.removeItem('doggoClickerState');
    }
  };

  const importRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doggo-clicker-save.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const merged: GameState = {
          ...DEFAULT_STATE,
          ...parsed,
          upgrades: {
            ...DEFAULT_STATE.upgrades,
            ...parsed.upgrades,
          },
          unlockedThemes: parsed.unlockedThemes || DEFAULT_STATE.unlockedThemes,
          unlockedSounds: parsed.unlockedSounds || DEFAULT_STATE.unlockedSounds,
          rebirths: parsed.rebirths || 0,
        };
        setState(merged);
        localStorage.setItem('doggoClickerState', JSON.stringify(merged));
      } catch {
        alert('Could not read save file — make sure it\'s a valid Doggo Clicker save.');
      }
    };
    reader.readAsText(file);
    // reset so the same file can be re-imported if needed
    e.target.value = '';
  };

  // ── Admin handlers (verified against the server) ─────────────────────────
  const adminLogin = async () => {
    setAdminMsg(null);
    try {
      const res = await fetch('/api/admin/trigger-golden-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Validate the password without triggering anything
        body: JSON.stringify({ password: adminPwInput, checkOnly: true }),
      });
      if (res.status === 401) {
        setAdminPwError(true);
        return;
      }
      adminVerifiedPw.current = adminPwInput;
      setAdminAuthed(true);
      setAdminPwError(false);
      setAdminPwInput('');
    } catch {
      setAdminPwError(true);
    }
  };

  const triggerEvent = async (id: EventId) => {
    setAdminMsg(null);
    try {
      const res = await fetch('/api/admin/trigger-golden-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminVerifiedPw.current, event: id }),
      });
      if (res.ok) {
        setAdminMsg({ text: `✅ ${EVENTS[id].name} triggered for everyone!`, ok: true });
      } else {
        setAdminMsg({ text: '❌ Server rejected the request.', ok: false });
      }
    } catch {
      setAdminMsg({ text: '❌ Could not reach the server.', ok: false });
    }
  };

  const rebirthThreshold = 1_000_000 * Math.pow(10, state.rebirths);
  const canRebirth = state.totalDoggosEarned >= rebirthThreshold;

  const performRebirth = () => {
    if (confirm("Are you sure you want to rebirth? This will reset your doggos and upgrades, but grant a permanent +0.5x multiplier to all future earnings!")) {
      setState(prev => ({
        ...prev,
        doggos: 0,
        totalDoggosEarned: 0,
        upgrades: {
          betterPetting:  { level: 0, cost: UPGRADES_META.betterPetting.baseCost },
          autoWalker:     { level: 0, cost: UPGRADES_META.autoWalker.baseCost },
          treatDispenser: { level: 0, cost: UPGRADES_META.treatDispenser.baseCost },
          goldenLeash:    { level: 0, cost: UPGRADES_META.goldenLeash.baseCost },
          fetchTraining:  { level: 0, cost: UPGRADES_META.fetchTraining.baseCost },
          biscuitFactory: { level: 0, cost: UPGRADES_META.biscuitFactory.baseCost },
          dogWhisperer:   { level: 0, cost: UPGRADES_META.dogWhisperer.baseCost },
          cosmicBone:     { level: 0, cost: UPGRADES_META.cosmicBone.baseCost },
        },
        rebirths: prev.rebirths + 1
      }));
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden font-sans select-none" data-theme={activeEvent ?? state.activeTheme}>
      {/* Top Bar */}
      <header className="flex items-center justify-between p-4 bg-primary text-primary-foreground shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight">Doggo Clicker</h1>
          <button 
            onClick={resetGame} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Reset Game"
            data-testid="button-reset"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => { setAdminOpen(true); setAdminMsg(null); }}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Admin Panel"
          >
            <Shield size={18} />
          </button>
          <button
            onClick={exportSave}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Export Save"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Import Save"
          >
            <Upload size={18} />
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={importSave}
          />
          <div
            className="hidden sm:flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full bg-white/10 text-xs font-bold"
            title={lastSaved ? `Progress auto-saved at ${new Date(lastSaved).toLocaleTimeString()}` : 'Auto-save is on'}
            data-testid="autosave-indicator"
          >
            <span className={lastSaved ? 'text-green-300' : 'opacity-70'}>●</span>
            <span className="opacity-90">Auto-saved</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div
            className="flex flex-col items-center justify-center bg-white/20 px-3 py-1 rounded-lg min-w-[110px]"
            title={`Level ${level} perks: ×${levelMult.toFixed(2)} click & income · ${Math.round(shopDiscount * 100)}% off the shop\n${formatNumber(xpInto)} / ${formatNumber(xpNeed)} XP to level ${level + 1}`}
            data-testid="level-badge"
          >
            <span className="text-xs font-bold uppercase opacity-90 tracking-wider">Level {level}</span>
            <div className="w-full h-1.5 bg-black/20 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (xpInto / xpNeed) * 100)}%` }} />
            </div>
            <span className="text-[10px] font-black opacity-90 mt-0.5 tabular-nums">×{levelMult.toFixed(2)} · {Math.round(shopDiscount * 100)}% off</span>
          </div>

          {state.rebirths > 0 && (
            <div className="flex flex-col items-center justify-center bg-white/20 px-3 py-1 rounded-lg">
              <span className="text-xs font-bold uppercase opacity-90 tracking-wider">Rebirths</span>
              <span className="text-sm font-black">⟳ {state.rebirths} · {rebirthMult}x</span>
            </div>
          )}

          {canRebirth && (
            <button 
              onClick={performRebirth}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.6)] animate-pulse border-2 border-purple-300 transition-all active:scale-95"
            >
              Rebirth
            </button>
          )}

          <div className="flex flex-col items-end">
            <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Doggos</span>
            <span className="text-3xl font-black tabular-nums leading-none" data-testid="text-doggos">
              {formatNumber(state.doggos)}
            </span>
          </div>
          
          <button 
            onClick={() => setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            data-testid="button-sound-toggle"
            title="Toggle Sound"
          >
            {state.soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          
          <button 
            onClick={() => setShopOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-foreground font-black text-lg rounded-full hover:scale-105 active:scale-95 transition-transform shadow-sm"
            data-testid="button-open-shop"
          >
            <ShoppingCart size={22} />
            Shop
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel - Upgrades */}
        <aside className="w-[320px] bg-card border-r border-border p-5 flex flex-col gap-4 overflow-y-auto z-10 custom-scrollbar">
          <h2 className="text-2xl font-black mb-1 text-card-foreground">
            Upgrades
          </h2>
          
          {(Object.keys(UPGRADES_META) as Array<keyof typeof UPGRADES_META>).map(key => {
            const meta = UPGRADES_META[key];
            const upgState = state.upgrades[key];
            const price = priceOf(upgState.cost);
            const canAfford = state.doggos >= price;
            
            return (
              <div key={key} className="bg-background rounded-2xl p-4 border-2 border-border shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-center">
                    <span className="text-2xl" aria-hidden="true">{meta.emoji}</span>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{meta.name}</h3>
                      <p className="text-sm font-semibold text-muted-foreground mt-0.5">{meta.desc}</p>
                    </div>
                  </div>
                  <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-xs font-black shrink-0 ml-2">
                    Lvl {upgState.level}
                  </span>
                </div>
                
                <button
                  onClick={() => buyUpgrade(key)}
                  disabled={!canAfford}
                  className={`w-full py-3 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2 ${
                    canAfford 
                      ? 'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] shadow-sm cursor-pointer'
                      : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                  }`}
                  data-testid={`button-upgrade-${key}`}
                >
                  {priceLabel(upgState.cost, 'Buy for')}
                </button>
              </div>
            );
          })}
        </aside>

        {/* Center - Main Game Area */}
        <main className="flex-1 relative flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-background to-amber-100/50 dark:to-orange-950/30">
          
          <div className="mt-8 text-center mb-8 flex flex-col items-center justify-center">
            <h3 className="text-4xl font-black text-foreground drop-shadow-sm">{activeClickerDef.name}</h3>
            <div className="bg-white/80 dark:bg-black/50 px-5 py-2 rounded-full border-2 border-border shadow-sm mt-3 backdrop-blur-sm">
              <p className="text-muted-foreground font-black text-lg">
                Click Power: <span className="text-foreground">{formatNumber(clickValue)}</span>
              </p>
            </div>
          </div>

          <div 
            className="relative flex flex-col items-center justify-center cursor-pointer select-none"
            onClick={handleAnimalClick}
            data-testid="main-clicker"
          >
            <div 
              className={`w-56 h-56 md:w-72 md:h-72 rounded-full overflow-hidden border-[6px] border-border shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white transition-transform duration-100 ${
                isBouncing ? 'scale-90' : 'scale-100 hover:scale-105 active:scale-95'
              } ${
                'impossible' in activeClickerDef && activeClickerDef.impossible
                  ? 'impossible-active-glow border-none'
                  : 'legendary' in activeClickerDef && activeClickerDef.legendary
                    ? 'animate-pulse shadow-[0_0_60px_rgba(255,215,0,0.6)] border-yellow-400'
                    : ''
              }`}
            >
              <img 
                src={`${import.meta.env.BASE_URL}animals/${activeClickerDef.id}.png`}
                alt={activeClickerDef.name}
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            </div>

            {floaters.map(f => (
              <div 
                key={f.id}
                className="absolute text-5xl font-black text-accent pointer-events-none animate-float z-50"
                style={{ 
                  left: f.x, 
                  top: f.y,
                  WebkitTextStroke: '2px white',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
                }}
              >
                +{formatNumber(f.val)}
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="text-xl font-black text-muted-foreground bg-white/80 dark:bg-black/50 px-6 py-2 rounded-full backdrop-blur-sm border-2 border-border shadow-sm">
              {formatNumber(dps)} doggos / sec
            </span>
          </div>

        </main>
      </div>

      {/* Shop Modal */}
      <Dialog.Root open={shopOpen} onOpenChange={setShopOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl bg-card text-card-foreground rounded-[2rem] p-8 shadow-2xl z-50 border-4 border-border flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <ShoppingCart className="text-accent" size={32} /> Shop
              </h2>
              <Dialog.Close asChild>
                <button className="p-3 bg-muted hover:bg-muted-foreground/20 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </Dialog.Close>
            </div>
            
            <Tabs.Root defaultValue="clickers" className="flex flex-col flex-1 min-h-0">
              <Tabs.List className="flex border-b-2 border-border mb-6 shrink-0 gap-4">
                <Tabs.Trigger value="clickers" className="px-6 py-3 font-black text-lg text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 data-[state=active]:border-primary transition-colors">
                  Clickers
                </Tabs.Trigger>
                <Tabs.Trigger value="themes" className="px-6 py-3 font-black text-lg text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 data-[state=active]:border-primary transition-colors">
                  Themes
                </Tabs.Trigger>
                <Tabs.Trigger value="sounds" className="px-6 py-3 font-black text-lg text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 data-[state=active]:border-primary transition-colors">
                  Sounds
                </Tabs.Trigger>
              </Tabs.List>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* Clickers Tab */}
                <Tabs.Content value="clickers" className="grid grid-cols-1 md:grid-cols-2 gap-5 outline-none">
                  {CLICKERS.map(c => {
                    const isUnlocked = state.unlockedClickers.includes(c.id);
                    const isActive = state.activeClicker === c.id;
                    const price = priceOf(c.cost);
                    const canAfford = state.doggos >= price;
                    
                    return (
                      <div 
                        key={c.id} 
                        className={`relative p-5 rounded-3xl border-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all ${
                          isActive ? 'border-primary bg-primary/5' : 
                          isUnlocked ? 'border-border hover:border-primary/30' : 
                          'border-border opacity-70 grayscale-[20%]'
                        } ${'impossible' in c && c.impossible ? 'impossible-border overflow-visible' : 'legendary' in c && c.legendary ? 'legendary-border overflow-visible' : ''}`}
                      >
                        {'impossible' in c && c.impossible && (
                          <div className="absolute -top-4 -right-4 impossible-badge text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-6 border-2 border-white/40 z-10 whitespace-nowrap">
                            ✦ IMPOSSIBLE
                          </div>
                        )}
                        {'legendary' in c && c.legendary && !('impossible' in c && c.impossible) && (
                          <div className="absolute -top-4 -right-4 bg-[#FFD700] text-yellow-950 text-xs font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-6 border-2 border-yellow-200 z-10 whitespace-nowrap">
                            ⭐ LEGENDARY
                          </div>
                        )}
                        {'rare' in c && c.rare && (
                          <div className="absolute -top-4 -right-4 bg-violet-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-6 border-2 border-violet-300 z-10 whitespace-nowrap">
                            ◆ RARE
                          </div>
                        )}
                        
                        <div className="w-[80px] h-[80px] shrink-0 rounded-2xl overflow-hidden border-2 border-border shadow-md bg-white">
                          <img 
                            src={`${import.meta.env.BASE_URL}animals/${c.id}.png`} 
                            alt={c.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center sm:items-start w-full text-center sm:text-left">
                          <h4 className="font-black text-xl">{c.name}</h4>
                          <p className="text-sm font-bold text-muted-foreground mt-0.5">{c.mult}x Click Power</p>
                          
                          <div className="mt-4 w-full">
                            {isActive ? (
                              <span className="block bg-primary/20 text-primary px-4 py-2.5 rounded-xl text-sm font-black w-full text-center border-2 border-primary/30">
                                Active
                              </span>
                            ) : isUnlocked ? (
                              <button 
                                onClick={() => selectClicker(c.id)}
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full py-2.5 rounded-xl text-sm font-black transition-all border-2 border-secondary-foreground/20 active:scale-95"
                              >
                                Select
                              </button>
                            ) : (
                              <button
                                onClick={() => buyClicker(c.id, c.cost)}
                                disabled={!canAfford}
                                className={`w-full py-2.5 rounded-xl text-sm font-black transition-all border-2 active:scale-95 ${
                                  canAfford
                                    ? 'bg-primary text-primary-foreground border-primary-foreground/20 hover:brightness-110'
                                    : 'bg-muted text-muted-foreground border-transparent cursor-not-allowed active:scale-100'
                                }`}
                              >
                                {priceLabel(c.cost, 'Unlock')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Tabs.Content>

                {/* Themes Tab */}
                <Tabs.Content value="themes" className="grid grid-cols-1 md:grid-cols-2 gap-5 outline-none">
                  {THEMES.map(t => {
                    const isUnlocked = state.unlockedThemes.includes(t.id);
                    const isActive = state.activeTheme === t.id;
                    const price = priceOf(t.cost);
                    const canAfford = state.doggos >= price;
                    
                    return (
                      <div 
                        key={t.id}
                        className={`p-5 rounded-3xl border-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all ${
                          isActive ? 'border-primary bg-primary/5' : 
                          isUnlocked ? 'border-border hover:border-primary/30' : 
                          'border-border opacity-80'
                        }`}
                      >
                        <div className="flex sm:flex-col gap-2 shrink-0 bg-white/10 p-3 rounded-2xl border-2 border-border/50">
                          {t.palette.map((color, i) => (
                            <div key={i} className="w-8 h-8 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: color }} />
                          ))}
                        </div>

                        <div className="flex-1 flex flex-col items-center sm:items-start w-full text-center sm:text-left">
                          <h4 className="font-black text-xl">{t.name}</h4>
                          <p className="text-sm font-bold text-muted-foreground mt-0.5">Color Theme</p>
                          
                          <div className="mt-4 w-full">
                            {isActive ? (
                              <span className="block bg-primary/20 text-primary px-4 py-2.5 rounded-xl text-sm font-black w-full text-center border-2 border-primary/30">
                                Active
                              </span>
                            ) : isUnlocked ? (
                              <button 
                                onClick={() => selectTheme(t.id)}
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full py-2.5 rounded-xl text-sm font-black transition-all border-2 border-secondary-foreground/20 active:scale-95"
                              >
                                Select
                              </button>
                            ) : (
                              <button
                                onClick={() => buyTheme(t.id, t.cost)}
                                disabled={!canAfford}
                                className={`w-full py-2.5 rounded-xl text-sm font-black transition-all border-2 active:scale-95 ${
                                  canAfford
                                    ? 'bg-primary text-primary-foreground border-primary-foreground/20 hover:brightness-110'
                                    : 'bg-muted text-muted-foreground border-transparent cursor-not-allowed active:scale-100'
                                }`}
                              >
                                {priceLabel(t.cost, 'Unlock')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Tabs.Content>

                {/* Sounds Tab */}
                <Tabs.Content value="sounds" className="flex flex-col gap-4 outline-none">
                  {SOUNDS.map(s => {
                    const isUnlocked = state.unlockedSounds.includes(s.id);
                    const isActive = state.activeSound === s.id;
                    const price = priceOf(s.cost);
                    const canAfford = state.doggos >= price;

                    return (
                      <div 
                        key={s.id}
                        className={`p-4 rounded-2xl border-4 flex flex-col sm:flex-row items-center gap-4 transition-all ${
                          isActive ? 'border-primary bg-primary/5' : 
                          isUnlocked ? 'border-border hover:border-primary/30' : 
                          'border-border opacity-80'
                        }`}
                      >
                        <button 
                          onClick={() => playSound(s.id)}
                          className="w-12 h-12 shrink-0 flex items-center justify-center bg-accent text-accent-foreground rounded-full hover:scale-110 transition-transform shadow-md"
                          title={`Preview ${s.name}`}
                        >
                          <Play size={20} className="ml-1" />
                        </button>

                        <div className="flex-1 flex flex-col items-center sm:items-start w-full text-center sm:text-left">
                          <h4 className="font-black text-lg">{s.name}</h4>
                          <p className="text-sm font-bold text-muted-foreground">{s.desc}</p>
                        </div>

                        <div className="w-full sm:w-auto shrink-0 mt-3 sm:mt-0 min-w-[140px]">
                          {isActive ? (
                            <span className="block bg-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-black w-full text-center border-2 border-primary/30">
                              Active
                            </span>
                          ) : isUnlocked ? (
                            <button 
                              onClick={() => selectSound(s.id)}
                              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full py-2 rounded-xl text-sm font-black transition-all border-2 border-secondary-foreground/20 active:scale-95"
                            >
                              Select
                            </button>
                          ) : (
                            <button 
                              onClick={() => buySound(s.id, s.cost)}
                              disabled={!canAfford}
                              className={`w-full py-2 rounded-xl text-sm font-black transition-all border-2 active:scale-95 ${
                                canAfford
                                  ? 'bg-primary text-primary-foreground border-primary-foreground/20 hover:brightness-110'
                                  : 'bg-muted text-muted-foreground border-transparent cursor-not-allowed active:scale-100'
                              }`}
                            >
                              {priceLabel(s.cost, 'Unlock')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }

        /* Impossible tier — prismatic animated border */
        @keyframes prismatic {
          0%   { border-color: #ff4d4d; box-shadow: 0 0 18px 4px #ff4d4d88; }
          14%  { border-color: #ff9900; box-shadow: 0 0 18px 4px #ff990088; }
          28%  { border-color: #ffe600; box-shadow: 0 0 18px 4px #ffe60088; }
          42%  { border-color: #33ff33; box-shadow: 0 0 18px 4px #33ff3388; }
          57%  { border-color: #00ccff; box-shadow: 0 0 18px 4px #00ccff88; }
          71%  { border-color: #8833ff; box-shadow: 0 0 18px 4px #8833ff88; }
          85%  { border-color: #ff33cc; box-shadow: 0 0 18px 4px #ff33cc88; }
          100% { border-color: #ff4d4d; box-shadow: 0 0 18px 4px #ff4d4d88; }
        }
        .impossible-border {
          animation: prismatic 3s linear infinite;
        }

        /* Impossible badge gradient */
        @keyframes badgeShift {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .impossible-badge {
          background: linear-gradient(90deg, #ff4d4d, #ff9900, #ffe600, #33ff33, #00ccff, #8833ff, #ff33cc, #ff4d4d);
          background-size: 200% 100%;
          animation: badgeShift 2.5s linear infinite;
        }

        /* Impossible active clicker glow */
        @keyframes impossibleGlow {
          0%   { box-shadow: 0 0 40px #ff4d4d, 0 20px 50px rgba(0,0,0,0.2); }
          14%  { box-shadow: 0 0 40px #ff9900, 0 20px 50px rgba(0,0,0,0.2); }
          28%  { box-shadow: 0 0 40px #ffe600, 0 20px 50px rgba(0,0,0,0.2); }
          42%  { box-shadow: 0 0 40px #33ff33, 0 20px 50px rgba(0,0,0,0.2); }
          57%  { box-shadow: 0 0 40px #00ccff, 0 20px 50px rgba(0,0,0,0.2); }
          71%  { box-shadow: 0 0 40px #8833ff, 0 20px 50px rgba(0,0,0,0.2); }
          85%  { box-shadow: 0 0 40px #ff33cc, 0 20px 50px rgba(0,0,0,0.2); }
          100% { box-shadow: 0 0 40px #ff4d4d, 0 20px 50px rgba(0,0,0,0.2); }
        }
        .impossible-active-glow {
          animation: impossibleGlow 3s linear infinite;
        }
      `}</style>

      {/* Event banner */}
      {activeEvent && (
        <div className={`fixed top-0 left-0 right-0 z-[10000] py-2 px-4 font-black text-sm flex items-center justify-center gap-3 pointer-events-none ${
          activeEvent === 'golden' ? 'golden-event-banner bg-yellow-400 text-yellow-900'
          : activeEvent === 'rainbow' ? 'event-banner-rainbow text-white'
          : 'event-banner-galaxy text-white'
        }`}>
          <span className="text-lg">{EVENTS[activeEvent].emoji}</span>
          <span className="uppercase tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
            {EVENTS[activeEvent].name}! {EVENTS[activeEvent].banner}
          </span>
          <span className="bg-black/25 px-3 py-0.5 rounded-full tabular-nums font-black">
            {Math.floor(eventSecondsLeft / 60)}:{String(eventSecondsLeft % 60).padStart(2, '0')}
          </span>
          <span className="text-lg">{EVENTS[activeEvent].emoji}</span>
        </div>
      )}

      {/* Admin Panel Modal */}
      <Dialog.Root open={adminOpen} onOpenChange={(open) => { setAdminOpen(open); if (!open) { setAdminAuthed(false); setAdminPwInput(''); setAdminPwError(false); setAdminMsg(null); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[9000]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9001] w-full max-w-sm bg-card rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={22} className="text-primary" />
                <Dialog.Title className="text-xl font-black">Admin Panel</Dialog.Title>
              </div>
              <Dialog.Close className="p-1.5 hover:bg-muted rounded-full transition-colors">
                <X size={18} />
              </Dialog.Close>
            </div>

            {!adminAuthed ? (
              /* ── Password gate ── */
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Enter the admin password to continue.</p>
                <input
                  type="password"
                  value={adminPwInput}
                  onChange={e => { setAdminPwInput(e.target.value); setAdminPwError(false); }}
                  onKeyDown={e => e.key === 'Enter' && adminLogin()}
                  placeholder="Password"
                  autoFocus
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground outline-none transition-colors ${adminPwError ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                />
                {adminPwError && <p className="text-xs text-red-500 font-semibold">Incorrect password.</p>}
                <button
                  onClick={adminLogin}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-black rounded-xl hover:opacity-90 active:scale-95 transition-all"
                >
                  Unlock
                </button>
              </div>
            ) : (
              /* ── Admin controls ── */
              <div className="flex flex-col gap-4">
                <div className="bg-muted rounded-xl p-4 flex flex-col gap-3">
                  <div>
                    <p className="font-black text-sm">⚡ Trigger an Event</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Starts a 3-minute event for all players immediately. Events also occur on their own at random.</p>
                  </div>
                  {(Object.keys(EVENTS) as EventId[]).map(id => (
                    <button
                      key={id}
                      onClick={() => triggerEvent(id)}
                      className={`flex items-center justify-center gap-2 w-full py-2.5 font-black rounded-xl active:scale-95 transition-all shadow ${
                        id === 'golden' ? 'bg-yellow-400 hover:bg-yellow-300 text-yellow-900'
                        : id === 'rainbow' ? 'event-banner-rainbow text-white'
                        : 'event-banner-galaxy text-white'
                      }`}
                    >
                      <Zap size={18} />
                      {EVENTS[id].emoji} {EVENTS[id].name} · {EVENTS[id].mult}×
                    </button>
                  ))}
                  {adminMsg && (
                    <p className={`text-xs font-semibold text-center ${adminMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                      {adminMsg.text}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Rain drops — fixed overlay, pointer-events none */}
      {rainDrops.map(drop => {
        const style = {
          left: `${drop.x}vw`,
          width: drop.size,
          height: drop.size,
          animationDuration: `${drop.duration}s`,
          animationDelay: `${drop.delay}s`,
          '--drift': `${drop.drift}px`,
          top: activeEvent ? '40px' : '0',
        } as React.CSSProperties;
        if (drop.variant === 'rainbow') {
          return <div key={drop.id} className="rain-drop rain-drop-rainbow" style={style} />;
        }
        const cls = drop.variant === 'golden' ? ' rain-drop-golden'
                  : drop.variant === 'galaxy' ? ' rain-drop-galaxy' : '';
        return <img key={drop.id} src={drop.src} alt="" draggable={false} className={`rain-drop${cls}`} style={style} />;
      })}
    </div>
  );
}
