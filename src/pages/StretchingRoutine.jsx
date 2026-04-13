import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, CheckCircle2 } from "lucide-react";

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

// Background color cycles every 30s — one gradient per stretch color
const BG_GRADIENTS = [
  "from-sky-900 via-blue-950 to-indigo-950",
  "from-violet-900 via-purple-950 to-indigo-950",
  "from-amber-900 via-orange-950 to-yellow-950",
  "from-teal-900 via-green-950 to-emerald-950",
  "from-emerald-900 via-teal-950 to-cyan-950",
  "from-rose-900 via-red-950 to-pink-950",
];

export default function StretchingRoutine() {
  const [phase, setPhase] = useState("intro"); // intro | active | done
  const [bgIdx, setBgIdx] = useState(0);
  const [tick, setTick] = useState(0); // 0–29 within each 30s cycle

  const intervalRef = useRef(null);
  const musicRef = useRef(null);

  const totalSeconds = useRef(0);

  useEffect(() => {
    if (phase === "active") {
      totalSeconds.current = 0;
      intervalRef.current = setInterval(() => {
        totalSeconds.current += 1;
        // End after 3 minutes (180s) to match the video
        if (totalSeconds.current >= 180) {
          clearInterval(intervalRef.current);
          setPhase("done");
          return;
        }
        setTick(prev => {
          if (prev >= 29) {
            setBgIdx(i => (i + 1) % BG_GRADIENTS.length);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  const handleStart = () => {
    setPhase("active");
    setBgIdx(0);
    setTick(0);
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setPhase("intro");
    setBgIdx(0);
    setTick(0);
  };

  const currentBg = BG_GRADIENTS[bgIdx];

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏋️</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
            Let's Stretch!
          </h1>
          <p className="text-blue-200 text-lg mb-2">3 minutes · 6 stretches · Full body</p>
          <p className="text-slate-400 text-sm mb-8">Follow along with the video — background music plays automatically</p>

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
    <div className={`min-h-screen bg-gradient-to-br ${currentBg} flex flex-col text-white transition-all duration-[3000ms]`}>

      {/* Top bar */}
      <div className="px-6 pt-4 pb-3 flex items-center justify-between">
        <button onClick={handleReset} className="text-white/60 hover:text-white text-sm flex items-center gap-1">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <div />
        <div className="w-16" />
      </div>

      {/* Video — full width, centered */}
      <div className="flex-1 flex items-center justify-center px-6 pb-4">
        <div className="w-full max-w-4xl">
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src="https://www.youtube.com/embed/Aj6jyIEmZzs?start=30&autoplay=1&mute=1"
              title="Stretching video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="w-full aspect-video"
            />
          </div>
        </div>
      </div>

      {/* Bottom music player */}
      <div className="px-6 pb-4">
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl">
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/QEWV6fiYaDU?si=qEb2IommcvSXi2Rc&start=10"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="w-full aspect-video"
          />
        </div>
      </div>
    </div>
  );
}