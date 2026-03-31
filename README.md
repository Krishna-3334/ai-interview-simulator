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

This is a [Next.js](https://nextjs.org/) app. Recommended: [Vercel](https://vercel.com/) — import the GitHub repo and set `OPENAI_API_KEY` in project environment variables.

```bash
npm run build && npm start
```

## Stack

- Next.js 15, React 19, Tailwind CSS 4
- OpenAI API (optional) with offline fallback

## License

MIT
