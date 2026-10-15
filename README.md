# Mapa do Congresso 2027

Site estático (HTML/CSS/JS puro, sem build) com o resultado das eleições de 2026, perfis dos parlamentares, estatísticas e notícias.

## Rodar
`python3 -m http.server` na pasta e abrir http://localhost:8000 (ou abrir `index.html`).

## Dados
- `data/resultado.js`: cadeiras por partido (Senado 54 eleitos / Câmara 513). Números transcritos de uma captura de painel; **conferir com o TSE**.
- `data/dados.js`: perfis dos senadores. **Gerado** a partir da aba SENADO da planilha:
  ```
  pip install openpyxl pillow
  python3 scripts/xlsx_para_dados.py planilha.xlsx --fotos
  ```
  Só perfis com Status "Feito" exportam o conteúdo; os demais aparecem como "em produção". Responsável e Revisor não vão para o site.
  Fotos (links do Drive públicos) são baixadas para `assets/fotos/`. Links são limpos de rastreadores (utm, fbclid…).
- `data/noticias.js`: notícias (editar à mão; a aba Notícias gera o código).
- Em `app.js`, `SOMENTE_REVISADOS = true` publica apenas perfis com Revisão marcada; `false` publica todos os "Feito" e mostra o selo "Em revisão" nos não revisados.
- Perfis de deputados: ainda não existem.
