import React from "react";
import ProductionCard from "./ProductionCard";

// One card that cannot draw (bad record, damaged field, a points read that fails)
// must never take its column — or the whole board — down with it. The failure is
// logged and that single card shows a plain fallback instead.
class CardBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Production card failed to render:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        <div className="truncate font-semibold">{this.props.name || "Production card"}</div>
        <div className="mt-0.5 opacity-80">
          This card couldn't be drawn — {String(this.state.error?.message || this.state.error)}
        </div>
      </div>
    );
  }
}

export default function SafeProductionCard(props) {
  return (
    <CardBoundary name={props.item?.name}>
      <ProductionCard {...props} />
    </CardBoundary>
  );
}