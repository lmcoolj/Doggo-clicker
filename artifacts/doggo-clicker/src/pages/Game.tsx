import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Volume2, VolumeX, RotateCcw, X, Play } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

// Helper and Constants
function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

const CLICKERS = [
  { id: 'doggo',          cost: 0,           mult: 1,    name: 'Doggo' },
  { id: 'kitten',         cost: 1_000,       mult: 1.2,  name: 'Kitten' },
  { id: 'monkey',         cost: 5_000,       mult: 1.35, name: 'Monkey' },
  { id: 'turtle',         cost: 10_000,      mult: 1.5,  name: 'Turtle' },
  { id: 'lion',           cost: 30_000,      mult: 1.65, name: 'Lion' },
  { id: 'pufferfish',     cost: 75_000,      mult: 1.85, name: 'Puffer Fish' },
  { id: 'puffin',         cost: 100_000,     mult: 2,    name: 'Puffin' },
  { id: 'octopus',        cost: 300_000,     mult: 2.3,  name: 'Octopus',      rare: true },
  { id: 'axolotl',        cost: 800_000,     mult: 2.8,  name: 'Axolotl',      rare: true },
  { id: 'anglerfish',     cost: 2_000_000,   mult: 3.5,  name: 'Angler Fish',  rare: true },
  { id: 'dodo',           cost: 5_000_000,   mult: 5,    name: 'Schafer Dodo', legendary: true },
  { id: 'amanda-dodo',    cost: 15_000_000,  mult: 7,    name: 'Amanda Dodo',  legendary: true },
  { id: 'larus-dodo',     cost: 50_000_000,  mult: 9,    name: 'Lárus Dodo',   legendary: true },
  { id: 'rainbow-dodo',   cost: 500_000_000, mult: 15,   name: 'Rainbow Dodo', impossible: true },
  { id: 'golden-axolotl', cost: 1_000_000_000, mult: 25, name: 'Golden Axolotl', impossible: true },
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
  { id: 'cherry',  name: 'Cherry Blossom',cost: 75000,   palette: ['#F472B6','#FFF0F6','#DB2777'] },
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

interface UpgState { level: number; cost: number; }

interface GameState {
  doggos: number;
  totalDoggosEarned: number;
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
  const [shopOpen, setShopOpen] = useState(false);
  const stateRef = useRef(state);
  
  // Persist and keep ref updated
  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem('doggoClickerState', JSON.stringify(state));
  }, [state]);

  const rebirthMult = 1 + state.rebirths * 0.5;
  const activeClickerDef = CLICKERS.find(c => c.id === state.activeClicker) || CLICKERS[0];

  const clickValue = (
    1
    + state.upgrades.betterPetting.level
    + state.upgrades.goldenLeash.level * 3
    + state.upgrades.cosmicBone.level * 20
  ) * activeClickerDef.mult * rebirthMult;

  const dps = (
    state.upgrades.autoWalker.level * 0.5
    + state.upgrades.treatDispenser.level * 5
    + state.upgrades.fetchTraining.level * 5
    + state.upgrades.biscuitFactory.level * 25
    + state.upgrades.dogWhisperer.level * 100
    + state.upgrades.cosmicBone.level * 500
  ) * rebirthMult;

  // Passive Income loop
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current;
      const currentRebirthMult = 1 + s.rebirths * 0.5;
      const currentDps = (
        s.upgrades.autoWalker.level * 0.5
        + s.upgrades.treatDispenser.level * 5
        + s.upgrades.fetchTraining.level * 5
        + s.upgrades.biscuitFactory.level * 25
        + s.upgrades.dogWhisperer.level * 100
        + s.upgrades.cosmicBone.level * 500
      ) * currentRebirthMult;
      
      if (currentDps > 0) {
        setState(prev => ({
          ...prev,
          doggos: prev.doggos + currentDps,
          totalDoggosEarned: prev.totalDoggosEarned + currentDps
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAnimalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextFloaterId.current++;

    setState(prev => ({
      ...prev,
      doggos: prev.doggos + clickValue,
      totalDoggosEarned: prev.totalDoggosEarned + clickValue
    }));

    setFloaters(prev => [...prev, { id, x, y, val: clickValue }]);
    
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
      if (prev.doggos >= upg.cost) {
        const nextLevel = upg.level + 1;
        const nextCost = UPGRADES_META[upgradeKey].getCost(nextLevel);
        return {
          ...prev,
          doggos: prev.doggos - upg.cost,
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
    setState(prev => {
      if (!prev.unlockedClickers.includes(clickerId) && prev.doggos >= cost) {
        return {
          ...prev,
          doggos: prev.doggos - cost,
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
    setState(prev => {
      if (!prev.unlockedThemes.includes(themeId) && prev.doggos >= cost) {
        return {
          ...prev,
          doggos: prev.doggos - cost,
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
    setState(prev => {
      if (!prev.unlockedSounds.includes(soundId) && prev.doggos >= cost) {
        return {
          ...prev,
          doggos: prev.doggos - cost,
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
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden font-sans select-none" data-theme={state.activeTheme}>
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
        </div>
        
        <div className="flex items-center gap-6">
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
            const canAfford = state.doggos >= upgState.cost;
            
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
                  Buy for {formatNumber(upgState.cost)}
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
                    const canAfford = state.doggos >= c.cost;
                    
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
                                Unlock: {formatNumber(c.cost)}
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
                    const canAfford = state.doggos >= t.cost;
                    
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
                                Unlock: {formatNumber(t.cost)}
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
                    const canAfford = state.doggos >= s.cost;

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
                              Unlock: {formatNumber(s.cost)}
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
    </div>
  );
}
