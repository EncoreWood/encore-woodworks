import React from "react";

// Generic error boundary. Wrap a subtree so an unhandled render error
// in one part of the tree shows a graceful fallback instead of a
// full white-screen crash of the entire app.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something went wrong" };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  reset = () => this.setState({ hasError: false, message: null });
  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.message, this.reset);
      }
      return (
        <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">This section couldn't load</p>
          <p className="text-xs text-red-500 mb-3">{this.state.message}</p>
          <button onClick={this.reset} className="text-xs font-medium text-red-600 hover:underline">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}