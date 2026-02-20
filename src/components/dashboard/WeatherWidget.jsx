import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, CloudLightning, CloudDrizzle } from "lucide-react";

const WMO_CODES = {
  0: { label: "Clear", Icon: Sun },
  1: { label: "Mostly Clear", Icon: Sun },
  2: { label: "Partly Cloudy", Icon: Cloud },
  3: { label: "Overcast", Icon: Cloud },
  45: { label: "Foggy", Icon: Cloud },
  48: { label: "Foggy", Icon: Cloud },
  51: { label: "Drizzle", Icon: CloudDrizzle },
  53: { label: "Drizzle", Icon: CloudDrizzle },
  55: { label: "Drizzle", Icon: CloudDrizzle },
  61: { label: "Rain", Icon: CloudRain },
  63: { label: "Rain", Icon: CloudRain },
  65: { label: "Heavy Rain", Icon: CloudRain },
  71: { label: "Snow", Icon: CloudSnow },
  73: { label: "Snow", Icon: CloudSnow },
  75: { label: "Heavy Snow", Icon: CloudSnow },
  80: { label: "Showers", Icon: CloudRain },
  81: { label: "Showers", Icon: CloudRain },
  82: { label: "Heavy Showers", Icon: CloudRain },
  95: { label: "Thunderstorm", Icon: CloudLightning },
  99: { label: "Thunderstorm", Icon: CloudLightning },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { label: "Unknown", Icon: Cloud };
}

function cToF(c) {
  return Math.round(c * 9 / 5 + 32);
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // St. George, Utah coordinates
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=37.0965&longitude=-113.5684&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&temperature_unit=celsius&windspeed_unit=mph&timezone=America%2FDenver"
    )
      .then(r => r.json())
      .then(data => {
        setWeather(data.current);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
        <Cloud className="w-4 h-4" />
        <span>Loading weather...</span>
      </div>
    );
  }

  if (!weather) return null;

  const { label, Icon } = getWeatherInfo(weather.weathercode);
  const tempF = cToF(weather.temperature_2m);

  return (
    <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-2">
      <Icon className="w-6 h-6 text-amber-500" />
      <div>
        <p className="text-xl font-bold text-slate-800 leading-none">{tempF}°F</p>
        <p className="text-xs text-slate-500">{label} · St. George, UT</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 ml-2 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{Math.round(weather.windspeed_10m)} mph</span>
        <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{weather.relativehumidity_2m}%</span>
      </div>
    </div>
  );
}