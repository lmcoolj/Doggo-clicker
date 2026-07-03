import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Volume2, VolumeX, RotateCcw, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// Helper and Constants
function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

const CLICKERS = [
  { id: 'doggo', emoji: '🐶', cost: 0, mult: 1, name: 'Doggo' },
  { id: 'kitten', emoji: '🐱', cost: 1000, mult: 1.2, name: 'Kitten' },
  { id: 'turtle', emoji: '🐢', cost: 10000, mult: 1.5, name: 'Turtle' },
  { id: 'puffin', emoji: '🐧', cost: 100000, mult: 2, name: 'Puffin' },
  { id: 'dodo', emoji: '🦤', cost: 5000000, mult: 5, name: 'Schafer Dodo', legendary: true },
];

const UPGRADES_META = {
  betterPetting: { name: "Better Petting", desc: "+1 Doggo per click", baseCost: 15, getCost: (lvl: number) => Math.floor(15 * Math.pow(1.15, lvl)) },
  autoWalker: { name: "Auto-Walker", desc: "+0.5 Doggos/sec", baseCost: 50, getCost: (lvl: number) => Math.floor(50 * Math.pow(1.15, lvl)) },
  treatDispenser: { name: "Treat Dispenser", desc: "+5 Doggos/sec", baseCost: 500, getCost: (lvl: number) => Math.floor(500 * Math.pow(1.15, lvl)) }
};

interface GameState {
  doggos: number;
  totalDoggosEarned: number;
  upgrades: {
    betterPetting: { level: number; cost: number };
    autoWalker: { level: number; cost: number };
    treatDispenser: { level: number; cost: number };
  };
  unlockedClickers: string[];
  activeClicker: string;
  soundEnabled: boolean;
}

const DEFAULT_STATE: GameState = {
  doggos: 0,
  totalDoggosEarned: 0,
  upgrades: {
    betterPetting: { level: 0, cost: 15 },
    autoWalker: { level: 0, cost: 50 },
    treatDispenser: { level: 0, cost: 500 }
  },
  unlockedClickers: ['doggo'],
  activeClicker: 'doggo',
  soundEnabled: true
};

let audioCtx: AudioContext | null = null;
const playPop = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
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
        if (parsed.upgrades && parsed.upgrades.betterPetting) {
           return { ...DEFAULT_STATE, ...parsed };
        }
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

  // Passive Income loop
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current;
      const dps = s.upgrades.autoWalker.level * 0.5 + s.upgrades.treatDispenser.level * 5;
      
      if (dps > 0) {
        setState(prev => ({
          ...prev,
          doggos: prev.doggos + dps,
          totalDoggosEarned: prev.totalDoggosEarned + dps
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const dps = state.upgrades.autoWalker.level * 0.5 + state.upgrades.treatDispenser.level * 5;
  const activeClickerDef = CLICKERS.find(c => c.id === state.activeClicker) || CLICKERS[0];
  const clickValue = (1 + state.upgrades.betterPetting.level) * activeClickerDef.mult;

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
    
    if (state.soundEnabled) playPop();

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

  const resetGame = () => {
    if (confirm("Are you sure you want to reset all progress?")) {
      setState(DEFAULT_STATE);
      localStorage.removeItem('doggoClickerState');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden font-sans select-none">
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
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{meta.name}</h3>
                    <p className="text-sm font-semibold text-muted-foreground mt-0.5">{meta.desc}</p>
                  </div>
                  <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-xs font-black">
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
            className="relative w-[340px] h-[340px] flex flex-col items-center justify-center cursor-pointer"
            onClick={handleAnimalClick}
            data-testid="main-clicker"
          >
            <div 
              className={`text-[200px] leading-none select-none transition-transform duration-100 ${isBouncing ? 'scale-90' : 'scale-100 hover:scale-105 active:scale-95'}`}
              style={{
                filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))',
              }}
            >
              <div className={activeClickerDef.legendary ? 'animate-pulse drop-shadow-[0_0_40px_rgba(255,215,0,0.6)]' : ''}>
                {activeClickerDef.emoji}
              </div>
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
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl bg-card text-card-foreground rounded-[2rem] p-8 shadow-2xl z-50 border-4 border-border">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <ShoppingCart className="text-accent" size={32} /> Clicker Shop
              </h2>
              <Dialog.Close asChild>
                <button className="p-3 bg-muted hover:bg-muted-foreground/20 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                    } ${c.legendary ? 'legendary-border overflow-visible' : ''}`}
                  >
                    {c.legendary && (
                      <div className="absolute -top-4 -right-4 bg-[#FFD700] text-yellow-950 text-xs font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-6 border-2 border-yellow-200 z-10 whitespace-nowrap">
                        ⭐ LEGENDARY
                      </div>
                    )}
                    
                    <div className="text-6xl drop-shadow-md">
                      {c.emoji}
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
            </div>
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
      `}</style>
    </div>
  );
}
