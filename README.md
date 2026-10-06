# Aria — Aura Skincare support

Aria is a browser-based AI voice customer support agent for the fictional D2C brand Aura Skincare.

Live demo: _to be deployed_

## Quick start

See [RUN_PROJECT.md](RUN_PROJECT.md) for Windows/PowerShell setup, environment variables, tests, manual voice checks, and Vercel notes.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set the three provider variables in `.env` with your provider's values, then start the app:

```powershell
npm run dev
```

The browser app runs at `http://localhost:3000`. The committed [.env.example](.env.example) contains placeholder values only; never commit `.env` or a real API key.

## Architecture

```text
Browser UI (Next.js client)
  ├─ Web Speech API (en-IN) ──> POST /api/chat ──> OpenAI-compatible LLM
  ├─ speechSynthesis <───────── concise reply    └─ get_order_details
  └─ POST /api/summary <──── transcript + tool log
                                      └─ deterministic fallback / validated JSON
```

Voice input is browser-native and final speech results are sent to the server. The server runs a short tool-calling loop against in-memory order data. Guardrails in the brand prompt constrain the model, while cancellation and return eligibility are computed in code from order status and delivery age. Speech is paused while Aria thinks or speaks, preventing self-hearing.

Known limitations: Chrome or Edge is required for reliable recognition, browser voice quality varies, and the call is half-duplex without barge-in.

## 9. Tell Us How You Think

I chose a Next.js + TypeScript architecture because the application is small enough to stay simple, while still benefiting from a clear separation between the browser experience and server-side LLM/tool logic.
The browser handles the voice interaction, conversation UI, transcript and call state, while the server handles the LLM request, tool calling and order data. I kept the order information deterministic instead of asking the model to generate it, because customer-facing information such as order status, tracking details and cancellation eligibility should come from a reliable source rather than an LLM guess.
I also chose an OpenAI-compatible LLM interface so the application is not tightly coupled to a single provider. This keeps the implementation simple today while making the provider easier to replace later.
The hardest part was making the conversation feel useful while keeping the agent within strict business rules.
For example, an LLM can naturally produce a helpful-sounding answer even when it should not make a decision itself. I solved this by separating conversational reasoning from deterministic business data and rules. Order details are retrieved through a tool, while policies and cancellation/return constraints are explicitly defined and reinforced in the agent instructions.
I also added graceful handling for invalid orders, unclear input and out-of-scope questions so that the agent can recover instead of confidently inventing an answer.
I would improve the voice experience first.
The current version demonstrates the complete interaction flow, but production-quality voice support would benefit from more reliable speech recognition, better interruption handling and lower perceived latency. I would also evaluate the experience using real conversations rather than only functional test cases, because small delays or awkward turn-taking can have a much bigger impact on customer experience than adding another feature.
I would prioritize this over adding more functionality because the core product is already capable of answering the main customer-support scenarios.
At that scale, I would first make the backend stateless and move order and customer data to a proper database/service rather than relying on mock data.
I would also add rate limiting, authentication where required, structured logging, monitoring, error tracking and provider-level retries/timeouts. LLM calls would need cost and latency monitoring, with safeguards against excessive tool calls and unnecessary context.
For 1,000 conversations a day, I would not immediately introduce a complicated distributed architecture. I would first measure the actual bottlenecks LLM latency, voice processing, database access and concurrent traffic and scale those parts based on real usage.
The important change would be moving from a demo-oriented system to an observable, reliable service while keeping the conversation and business rules predictable.
