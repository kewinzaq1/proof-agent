"use client";

import { FormEvent, useState } from "react";

export default function LoginClient() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const returnTo = new URLSearchParams(window.location.search).get("return_to") || "/experiment";
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password, returnTo }),
      });
      const responseText = await response.text();
      let result: { error?: string; returnTo?: string } = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText) as { error?: string; returnTo?: string };
        } catch {
          result = {};
        }
      }
      if (!response.ok) throw new Error(result.error || "Proof couldn’t sign you in.");
      window.location.assign(result.returnTo || "/experiment");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proof couldn’t sign you in.");
      setLoading(false);
    }
  }

  return <main className="login-app">
    <section className="login-story">
      <a className="brand" href="/"><span className="brand-mark">P</span><span>Proof</span></a>
      <div><div className="stage-kicker">YOUR PRIVATE THREAD</div><h1>Your life already has enough <em>passwords.</em></h1><p>So this is the only form. No OpenAI account, no social login, no personality quiz pretending to be science.</p></div>
      <blockquote>“Proof remembers the pattern.<br />Not just the prompt.”</blockquote>
    </section>
    <section className="login-panel">
      <div className="login-switch" aria-label="Choose sign in or account creation"><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button></div>
      <form onSubmit={submit}>
        <span className="login-count">{mode === "register" ? "HELLO" : "AGAIN"}</span>
        <h2>{mode === "register" ? <>Begin your <em>story.</em></> : <>Welcome <em>back.</em></>}</h2>
        <p>{mode === "register" ? "Create a private place for your check-ins and emerging patterns." : "Your previous learning is waiting where you left it."}</p>
        {mode === "register" && <label className="login-field"><span>What should Proof call you?</span><input name="name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your first name" required minLength={2} autoFocus /></label>}
        <label className="login-field"><span>Email</span><input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoFocus={mode === "login"} /></label>
        <label className="login-field"><span>Password</span><input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "At least 8 characters" : "Your password"} required minLength={8} /></label>
        {error && <div className="experiment-error" role="alert">{error}</div>}
        <button className="continue-button" type="submit" disabled={loading}>{loading ? "Checking the secret handshake…" : mode === "register" ? "Create my Proof account" : "Continue my story"}<span>→</span></button>
        <small>Private by default · No OpenAI account required</small>
      </form>
    </section>
  </main>;
}
