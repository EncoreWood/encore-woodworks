import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, RotateCcw, CheckCircle2 } from "lucide-react";

const stretches = [
  {
    name: "Neck Rolls",
    duration: 30,
    muscle: "Neck & Upper Traps",
    emoji: "🔄",
    color: "from-sky-400 to-blue-500",
    description: "Slowly roll your head in full circles. Keep shoulders relaxed and breathe deeply.",
    tip: "Go slow — no fast jerking movements!"
  },
  {
    name: "Shoulder Rolls",
    duration: 30,
    muscle: "Shoulders & Upper Back",
    emoji: "🤸",
    color: "from-violet-400 to-purple-500",
    description: "Roll both shoulders backward in big circles 5x, then reverse direction 5x.",
    tip: "Really exaggerate the motion — big circles!"
  },
  {
    name: "Chest Opener",
    duration: 30,
    muscle: "Chest & Pecs",
    emoji: "💪",
    color: "from-amber-400 to-orange-500",
    description: "Clasp hands behind your back, squeeze shoulder blades together and lift chest up.",
    tip: "Hold steady — feel the chest stretch open."
  },
  {
    name: "Side Body Stretch",
    duration: 30,
    muscle: "Obliques & Lats",
    emoji: "🌊",
    color: "from-teal-400 to-green-500",
    description: "Reach one arm overhead and lean to the opposite side. Switch halfway.",
    tip: "Keep hips square — the stretch should be in your side."
  },
  {
    name: "Standing Forward Bend",
    duration: 30,
    muscle: "Hamstrings & Lower Back",
    emoji: "🙇",
    color: "from-rose-400 to-red-500",
    description: "Feet hip-width apart, hinge at hips and let arms hang. Bend knees slightly if needed.",
    tip: "Let gravity do the work — don't force it down."
  },
  {
    name: "Quad Stretch",
    duration: 30,
    muscle: "Quadriceps & Hip Flexors",
    emoji: "🦵",
    color: "from-indigo-400 to-blue-600",
    description: "Hold a wall for balance. Pull one foot to glutes and hold 15s. Switch legs.",
    tip: "Stand tall — don't lean forward!"
  },
  {
    name: "Calf Stretch",
    duration: 30,
    muscle: "Calves & Achilles",
    emoji: "👣",
    color: "from-emerald-400 to-green-600",
    description: "Step one foot back, press heel into floor. Lean slightly forward. Switch legs.",
    tip: "Keep back heel flat on the ground."
  },
  {
    name: "Hip Circles",
    duration: 30,
    muscle: "Hips & Lower Back",
    emoji: "⭕",
    color: "from-yellow-400 to-amber-500",
    description: "Hands on hips, feet shoulder-width apart. Make big slow circles with your hips.",
    tip: "This one always gets a laugh — own it!"
  }
];

const MUSIC_URL = "https://www.youtube.com/embed/videoseries?list=PLbpi6ZahtOH6Ar_3GPy3workoutmusic&autoplay=1&mute=0&loop=1";

