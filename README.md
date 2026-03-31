# AI Interview Simulator

Timed mock interviews for **DSA**, **HR/behavioral**, and **ML** with AI-generated questions and structured feedback (correctness, clarity, structure, roadmap).

## Quick start

```bash
npm install
cp .env.example .env.local
# Optional: set OPENAI_API_KEY for full AI; otherwise demo mode runs offline
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (production)

**Live (Vercel):** [https://ai-interview-simulator-blush.vercel.app](https://ai-interview-simulator-blush.vercel.app)

In [Vercel](https://vercel.com/) → your project → **Settings → Environment Variables**, add:

- `OPENAI_API_KEY` — optional; without it the app uses demo questions and demo scoring.

Redeploy after adding variables. GitHub repo is linked for automatic deployments on push.

```bash
npm run build && npm start
```

## Stack

- Next.js 15, React 19, Tailwind CSS 4
- OpenAI API (optional) with offline fallback

## License

MIT
