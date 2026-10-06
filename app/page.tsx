"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolCallLog } from "@/lib/agent";
import type { Summary, TranscriptEntry } from "@/lib/summary";
import { ORDERS } from "@/lib/orders";
import "./home.css";

type CallState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "ENDED";
type RecognitionResultEvent = { resultIndex: number; results: SpeechRecognitionResultList };
type RecognitionErrorEvent = { error: string };
type BrowserRecognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: RecognitionResultEvent) => void) | null; onend: (() => void) | null; onerror: ((event: RecognitionErrorEvent) => void) | null };
type RecognitionConstructor = new () => BrowserRecognition;
const fallback = "Sorry, I'm having trouble right now. Could you say that again?";

export default function Home() {
  const [state, setState] = useState<CallState>("IDLE");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [supported, setSupported] = useState(true);
  const recognition = useRef<BrowserRecognition | null>(null);
  const stateRef = useRef(state);
  const messages = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const startedAt = useRef(0);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debugText = process.env.NEXT_PUBLIC_DEBUG_TEXT === "true";
  useEffect(() => { stateRef.current = state; }, [state]);
  const addEntry = useCallback((role: TranscriptEntry["role"], text: string) => setTranscript((items) => [...items, { role, text, timestamp: new Date().toISOString() }]), []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel(); setState("SPEAKING");
    const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === "en-in") ?? voices.find((item) => item.lang.toLowerCase() === "hi-in") ?? voices.find((item) => item.lang.toLowerCase().startsWith("en"));
    let remaining = parts.length;
    parts.forEach((part) => { const utterance = new SpeechSynthesisUtterance(part); utterance.rate = 1; if (voice) utterance.voice = voice; const done = () => { remaining -= 1; if (remaining === 0) onDone?.(); }; utterance.onend = done; utterance.onerror = done; window.speechSynthesis.speak(utterance); });
  }, []);
  const listen = useCallback(() => { if (stateRef.current === "ENDED" || stateRef.current === "IDLE") return; setState("LISTENING"); try { recognition.current?.start(); } catch { /* already started */ } }, []);
  const handleText = useCallback(async (text: string, lowConfidence = false) => {
    const clean = text.trim(); if (clean.length < 2) return; setInterim(""); setState("THINKING"); addEntry("customer", clean);
    messages.current.push({ role: "user", content: lowConfidence ? `[low confidence] ${clean}` : clean });
    try { const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: messages.current.slice(-20) }) }); if (!response.ok) throw new Error("chat failed"); const result = await response.json() as { reply: string; toolCalls: ToolCallLog[] }; messages.current.push({ role: "assistant", content: result.reply }); setToolCalls((items) => [...items, ...(result.toolCalls || [])]); addEntry("agent", result.reply); speak(result.reply, listen); } catch { setError("The support service is temporarily unavailable. Please try again."); addEntry("agent", fallback); speak(fallback, listen); }
  }, [addEntry, listen, speak]);
  const endCall = useCallback(async () => { stateRef.current = "ENDED"; setState("ENDED"); recognition.current?.stop(); window.speechSynthesis?.cancel(); if (restartTimer.current) clearTimeout(restartTimer.current); try { const response = await fetch("/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, toolCalls, duration_seconds: (Date.now() - startedAt.current) / 1000 }) }); setSummary(await response.json()); } catch { setError("The call ended, but the summary could not be loaded."); } }, [toolCalls, transcript]);
  const startCall = useCallback(() => { setError(""); setSummary(null); setTranscript([]); setToolCalls([]); messages.current = []; startedAt.current = Date.now(); stateRef.current = "SPEAKING"; setState("SPEAKING"); addEntry("agent", "Hello, I am Aria from Aura Skincare. How may I help you today?"); speak("Hello, I am Aria from Aura Skincare. How may I help you today?", () => { stateRef.current = "LISTENING"; listen(); }); }, [addEntry, listen, speak]);
  useEffect(() => { const browserWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }; const Constructor = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition; if (!Constructor) { setSupported(false); return; } const instance = new Constructor(); instance.lang = "en-IN"; instance.continuous = true; instance.interimResults = true; instance.onresult = (event) => { let finalText = ""; let interimText = ""; let confidence = 1; for (let index = event.resultIndex; index < event.results.length; index += 1) { const result = event.results[index]; if (result.isFinal) { finalText += result[0].transcript; confidence = result[0].confidence || confidence; } else interimText += result[0].transcript; } setInterim(interimText); if (finalText.trim().length >= 2) void handleText(finalText, confidence < 0.5); }; instance.onend = () => { if (stateRef.current === "LISTENING") restartTimer.current = setTimeout(() => listen(), 300); }; instance.onerror = (event) => { if (event.error === "not-allowed") setError("Microphone access is blocked. Allow the microphone for this site, then try again."); else if (event.error !== "no-speech") { setError("I could not hear that clearly. Please try again."); if (stateRef.current === "LISTENING") restartTimer.current = setTimeout(() => listen(), 500); } }; recognition.current = instance; return () => { instance.stop(); if (restartTimer.current) clearTimeout(restartTimer.current); }; }, [handleText, listen]);
  useEffect(() => { const synthesis = window.speechSynthesis; if (!synthesis) return; const refreshVoices = () => { synthesis.getVoices(); }; synthesis.addEventListener("voiceschanged", refreshVoices); refreshVoices(); return () => synthesis.removeEventListener("voiceschanged", refreshVoices); }, []);
  const copyJson = () => { if (summary) void navigator.clipboard?.writeText(JSON.stringify(summary, null, 2)); };
  return <main className="shell"><header><div><p className="eyebrow">AURA SKINCARE</p><h1>Aria support</h1><p className="subheading">Your concise, friendly skincare assistant.</p></div><span className={`state state-${state.toLowerCase()}`}>{state === "IDLE" ? "Ready" : state[0] + state.slice(1).toLowerCase()}</span></header>{!supported && <div className="notice">Voice input is not supported in this browser. Please use the latest Chrome or Edge.</div>}{error && <div className="notice error">{error}</div>}<section className="call-card"><div className="orb">A</div><p>{state === "LISTENING" ? "I’m listening…" : state === "THINKING" ? "Let me check that…" : state === "SPEAKING" ? "Aria is speaking…" : "Allow microphone, then try: ‘Where is ORD-101?’"}</p><div className="actions"><button className="primary" onClick={startCall} disabled={state !== "IDLE" && state !== "ENDED"}>Start Call</button><button className="secondary" onClick={endCall} disabled={state === "IDLE" || state === "ENDED"}>End Call</button></div>{interim && <p className="caption">{interim}</p>}</section>{debugText && <form className="debug" onSubmit={(event) => { event.preventDefault(); void handleText(typed); setTyped(""); }}><input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type a test message" disabled={state === "IDLE" || state === "ENDED"} /><button>Send</button></form>}<div className="grid"><section className="panel"><h2>Transcript</h2>{transcript.length === 0 ? <p className="empty">Your conversation will appear here.</p> : <div>{transcript.map((entry, index) => <div className={`line ${entry.role}`} key={`${entry.timestamp}-${index}`}><strong>{entry.role === "customer" ? "Customer" : "Aria"}</strong><span>{entry.text}</span><time>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>)}{toolCalls.map((tool, index) => <small className="tool" key={`${tool.order_id}-${index}`}>Looked up {tool.order_id || "order ID"} · {tool.found ? "found" : "not found"}</small>)}</div>}</section><section className="panel"><h2>Test Orders Helper</h2>{Object.values(ORDERS).map((order) => <div className="order" key={order.order_id}><button className="id" onClick={() => void navigator.clipboard?.writeText(order.order_id)}>{order.order_id}</button><span>{order.product} · {order.value}</span><small>{order.status} · {order.courier} · {order.tracking}{order.expected_delivery ? ` · by ${order.expected_delivery}` : order.deliveredDaysAgo ? ` · ${order.deliveredDaysAgo} days ago` : ""}</small></div>)}</section></div>{summary && <section className="panel summary"><div className="summary-title"><h2>Post-call summary</h2><button onClick={copyJson}>Copy JSON</button></div><pre>{JSON.stringify(summary, null, 2)}</pre></section>}</main>;
}
