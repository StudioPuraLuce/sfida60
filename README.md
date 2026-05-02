# Sfida 60 Giorni — Decompressione Cervello

Tracker + AI Coach personale. 2 Maggio – 30 Giugno.

## Deploy su Cloudflare Pages

### Prima volta
```bash
npm install
npx wrangler login   # apre browser per auth
bash deploy.sh
```

### Aggiornamenti
```bash
bash deploy.sh
```

L'app sarà live su: `https://sfida60.pages.dev`

## Stack
- Vite + React
- Cormorant Garamond / Cormorant SC / Lato (tipografia)
- Dark/Light theme (CSS variables)
- Claude API (AI Coach + Google Calendar MCP + Gmail MCP)
- localStorage per persistenza dati
