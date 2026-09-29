# Mamonas Assassinas - O Jogo

Versao web inspirada em [Fury of the Furries (1993)](https://youtu.be/Lp_pLw2Gr44), feita com HTML, CSS e JavaScript puro.

![Mamonas Assassinas - Hero Brand](https://raw.githubusercontent.com/heukirne/mamonas/refs/heads/main/hero-brand.png)

## Como jogar

1. No diretorio do projeto, rode:

```bash
python3 -m http.server 8000
```

2. Abra no navegador:

`http://localhost:8000` ou teste online: [https://henrique.gemeos.org/mamonas/](https://henrique.gemeos.org/mamonas/)

Tambem funciona abrindo `index.html`, mas servidor local e recomendado.

## Controles

- `Enter`: comecar (`C` continua da ultima fase alcancada)
- `A` / `D` ou setas: mover (o Tiny tem inercia e ricocheteia nas paredes)
- `W` / seta para cima / `Espaco`: pular (2 pulos)
- `J` / `Ctrl`: habilidade do Tiny atual
- `1-4`: troca direta de Tiny (`E` cicla entre os disponiveis)
- `Q`: mostrar/ocultar instrucoes
- `R`: reiniciar a fase

## Tinies e habilidades

Como no original, o Tiny se desfaz numa nuvem de pontos e se remonta com outra cor.

- `Amarelo (Fogo)`: bolas de fogo que quicam pelo chao (segure para carregar), queimam galhos secos (`B`) e ele atravessa chamas (`F`).
- `Azul (Agua)`: mergulha e nada em todas as direcoes, cospe bolhas. Os outros Tinies apenas boiam na superficie (e se afogam presos debaixo d'agua).
- `Vermelho (Terra)`: segure a habilidade para comer terra fofa (`D`) na frente; `baixo + habilidade` come o chao.
- `Verde (Ar)`: lanca uma corda que gruda nos ganchos (`H`) ou em qualquer teto; cima/baixo sobe e desce, `Espaco` solta com impulso. Tambem puxa caixas (`K`).

## Fases

1. `Deserto de Sklumph` (Amarelo e Vermelho)
2. `Lagoa Azul` (Amarelo, Azul e Verde)
3. `Floresta Sombria` (todos)
4. `Castelo Final` (todos)

## Objetivo

- Chegar a placa `EXIT` antes do tempo acabar
- Coletar moedas (100 = vida extra), frutas (pontos) e relogios (+30 s)
- Evitar inimigos (andarilhos, morcegos, peixes) e perigos (espinhos, chamas, acido, lava)
- Pular em cima de andarilhos e morcegos derrota eles

## Referencias usadas

- [Fury of the Furries - Wikipedia](https://en.wikipedia.org/wiki/Fury_of_the_Furries)
- [Super Adventures in Gaming - review](http://superadventuresingaming.blogspot.com/2011/07/fury-of-furries-amiga.html)
- [Lilura1 - analise do jogo](https://lilura1.blogspot.com/2023/04/Fury-of-the-Furries-Amiga-Kalisto-Atreid-Concept-1993.html)
- [Amiga Reviews - reviews da epoca](https://www.amigareviews.leveluphost.com/furyofth.htm)
- [Dazeland - Fury of the Furries](https://www.dazeland.com/en/Amiga/Fury_of_the_Furries.html)

## Estrutura do projeto

- `index.html`: layout e UI
- `style.css`: visual retro e responsividade
- `game.js`: logica do jogo (fisica, fases em ASCII, HUD, IA, formas)
- `assets/tiny_spritesheet.png`: sprite sheet dos personagens
- `tools/generate_spritesheet.py`: gerador do sprite sheet
- `ref/`: documentacao e imagens de referencia

## Gerar sprite sheet novamente

```bash
python3 tools/generate_spritesheet.py
```

O jogo detecta automaticamente o tamanho dos frames no PNG.

