# AGENTS.md

Guia rapido para agentes que forem editar este projeto.

## Objetivo do projeto

Manter e evoluir uma versao web jogavel inspirada no Fury of the Furries, priorizando:

- jogabilidade fluida
- visual pixel-art retro
- codigo simples sem dependencias externas

## Regras tecnicas

- Nao adicionar frameworks sem necessidade.
- Preservar o funcionamento offline com arquivos estaticos.
- Manter compatibilidade com navegadores modernos sem build step.
- Usar ASCII nos arquivos fonte.

## Arquivos principais

- `game.js`: toda a logica de jogo.
- `index.html`: estrutura da pagina.
- `style.css`: estilos da interface.
- `assets/tiny_spritesheet.png`: sprite sheet dos personagens usado em runtime.
- `assets/elements.png`: atlas dos elementos do cenario (layout em `ELEMENT_LAYOUT` no `game.js`).
- `tools/generate_spritesheet.py`: script oficial para regenerar os dois PNGs.
- `tools/elements_art.py`: arte dos elementos (mantenha o layout igual ao de `game.js`).
- `ref/`: material de pesquisa e referencia visual/documental.

## Fluxo recomendado para mudancas

1. Ler rapidamente `README.md`.
2. Fazer alteracoes pequenas e incrementais.
3. Se mudar sprites, regenerar com:
   `sfw .venv/bin/pip install -r requirements.txt` (uma vez) e
   `.venv/bin/python tools/generate_spritesheet.py`
4. Validar JS com:
   `node --check game.js`
5. Testar jogando localmente:
   `python3 -m http.server 8000`

## Padrao de qualidade

- Nao quebrar controles existentes.
- Nao remover habilidades das 4 formas.
- Manter fallback visual em `game.js` caso o sprite sheet falhe.
- Evitar regressao no HUD (vidas, tempo, pontuacao, frutas).

## Quando alterar mapa/mecanicas

- As fases ficam no array `LEVELS` de `game.js`, desenhadas em ASCII (legenda no comentario acima do array).
- Abrir `index.html?debug` expoe `window.__tiny` para testes pelo console.
- Garantir que a fase continua finalizavel.
- Manter obstaculos que exigem cada forma (fogo/agua/terra/ar).
- Evitar soft-locks.

