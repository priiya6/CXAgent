# Run Aria locally

1. Install Node.js 20+ LTS, npm, Chrome or Edge, and a working microphone and speakers. Check PowerShell versions:

   ```powershell
   node -v
   npm -v
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create the environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `LLM_API_KEY` to your provider key. Keep `LLM_BASE_URL=https://api.openai.com/v1` and `LLM_MODEL=gpt-4o-mini` for OpenAI. For Groq, use `LLM_BASE_URL=https://api.groq.com/openai/v1` and a supported Groq model such as `llama-3.1-8b-instant`. The key is server-only and must never be committed.

   Enter the key directly into the local `.env` file (for example with `notepad .env`); do not paste it into source files, terminal output, chat, screenshots, or Git. A safe presence check is:

   ```powershell
   if ([string]::IsNullOrWhiteSpace((Get-Content .env | Where-Object { $_ -match '^LLM_API_KEY=' }))) { 'Add LLM_API_KEY' } else { 'LLM_API_KEY entry exists; value hidden' }
   ```

4. Start the app with `npm run dev`, then open http://localhost:3000.

5. Click Start Call, allow the microphone in Chrome or Edge, and try “Where is ORD-101?”. Aria listens, thinks, speaks, then listens again. Use headphones if speakers feed Aria’s voice back into the microphone.

6. Click End Call. Verify the chronological transcript and structured JSON summary, then try Copy JSON.

7. Use the Test Orders Helper IDs: ORD-101 is out for delivery, ORD-102 is delivered 14 days ago, and ORD-103 is Processing. Test tracking, cancellation, returns, shipping, damaged products, an invalid ID such as ORD-999, a missing ID, and an out-of-scope request.

8. Optional text-only pipeline testing is available when `NEXT_PUBLIC_DEBUG_TEXT=true` is set before starting the dev server.

9. Run deterministic tests with `npm test`. With the dev server active, run `npm run scenario`; it prints PASS/FAIL, or SKIPPED when `LLM_API_KEY` is missing. Scenario assertions validate required behavior with semantic term checks, and provider HTTP 429 responses are reported as NOT VERIFIED.

10. Verify a production build with `npm run build`, then `npm start`.

## Deploying to Vercel

Import the repository, set `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` in the Vercel project environment, and deploy. Microphone access requires HTTPS in production (localhost is also allowed).

## Troubleshooting

- Mic blocked: open browser site permissions, allow Microphone, reload, and start again.
- No speech detected: speak after the greeting, use Chrome/Edge, check the selected microphone, and use headphones.
- Unsupported browser: use current Chrome or Edge; Web Speech Recognition is not universal.
- No Indian voice installed: Aria falls back to Hindi and then any English voice; browser voice quality varies.
- 401 or invalid API key: check `.env`, provider base URL, model name, and restart the dev server.
- Port in use: stop the other process or run `npm run dev -- -p 3001`.
- CORS/HTTPS issues: use the Next.js server route; production voice requires HTTPS.
