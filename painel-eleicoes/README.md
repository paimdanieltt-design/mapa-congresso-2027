# Painel das Eleições 2026 — Volpatti Advogados Associados

Esqueleto de site estático (HTML/CSS/JS puro, sem build), no mesmo formato do Mapa do Congresso 2027.

- Abrir: `python3 -m http.server` dentro desta pasta e acessar http://localhost:8000 (ou abrir `index.html`).
- Abas: Panorama, Eleições presidenciais, Pesquisas eleitorais, Conjuntura política, Congresso Nacional, Governos estaduais, Informes Volpatti, Sobre.
- Dados: `data/dados.js` — **todos fictícios**. Os informes (`informes`) alimentam automaticamente cada aba pelo campo `aba`.
- Identidade visual: verde-floresta (`--verde`), tipografia serifada Cormorant Garamond, fundo verde-névoa, conforme o timbrado. O logo no menu é uma reprodução aproximada em SVG; trocar pelo arquivo original.
