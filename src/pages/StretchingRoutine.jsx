import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, RotateCcw, CheckCircle2 } from "lucide-react";

const stretches = [
  {
    name: "Standing Forward Fold",
    duration: 30,
    muscle: "Hamstrings & Lower Back",
    emoji: "🙇",
    color: "from-sky-400 to-blue-500",
    description: "Feet together, bend down as far as you can. Hands on ankles. Try to spread legs slightly and reach lower.",
    tip: "Let gravity pull you down — no bouncing!"
  },
  {
    name: "Single Leg to Chest",
    duration: 30,
    muscle: "Hip Flexors & Glutes",
    emoji: "🦵",
    color: "from-violet-400 to-purple-500",
    description: "Stand tall, raise one leg and pull your knee to your chest. Hold 15s then switch legs.",
    tip: "If you lose balance, lean on a wall or chair."
  },
  {
    name: "Wide Leg Forward Bend",
    duration: 30,
    muscle: "Inner Thighs & Back",
    emoji: "🤸",
    color: "from-amber-400 to-orange-500",
    description: "Spread legs wide, arms stretched and joined. Bend down and stretch, keeping your back straight.",
    tip: "Feel the stretch in your back and arms — keep the spine long."
  },
  {
    name: "Side Body Stretch — Left",
    duration: 15,
    muscle: "Obliques & Lats",
    emoji: "🌊",
    color: "from-teal-400 to-green-500",
    description: "Legs slightly apart, join arms above and stretch them to the right side. Feel the full left side stretch.",
    tip: "Push a little more at the end — really feel it!"
  },
  {
    name: "Side Body Stretch — Right",
    duration: 15,
    muscle: "Obliques & Lats",
    emoji: "🌊",
    color: "from-emerald-400 to-teal-600",
    description: "Now stretch arms over to the left side. Feel the full right side stretch.",
    tip: "Keep hips square and arms fully extended."
  },
  {
    name: "Neck Stretch",
    duration: 30,
    muscle: "Neck & Upper Traps",
    emoji: "🔄",
    color: "from-rose-400 to-red-500",
    description: "Feet together, hands clasped behind your head (nape). Slowly lower your chin to your chest and hold.",
    tip: "Go slow and gentle — feel the back of the neck lengthen."
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

      {/* Top bar: progress + reset */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleReset} className="text-white/70 hover:text-white text-sm flex items-center gap-1">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <p className="text-xs text-white/60">{currentIdx + 1} of {stretches.length}</p>
          <div className="w-16" />
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/60 mt-1">
          <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed</span>
          <span>{Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")} total</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-6 pb-6 pt-2">

        {/* LEFT — Theatre video */}
        <div className="flex flex-col gap-3 lg:flex-1">
          {/* Stretch video — theatre style, muted, starts at 1:25 */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src="https://www.youtube.com/embed/TrGY7fneUKM?si=aTBf0yssbEj_KLlJ&start=89&autoplay=1&mute=1"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="w-full aspect-video"
            />
          </div>

          {/* Music — clickable thumbnail that opens YouTube */}
          <a
            href="https://www.youtube.com/watch?v=QEWV6fiYaDU&t=89"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black/30 hover:bg-black/50 rounded-xl px-4 py-2 transition-all group"
          >
            <img
              src="https://img.youtube.com/vi/QEWV6fiYaDU/default.jpg"
              alt="Background Music"
              className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-0.5">🎵 Background Music</p>
              <p className="text-sm text-white font-medium truncate">Open in YouTube</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500">
              <Play className="w-3 h-3 text-white ml-0.5" />
            </div>
          </a>
        </div>

        {/* RIGHT — Timer & controls */}
        <div className="flex flex-col items-center justify-center gap-4 lg:w-80">
          {/* Stretch name */}
          <div className="text-center">
            <h2 className="text-3xl font-black mb-1">{current.name}</h2>
            <p className="text-white/70 text-sm font-medium">{current.muscle}</p>
          </div>

          {/* Circular timer */}
          <div className="relative">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <circle
                cx="80" cy="80" r="68"
                fill="none"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 68}
                strokeDashoffset={2 * Math.PI * 68 - (progressPct / 100) * 2 * Math.PI * 68}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black">{timeLeft}</span>
              <span className="text-sm text-white/60">sec</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-center w-full">
            <p className="text-sm font-medium text-white mb-2">{current.description}</p>
            <p className="text-xs text-white/70 italic">💡 {current.tip}</p>
          </div>

          {/* Controls */}
          <div className="flex gap-3 w-full">
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
          <div className="w-full">
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
      </div>
    </div>
  );
}