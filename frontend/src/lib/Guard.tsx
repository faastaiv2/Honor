import { Component, type ReactNode } from "react";

/** If a part of a page breaks, show what broke (so it can be fixed) instead of a blank screen. */
export default class Guard extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(`[${this.props.name}]`, error); }
  render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    return (
      <section className="card guard" role="alert">
        <h2>⚠️ “{this.props.name}” could not be shown</h2>
        <p className="note">Please send a screenshot of this box so it can be fixed.</p>
        <pre>{`${e.name}: ${e.message}\n${(e.stack ?? "").split("\n").slice(1, 5).join("\n")}`}</pre>
        <button onClick={() => this.setState({ error: null })}>Try again</button>
      </section>
    );
  }
}
