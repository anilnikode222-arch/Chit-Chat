"use client";

import React, { useState, useEffect, useRef } from "react";
import "../../app/gamehub.css";
import audioSynth from "../../gamehub/core/AudioSynth";
import gameStorage, { PlayerProfile } from "../../gamehub/core/Storage";
import ChessBoard from "../../gamehub/games/chess/ChessBoard";
import LudoBoard from "../../gamehub/games/ludo/LudoBoard";
import { 
  Volume2, 
  VolumeX, 
  Music, 
  Settings, 
  Trophy, 
  User, 
  Sparkles, 
  Flame, 
  Zap, 
  HelpCircle,
  TrendingUp,
  X,
  Play,
  RotateCcw
} from "lucide-react";

export default function GameHubPortal() {
  // Navigation: 'loading' | 'hub' | 'chess' | 'ludo'
  const [scene, setScene] = useState<"loading" | "hub" | "chess" | "ludo">("loading");
  
  // Loading progress
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing Core Engine...");

  // Core settings states
  const [sfx, setSfx] = useState(true);
  const [bgMusic, setBgMusic] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  // Player Profile State
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  // HTML5 Canvas particles reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load profile on mount
  useEffect(() => {
    const loadedProfile = gameStorage.getProfile();
    setProfile(loadedProfile);
    setSfx(audioSynth.isSFXEnabled());
    setBgMusic(audioSynth.isMusicEnabled());

    // Check if daily was already claimed today
    const lastClaim = localStorage.getItem("gamehub_last_daily");
    const today = new Date().toDateString();
    if (lastClaim === today) {
      setDailyClaimed(true);
    } else {
      // Trigger daily modal on launch dashboard
      setTimeout(() => {
        if (scene === "hub") setShowDailyReward(true);
      }, 2000);
    }
  }, [scene]);

  // Loading Screen Asset preloader simulation
  useEffect(() => {
    if (scene !== "loading") return;

    const stages = [
      { progress: 15, status: "Loading Web Audio Synthesizer network..." },
      { progress: 40, status: "Compiling Grandmaster Chess rules matrix..." },
      { progress: 65, status: "Calculating circular Ludo path coordinates..." },
      { progress: 85, status: "Mapping base yards and safe zones..." },
      { progress: 100, status: "Platform Ready. Welcome to GameHub 2D." }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setScene("hub");
          }, 800);
          return 100;
        }
        
        // Advance progress
        const target = stages[currentStage].progress;
        if (prev < target) {
          setLoadingStatus(stages[currentStage].status);
          return prev + 1;
        } else {
          currentStage = Math.min(currentStage + 1, stages.length - 1);
          return prev;
        }
      });
    }, 25);

    return () => clearInterval(interval);
  }, [scene]);

  // Canvas Vector Particles Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle class
    class Particle {
      x: number = Math.random() * width;
      y: number = Math.random() * height;
      vx: number = (Math.random() * 2 - 1) * 0.25;
      vy: number = (Math.random() * 2 - 1) * 0.25;
      radius: number = Math.random() * 1.5 + 0.5;
      color: string = Math.random() > 0.5 ? "rgba(6, 182, 212, 0.15)" : "rgba(168, 85, 247, 0.15)";

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.shadowBlur = 8;
        c.shadowColor = this.color;
        c.fill();
      }
    }

    const particles: Particle[] = Array(60).fill(null).map(() => new Particle());

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [scene]);

  // Audio settings toggles
  const handleSFXToggle = () => {
    audioSynth.playClick();
    const nextVal = !sfx;
    setSfx(nextVal);
    audioSynth.setSFXEnabled(nextVal);
  };

  const handleMusicToggle = () => {
    audioSynth.playClick();
    const nextVal = !bgMusic;
    setBgMusic(nextVal);
    audioSynth.setMusicEnabled(nextVal);
  };

  // Stats updater
  const handleStatsUpdate = (game: "chess" | "ludo", won: boolean) => {
    if (!profile) return;
    
    const nextProfile = { ...profile };
    if (game === "chess") {
      nextProfile.stats.chessPlayed += 1;
      if (won) nextProfile.stats.chessWon += 1;
    } else {
      nextProfile.stats.ludoPlayed += 1;
      if (won) nextProfile.stats.ludoWon += 1;
    }

    // Award XP
    const xpReward = won ? 350 : 100;
    const { levelUp, newLevel } = gameStorage.addXP(xpReward);
    
    nextProfile.xp += xpReward;
    nextProfile.level = newLevel;
    
    if (levelUp) {
      alert(`🎉 LEVEL UP! You reached Level ${newLevel}!`);
    }

    gameStorage.saveProfile(nextProfile);
    setProfile(nextProfile);
  };

  // Daily XP reward claimer
  const handleClaimDaily = () => {
    if (dailyClaimed || !profile) return;
    audioSynth.playWin();

    const xpAmount = 500;
    const { levelUp, newLevel } = gameStorage.addXP(xpAmount);
    
    const nextProfile = {
      ...profile,
      xp: profile.xp + xpAmount,
      level: newLevel
    };
    
    gameStorage.saveProfile(nextProfile);
    setProfile(nextProfile);

    // Save claim date
    const today = new Date().toDateString();
    localStorage.setItem("gamehub_last_daily", today);
    
    setDailyClaimed(true);
    setShowDailyReward(false);
    
    alert(`🎁 Successfully claimed 500 XP! ${levelUp ? `You leveled up to ${newLevel}!` : ""}`);
  };

  const resetProfile = () => {
    audioSynth.playClick();
    if (confirm("Are you sure you want to reset your Player profile and level stats?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="hub-portal relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* HTML5 Particle Canvas Background */}
      <canvas ref={canvasRef} className="canvas-particles absolute inset-0 z-0 pointer-events-none" />

      {/* Decorative Orbs */}
      <div className="aura-orb aura-blue" />
      <div className="aura-orb aura-purple" />

      {/* HEADER HUD BAR */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center z-10 select-none">
        <div 
          onClick={() => { audioSynth.playClick(); setScene("hub"); }} 
          className="cursor-pointer flex items-center gap-3 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-xl font-bold text-white">🎮</span>
          </div>
          <div>
            <h1 className="text-md font-black tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase">
              GameHub 2D
            </h1>
            <span className="text-[9px] block text-zinc-500 uppercase tracking-widest font-bold">Arcade Console</span>
          </div>
        </div>

        {/* Real-time Profile and SettingsHUD controls */}
        {scene !== "loading" && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { audioSynth.playClick(); setShowProfile(true); }}
              className="btn-neon flex items-center gap-2 border-cyan-500/20 text-cyan-400"
            >
              <User className="w-4 h-4" />
              <span className="text-2xs font-extrabold uppercase hidden md:inline">Profile</span>
            </button>
            <button 
              onClick={() => { audioSynth.playClick(); setShowSettings(true); }}
              className="btn-neon flex items-center gap-2 border-purple-500/20 text-purple-400"
            >
              <Settings className="w-4 h-4" />
              <span className="text-2xs font-extrabold uppercase hidden md:inline">Settings</span>
            </button>
          </div>
        )}
      </header>

      {/* MAIN VIEW SYSTEM */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col items-center justify-center z-10">
        
        {/* ==========================================
           1. PRELOADER SCENE
           ========================================== */}
        {scene === "loading" && (
          <div className="flex flex-col items-center text-center animate-pulse select-none max-w-md w-full">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 mb-8 animate-bounce">
              <span className="text-4xl">🎮</span>
            </div>
            
            <h2 className="text-lg font-black tracking-widest uppercase mb-1 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Loading Console Engine
            </h2>
            <p className="text-zinc-500 text-3xs font-bold uppercase tracking-widest mb-6">Asset Preloader</p>

            {/* Percentage Bar */}
            <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden mb-3 relative">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-75"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-zinc-500 text-[10px] font-bold">
              <span>{loadingStatus}</span>
              <span className="text-cyan-400">{loadProgress}%</span>
            </div>
          </div>
        )}

        {/* ==========================================
           2. HUB INTERACTIVE DASHBOARD
           ========================================== */}
        {scene === "hub" && (
          <div className="w-full flex flex-col gap-10 animate-slide-up select-none">
            
            {/* Top Showcase banner */}
            <div className="glass-card p-8 bg-zinc-950/40 border-cyan-500/10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                  🔥 Local Play Ready
                </span>
                <h2 className="text-2xl font-black uppercase tracking-wide leading-tight">
                  Unleash Your Ultimate Tactics
                </h2>
                <p className="text-zinc-400 text-xs font-semibold max-w-lg">
                  Modular retro gaming hub built for responsive play, zero-glitch board movements, and procedural audio synthesis.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
                <div className="text-center px-4 border-r border-zinc-800">
                  <span className="text-lg block">🌟</span>
                  <span className="text-xs font-black block">{profile?.level || 1}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Console Level</span>
                </div>
                <div className="text-center px-4">
                  <span className="text-lg block">🏆</span>
                  <span className="text-xs font-black block">
                    {((profile?.stats.chessWon || 0) + (profile?.stats.ludoWon || 0)) * 350}
                  </span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Total XP</span>
                </div>
              </div>
            </div>

            {/* GAMES CARDS VIEW GRID */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">Available Library</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. CHESS CARD */}
                <div 
                  onClick={() => { audioSynth.playClick(); setScene("chess"); }}
                  className="game-card game-card-chess glass-card p-6 border-cyan-500/10 bg-zinc-950/40 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-2xl mb-6 shadow-inner glow-particle">
                    👑
                  </div>
                  <h4 className="text-md font-extrabold uppercase tracking-wide glow-text-blue mb-1">Chess</h4>
                  <p className="text-zinc-400 text-3xs font-semibold uppercase tracking-widest mb-3">2-Player Offline</p>
                  <p className="text-zinc-500 text-2xs font-semibold leading-relaxed mb-6">
                    Elite rules engine supporting Pawn promotion, Castling, and En Passant with anti-exposure checks.
                  </p>
                  <button className="btn-neon btn-neon-blue w-full flex items-center justify-center gap-2 py-2 text-3xs">
                    <Play className="w-3.5 h-3.5 fill-cyan-400" /> Start Engine
                  </button>
                </div>

                {/* 2. LUDO CARD */}
                <div 
                  onClick={() => { audioSynth.playClick(); setScene("ludo"); }}
                  className="game-card game-card-ludo glass-card p-6 border-purple-500/10 bg-zinc-950/40 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-6 shadow-inner glow-particle">
                    🎲
                  </div>
                  <h4 className="text-md font-extrabold uppercase tracking-wide glow-text-purple mb-1">Ludo</h4>
                  <p className="text-zinc-400 text-3xs font-semibold uppercase tracking-widest mb-3">1 to 4 Players / Bots</p>
                  <p className="text-zinc-500 text-2xs font-semibold leading-relaxed mb-6">
                    Multi-token collision yard rules, 3D dice spinners, and safety star cells.
                  </p>
                  <button className="btn-neon btn-neon-purple w-full flex items-center justify-center gap-2 py-2 text-3xs">
                    <Play className="w-3.5 h-3.5 fill-purple-400" /> Start Board
                  </button>
                </div>

                {/* EXPANDABLE HOVER CARDS (Incoming library games) */}
                <div className="glass-card p-6 border-zinc-900 bg-zinc-950/20 opacity-55 relative group overflow-hidden">
                  <div className="absolute top-3 right-3 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-yellow-500/20 bg-yellow-950/20 text-yellow-500">
                    Incoming
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl mb-6 opacity-40">
                    🏁
                  </div>
                  <h4 className="text-md font-extrabold uppercase tracking-wide text-zinc-400 mb-1">Checkers</h4>
                  <p className="text-zinc-500 text-3xs font-bold uppercase tracking-widest mb-3">2-Player local</p>
                  <p className="text-zinc-600 text-2xs font-semibold leading-relaxed mb-6">
                    Drafts jumping battle mechanics with multi-kill validations and king elevations.
                  </p>
                  <button disabled className="btn-neon w-full border-zinc-800 text-zinc-600 text-center flex justify-center py-2 text-3xs pointer-events-none">
                    Locks Active
                  </button>
                </div>

                <div className="glass-card p-6 border-zinc-900 bg-zinc-950/20 opacity-55 relative group overflow-hidden">
                  <div className="absolute top-3 right-3 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-yellow-500/20 bg-yellow-950/20 text-yellow-500">
                    Incoming
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl mb-6 opacity-40">
                    🃏
                  </div>
                  <h4 className="text-md font-extrabold uppercase tracking-wide text-zinc-400 mb-1">Blackjack</h4>
                  <p className="text-zinc-500 text-3xs font-bold uppercase tracking-widest mb-3">Card Classic</p>
                  <p className="text-zinc-600 text-2xs font-semibold leading-relaxed mb-6">
                    High-stakes banker double downs, splits, and probability indicators.
                  </p>
                  <button disabled className="btn-neon w-full border-zinc-800 text-zinc-600 text-center flex justify-center py-2 text-3xs pointer-events-none">
                    Locks Active
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
           3. CHESS GAME SCENE
           ========================================== */}
        {scene === "chess" && (
          <ChessBoard 
            onBackToHub={() => { audioSynth.playClick(); setScene("hub"); }} 
            onStatsUpdate={(won) => handleStatsUpdate("chess", won)}
          />
        )}

        {/* ==========================================
           4. LUDO GAME SCENE
           ========================================== */}
        {scene === "ludo" && (
          <LudoBoard 
            onBackToHub={() => { audioSynth.playClick(); setScene("hub"); }} 
            onStatsUpdate={(won) => handleStatsUpdate("ludo", won)}
          />
        )}
      </main>

      {/* FOOTER HUB CREDITS */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-2 z-10 text-3xs font-bold uppercase tracking-widest text-zinc-500 select-none">
        <span>🎮 GameHub 2D Console platform v1.0</span>
        <span className="flex items-center gap-1.5">
          Developed with <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-spin" /> and 100% pure audio synthesis
        </span>
      </footer>

      {/* ==========================================
         SETTINGS POPUP MODAL
         ========================================== */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-20 flex items-center justify-center p-6 select-none animate-slide-up">
          <div className="glass-card max-w-md w-full p-6 border-purple-500/20 bg-zinc-950 relative">
            <button 
              onClick={() => { audioSynth.playClick(); setShowSettings(false); }}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-black uppercase tracking-widest glow-text-purple flex items-center gap-2 mb-6">
              ⚙️ Engine settings
            </h3>

            <div className="space-y-4 mb-8">
              {/* Sound effects */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-3">
                  {sfx ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
                  <div>
                    <span className="text-2xs font-extrabold uppercase block">SFX Sound Effects</span>
                    <span className="text-[9px] text-zinc-500 font-bold block">Synthesized oscillators</span>
                  </div>
                </div>
                <button 
                  onClick={handleSFXToggle}
                  className={`btn-neon text-3xs px-4 py-1.5 ${sfx ? "btn-neon-blue" : "border-zinc-800 text-zinc-500"}`}
                >
                  {sfx ? "Active" : "Muted"}
                </button>
              </div>

              {/* Loop ambient music */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-purple-400" />
                  <div>
                    <span className="text-2xs font-extrabold uppercase block">Chiptune BGM</span>
                    <span className="text-[9px] text-zinc-500 font-bold block">Ambient chiptune loop</span>
                  </div>
                </div>
                <button 
                  onClick={handleMusicToggle}
                  className={`btn-neon text-3xs px-4 py-1.5 ${bgMusic ? "btn-neon-purple" : "border-zinc-800 text-zinc-500"}`}
                >
                  {bgMusic ? "Active" : "Muted"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetProfile} className="flex-1 btn-neon text-3xs py-3 border-red-500/20 text-red-500 hover:bg-red-500/10 flex justify-center items-center gap-1.5 uppercase">
                <RotateCcw className="w-3.5 h-3.5" /> Wipe Profile
              </button>
              <button 
                onClick={() => { audioSynth.playClick(); setShowSettings(false); }}
                className="flex-1 btn-neon btn-neon-purple text-3xs py-3 flex justify-center uppercase"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PLAYER PROFILE MODAL
         ========================================== */}
      {showProfile && profile && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-20 flex items-center justify-center p-6 select-none animate-slide-up">
          <div className="glass-card max-w-md w-full p-6 border-cyan-500/20 bg-zinc-950 relative">
            <button 
              onClick={() => { audioSynth.playClick(); setShowProfile(false); }}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-black uppercase tracking-widest glow-text-blue flex items-center gap-2 mb-6">
              🎮 Arcade Profile
            </h3>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-tr from-cyan-950/20 to-purple-950/20 border border-cyan-500/15 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center text-4xl shadow-inner glow-particle">
                {profile.avatar}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-zinc-100">{profile.username}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-950/40">
                    LVL {profile.level}
                  </span>
                  <span className="text-3xs text-zinc-400 font-bold uppercase">{profile.xp} XP</span>
                </div>
              </div>
            </div>

            {/* Game Records Statistics */}
            <div className="space-y-3 mb-6">
              <span className="text-3xs font-bold text-zinc-500 uppercase tracking-widest block">Game Statistics</span>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Chess stats */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <span className="text-3xs text-zinc-400 uppercase font-bold block mb-1">Chess Match</span>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">W/L Record</span>
                    <span className="text-xs font-black text-cyan-400">
                      {profile.stats.chessWon} / {profile.stats.chessPlayed - profile.stats.chessWon}
                    </span>
                  </div>
                </div>

                {/* Ludo stats */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <span className="text-3xs text-zinc-400 uppercase font-bold block mb-1">Ludo Match</span>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">W/L Record</span>
                    <span className="text-xs font-black text-purple-400">
                      {profile.stats.ludoWon} / {profile.stats.ludoPlayed - profile.stats.ludoWon}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { audioSynth.playClick(); setShowProfile(false); }}
              className="btn-neon btn-neon-blue w-full flex justify-center py-2.5 text-3xs font-extrabold uppercase"
            >
              Close Stats
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
         DAILY REWARD MODAL
         ========================================== */}
      {showDailyReward && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-30 flex items-center justify-center p-6 select-none animate-slide-up">
          <div className="glass-card max-w-md w-full p-6 border-yellow-500/20 bg-zinc-950 relative text-center">
            
            <span className="text-6xl block mb-4 animate-bounce">🎁</span>
            <h3 className="text-lg font-black uppercase text-amber-400 text-glow-yellow mb-2">Daily Console Reward!</h3>
            <p className="text-zinc-300 text-xs font-semibold max-w-xs mx-auto mb-6">
              Welcome back, Commander! Claim your daily arcade presence bonus to accelerate your level!
            </p>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-8 max-w-xs mx-auto">
              <span className="text-2xs font-extrabold uppercase tracking-widest text-zinc-500 block mb-1">XP Reward Bundle</span>
              <span className="text-xl font-black text-amber-400 glow-text-purple">+500 XP</span>
            </div>

            <button
              onClick={handleClaimDaily}
              className="btn-neon btn-neon-purple w-full flex justify-center py-3 text-3xs font-extrabold uppercase tracking-widest bg-amber-600 border-amber-500 hover:bg-amber-500"
            >
              Claim Daily XP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