export default function StretchingRoutine() {
  const [phase, setPhase] = useState("intro"); // intro | active | done
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(stretches[0].duration);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef(null);

  const current = stretches[currentIdx];
  const totalTime = stretches.reduce((s, x) => s + x.duration, 0);
  const elapsed = stretches.slice(0, currentIdx).reduce((s, x) => s + x.duration, 0) + (current.duration - timeLeft);
  const overallProgress = Math.min(100, (elapsed / totalTime) * 100);

  useEffect(() => {
    if (running && phase === "active") {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Move to next
            if (currentIdx < stretches.length - 1) {
              setCurrentIdx(i => i + 1);
              return stretches[currentIdx + 1].duration;
            } else {
              clearInterval(intervalRef.current);
              setRunning(false);
              setPhase("done");
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, phase, currentIdx]);

  const handleStart = () => {
    setPhase("active");
    setRunning(true);
    setCurrentIdx(0);
    setTimeLeft(stretches[0].duration);
  };

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    if (currentIdx < stretches.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setTimeLeft(stretches[next].duration);
      if (running) {
        // restart interval
        setRunning(false);
        setTimeout(() => setRunning(true), 50);
      }
    } else {
      setRunning(false);
      setPhase("done");
    }
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setPhase("intro");
    setRunning(false);
    setCurrentIdx(0);
    setTimeLeft(stretches[0].duration);
  };

  const progressPct = ((current.duration - timeLeft) / current.duration) * 100;
  const circumference = 2 * Math.PI * 54;

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏋️</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
            Let's Stretch!
          </h1>
          <p className="text-blue-200 text-lg mb-2">4 minutes · 8 stretches · Full body</p>
          <p className="text-slate-400 text-sm mb-8">Covering neck, shoulders, chest, back, hips & legs</p>

          <div className="grid grid-cols-4 gap-2 mb-8">
            {stretches.map((s, i) => (
              <div key={i} className={`rounded-xl p-2 bg-gradient-to-br ${s.color} bg-opacity-20`}>
                <div className="text-xl mb-1">{s.emoji}</div>
                <p className="text-xs font-semibold text-white leading-tight">{s.name}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={handleStart}
            className="w-full py-6 text-xl font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl shadow-2xl shadow-amber-500/40 mb-4"
          >
            <Play className="w-6 h-6 mr-2" /> Start Stretching!
          </Button>

          <div className="mt-6">
            <Link to={createPageUrl("MorningMeeting")}>
              <button className="text-sm text-slate-500 hover:text-slate-300">← Back to Morning Meeting</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-green-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">
            Great Work!
          </h1>
          <p className="text-emerald-200 text-lg mb-8">You're all warmed up and ready to crush it today!</p>
          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10">
              <RotateCcw className="w-4 h-4" /> Again
            </button>
            <Link to={createPageUrl("MorningMeeting")} className="flex-2 flex-1">
              <Button className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Back to Meeting
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active phase
  return (
    <div className={`min-h-screen bg-gradient-to-br ${current.color} flex flex-col text-white`}>
      {/* Background music — hidden, autoplay */}
      <iframe
        src="https://www.youtube.com/embed/QEWV6fiYaDU?autoplay=1&loop=1&playlist=QEWV6fiYaDU&controls=0"
        title="Background Music"
        className="hidden"
        allow="autoplay"
        frameBorder="0"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <button onClick={handleReset} className="text-white/70 hover:text-white text-sm flex items-center gap-1">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <div className="text-center">
          <p className="text-xs text-white/60">{currentIdx + 1} of {stretches.length}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Overall progress bar */}
      <div className="mx-6 mb-4">
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-1000"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/60 mt-1">
          <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed</span>
          <span>{Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")} total</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        {/* Stretch video — muted, starts at 1:25 (85s) */}
        <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl mb-4">
          <iframe
            src="https://www.youtube.com/embed/TrGY7fneUKM?autoplay=1&mute=1&start=85&controls=0&modestbranding=1&rel=0"
            title="Stretching Routine"
            className="w-full aspect-video"
            allow="autoplay"
            frameBorder="0"
            allowFullScreen
          />
        </div>

        {/* Stretch name */}
        <h2 className="text-2xl font-black text-center mb-1">{current.name}</h2>
        <p className="text-white/70 text-sm font-medium mb-4">{current.muscle}</p>

        {/* Circular timer */}
        <div className="relative mb-6">
          <svg width="128" height="128" className="-rotate-90">
            <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progressPct / 100) * circumference}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black">{timeLeft}</span>
            <span className="text-xs text-white/60">sec</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-center max-w-xs mb-4">
          <p className="text-sm font-medium text-white mb-2">{current.description}</p>
          <p className="text-xs text-white/70 italic">💡 {current.tip}</p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => setRunning(r => !r)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/20 hover:bg-white/30 font-bold text-lg"
          >
            {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {running ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleSkip}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 font-bold"
          >
            <SkipForward className="w-5 h-5" /> Skip
          </button>
        </div>

        {/* Upcoming stretches */}
        <div className="mt-6 w-full max-w-xs">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2 text-center">Up Next</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {stretches.slice(currentIdx + 1, currentIdx + 4).map((s, i) => (
              <div key={i} className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-2 text-center min-w-[72px]">
                <div className="text-xl">{s.emoji}</div>
                <p className="text-xs text-white/80 font-medium leading-tight">{s.name}</p>
                <p className="text-xs text-white/50">{s.duration}s</p>
              </div>
            ))}
            {currentIdx === stretches.length - 1 && (
              <div className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-2 text-center min-w-[72px]">
                <div className="text-xl">🎉</div>
                <p className="text-xs text-white/80 font-medium">Done!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}