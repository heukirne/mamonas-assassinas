(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const statusEl = document.getElementById("status");
  const instructionsEl = document.getElementById("instructions");
  const footerEl = document.querySelector(".game-footer");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  // O mundo e desenhado numa tela de baixa resolucao e ampliado sem
  // suavizacao, como a imagem 320x200 do Amiga.
  const view = document.createElement("canvas");
  const wc = view.getContext("2d");

  const TILE = 32;
  const VIEW_ROWS = 14;
  const HUD_H = 58;

  const FORMS = ["yellow", "blue", "red", "green"];
  const FORM_COLORS = {
    yellow: "#f59a20",
    blue: "#3e97e7",
    red: "#e2584e",
    green: "#5ebc60",
  };
  const FORM_LIGHT = {
    yellow: "#ffc45a",
    blue: "#92d2ff",
    red: "#faa68a",
    green: "#aee5a1",
  };
  const FORM_NAMES = {
    yellow: "Fogo",
    blue: "Agua",
    red: "Terra",
    green: "Ar",
  };

  const SPRITE_STATES = [
    "idle1",
    "idle2",
    "run1",
    "run2",
    "run3",
    "run4",
    "jump",
    "fall",
    "attack1",
    "attack2",
    "ability1",
    "ability2",
  ];
  const SPRITE_INDEX = Object.fromEntries(
    SPRITE_STATES.map((state, index) => [state, index])
  );
  const SPRITE_ROWS = {
    yellow: 0,
    blue: 1,
    red: 2,
    green: 3,
    enemy: 4,
  };
  let spriteFrame = 64;
  const PLAYER_SPRITE_SIZE = 56;
  const PLAYER_SPRITE_OFFSET_X = -16;
  const PLAYER_SPRITE_OFFSET_Y = -22;
  const ENEMY_SPRITE_SIZE = 50;
  const ENEMY_SPRITE_OFFSET_X = -13;
  const ENEMY_SPRITE_OFFSET_Y = -17;
  const spriteSheet = new Image();
  let spriteReady = false;
  spriteSheet.addEventListener("load", () => {
    const detected = Math.floor(spriteSheet.width / SPRITE_STATES.length);
    if (detected > 0) {
      spriteFrame = detected;
    }
    spriteReady = true;
  });
  spriteSheet.addEventListener("error", () => {
    spriteReady = false;
  });
  spriteSheet.src = "assets/tiny_spritesheet.png";

  // Fisica: os Tinies tem inercia e ricocheteiam nas paredes.
  const GRAVITY = 1000;
  const MAX_FALL = 720;
  const RUN_SPEED = 190;
  const GROUND_ACCEL = 820;
  const TURN_ACCEL = 1500;
  const GROUND_FRICTION = 560;
  const AIR_ACCEL = 520;
  const AIR_FRICTION = 80;
  const WALL_BOUNCE = 0.45;
  const MAX_JUMPS = 2;
  const JUMP_SPEED = 420;
  const JUMP_BONUS = 70;
  const COYOTE_TIME = 0.08;
  const BUOYANCY = 2400;
  const DROWN_TIME = 2.5;
  const ROPE_RANGE = 320;
  const ROPE_MIN = 40;
  const AIR_SPIN_SPEED = Math.PI * 5.5;
  const TRANSFORM_TIME = 0.32;
  const EAT_TIME = 0.2;
  const START_LIVES = 6;
  const COINS_PER_LIFE = 100;
  const SAVE_KEY = "mamonas-tiny-progress";

  const LEFT_KEYS = ["ArrowLeft", "KeyA"];
  const RIGHT_KEYS = ["ArrowRight", "KeyD"];
  const JUMP_KEYS = ["ArrowUp", "KeyW", "Space"];
  const UP_KEYS = ["ArrowUp", "KeyW"];
  const DOWN_KEYS = ["ArrowDown", "KeyS"];
  const ABILITY_KEYS = ["KeyJ", "ControlLeft", "ControlRight"];
  const CONFIRM_KEYS = ["Enter", "NumpadEnter", "Space"];

  // Legenda dos mapas:
  // # chao/parede   D terra (vermelho come)   B galhos secos (amarelo queima)
  // K caixa         W agua                    S espinhos   A acido   L lava
  // F chamas (so o amarelo atravessa)         H gancho (verde)
  // o moeda   f fruta   T relogio   M andarilho   V morcego   X peixe
  // P inicio  E saida
  const LEVELS = [
    {
      name: "Deserto de Sklumph",
      theme: "desert",
      time: 200,
      forms: ["yellow", "red"],
      hint: "Amarelo queima galhos secos e atravessa chamas. Vermelho come areia fofa (baixo + habilidade).",
      map: [
        "#.........................#.......##########........................##.........................................#",
        "#.........................#.......##########........................##.........................................#",
        "#.........................#.......##########........................##.........................................#",
        "#.........................#.......##########........................##.........................................#",
        "#.........................#.......##########........................##.........................................#",
        "#.........................#.......##########........................##.........................................#",
        "#.........................#.......##########.................oooo...##.........................................#",
        "#.........................#.......##########..................f.....##.........................................#",
        "#.............f...........#.......##########.................####...##.........................................#",
        "#.........................#.......##########........................##.........................................#",
        "#...........oooo..........B.......##########..............T.........##........................ooooo............#",
        "#...........####..........B.......##########...ooo......####........##........................#####............#",
        "#....ooooo................B.oooo....oooooo..........................##........oooooo...........................#",
        "#.P..............M...K..#.B........FFFFFFFF..........M..............##..............SSS...M.....f.......E......#",
        "###############################################...##############DD#######...####################################",
        "###############################################SSS##############......DD...#####################################",
        "################################################################..oo..DDo..#####################################",
        "################################################################################################################",
      ],
    },
    {
      name: "Lagoa Azul",
      theme: "lagoon",
      time: 220,
      forms: ["yellow", "blue", "green"],
      hint: "Todos boiam, mas so o Azul mergulha. Verde lanca a corda nos ganchos sobre o acido.",
      map: [
        "#.......................................###............................................................................#",
        "#.......................................###............................................................................#",
        "#.......................................###............................................................................#",
        "#.......................................###............................................................................#",
        "#.......................................###............................................................................#",
        "#.......................................###.........................H.............H....................................#",
        "#.......................................###............................................................................#",
        "#....................f..................###........................................................V...................#",
        "#.......................................###...........................................................oooo.............#",
        "#...............oooooooooo..............###..........oooooo......ooooooo.......ooooooo................####.............#",
        "#...oooooo..............................###...............................f............................................#",
        "#.P.....................................###............M......................................M.............SSS...E....#",
        "##############WWWWWWWWWWWWWW####WWWWWWWW###WWWWWWW############............##............################################",
        "##############WWWWWWWWWWWWWW####WWWWWWWW###WWWWWWW############............##............################################",
        "##############WWWWWWWWWWWWWW####WWWWXWWW###WWWXWWW############............##............################################",
        "##############WWWWWWXWWWWWWW####WWoooooWWWWoooooWW############............##............################################",
        "##############WWWWWWWWWWWWWW####WWWWWWWWWTWWWWWWWW############AAAAAAAAAAAA##AAAAAAAAAAAA################################",
        "##############################################################AAAAAAAAAAAA##AAAAAAAAAAAA################################",
      ],
    },
    {
      name: "Floresta Sombria",
      theme: "forest",
      time: 240,
      forms: ["yellow", "blue", "red", "green"],
      hint: "O Verde prende a corda em qualquer teto. Cima/baixo sobe e desce na corda.",
      map: [
        "##########################################################################################################################",
        "##########################################################################################################################",
        "#..................DD...#####################...........###..............B...............................................#",
        "#..................DD...#####################...........###..............B...............................................#",
        "#..................DD...#####################...........###..............B...............................................#",
        "#..................DD...#####################...........###..............B...............................................#",
        "#..................DD...#####################...........###..............B................f..............................#",
        "#............V.....DD...................................###..............B...............oooo............................#",
        "#..................DD..............f....................###..............B....V..........####............................#",
        "#............ooo...DD...................................###..............B...............................................#",
        "#............###...DD........o.o.o.o.o.o................###..............B...............................................#",
        "#..................DD...................................###..............B..........####.................................#",
        "#....ooooo.........DD.ooo...............................###........oooo..B................................ooooo..........#",
        "#.P........K.....#.DD...........................M.......###..............B.......M...............SSS....M..........E.....#",
        "###########################................########WWWWW###WWWWWW#########################################################",
        "###########################................########WWWXWWWWWWXWWW#########################################################",
        "###########################SSSSSSSSSSSSSSSS########WooooWTWoooooW#########################################################",
        "##########################################################################################################################",
      ],
    },
    {
      name: "Castelo Final",
      theme: "castle",
      time: 300,
      forms: ["yellow", "blue", "red", "green"],
      hint: "Use as quatro formas para escapar do castelo.",
      map: [
        "######################################################################################################################################################",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............#...########........##......................H.............H................###...................B.........DD........................#",
        "#...............#...########...V....##.....................................................###................V..B.........DD.V......................#",
        "#...............#...########........##.....................................................###...................B.........DD........................#",
        "#...............B...########........##.....................................................###...................B.........DD.........oooo...........#",
        "#...............B...########........##...................ooooooo.......ooooooo.............###...................B.........DD.........####...........#",
        "#...ooooo.......B....oooooo.........##........ooooo...............T........................###.....f.............B..ooooo..DD........................#",
        "#.P.........M...B...FFFFFFFF........##........M............................................###............M......B.........DD..SSSSS....M......E.....#",
        "#################################DD######..###########............##............####WWWWWWW###WWWWWWWW################################################",
        "#################################......D...###########............##............####WWWXWWWWWWWWWXWWWW################################################",
        "#################################.oooooD...###########LLLLLLLLLLLL##LLLLLLLLLLLL####WooooooWWWoooooooW################################################",
        "######################################################LLLLLLLLLLLL##LLLLLLLLLLLL######################################################################",
      ],
    },
  ];

  const THEMES = {
    desert: {
      sky: ["#f28c3a", "#f8b85a", "#ffe6a6"],
      ground: "#c98a45",
      groundLight: "#e0a860",
      groundDark: "#9c6531",
      top: "#f3cf7a",
      topLight: "#fff0b5",
      soft: "#d9a25a",
      softDark: "#a8722f",
      spike: "#6b8f3a",
      status: "Deserto: cuidado com as chamas e os espinhos.",
    },
    lagoon: {
      sky: ["#4fa7e8", "#8fd0f5", "#e2f6ff"],
      ground: "#8a6a4a",
      groundLight: "#a88460",
      groundDark: "#654a31",
      top: "#57c24f",
      topLight: "#9be27c",
      soft: "#b08357",
      softDark: "#7d5632",
      spike: "#7c5c9e",
      status: "Lagoa: o Azul mergulha, os outros boiam.",
    },
    forest: {
      sky: ["#0f2a1c", "#1d4a2c", "#3c7a3f"],
      ground: "#5b4630",
      groundLight: "#735a3d",
      groundDark: "#3f2f1f",
      top: "#3f9a3a",
      topLight: "#79c95a",
      soft: "#7a5a36",
      softDark: "#553b20",
      spike: "#5a3b22",
      status: "Floresta: prenda a corda na copa das arvores.",
    },
    castle: {
      sky: ["#08103b", "#0a1647", "#132542"],
      ground: "#5d6273",
      groundLight: "#777d90",
      groundDark: "#3d4150",
      top: "#8a90a3",
      topLight: "#aab0c2",
      soft: "#7c6a5a",
      softDark: "#54463a",
      spike: "#c8ccd6",
      status: "Castelo: o ultimo desafio.",
    },
  };

  const keyState = Object.create(null);
  let prevKeyState = Object.create(null);

  const preventDefaults = new Set([
    ...LEFT_KEYS,
    ...RIGHT_KEYS,
    ...JUMP_KEYS,
    ...DOWN_KEYS,
    ...ABILITY_KEYS,
    "Enter",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "KeyQ",
    "KeyE",
    "KeyR",
    "KeyC",
  ]);

  window.addEventListener("keydown", (event) => {
    keyState[event.code] = true;
    if (preventDefaults.has(event.code)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    keyState[event.code] = false;
    if (preventDefaults.has(event.code)) {
      event.preventDefault();
    }
  });

  window.addEventListener("blur", () => {
    for (const code of Object.keys(keyState)) {
      keyState[code] = false;
    }
  });

  let starsNear = [];
  let starsFar = [];
  let instructionsVisible = false;
  let zoom = 2;
  let viewScale = 1;
  const viewSize = { w: 480, h: 448 };
  let playH = 480;

  const game = {
    state: "title",
    stateTimer: 0,
    levelIndex: 0,
    level: null,
    player: null,
    camera: { x: 0, y: 0 },
    projectiles: [],
    particles: [],
    score: 0,
    coins: 0,
    fruits: 0,
    lives: START_LIVES,
    timer: 0,
    timeBonus: 0,
    deathTimer: 0,
    crateTimer: 0,
    message: "",
    messageTimer: 0,
    snapshot: null,
    saved: loadProgress(),
  };

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      const value = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(value) ? clamp(value, 0, LEVELS.length - 1) : 0;
    } catch (err) {
      return 0;
    }
  }

  function saveProgress(index) {
    game.saved = Math.max(game.saved, index);
    try {
      window.localStorage.setItem(SAVE_KEY, String(game.saved));
    } catch (err) {
      // sem armazenamento: o progresso vale so para esta sessao
    }
  }

  function rebuildBackdropStars() {
    starsNear = Array.from({ length: 70 }, () => ({
      x: Math.random() * 1600,
      y: Math.random() * 300,
      size: 1 + Math.floor(Math.random() * 2),
      phase: Math.random() * Math.PI * 2,
    }));
    starsFar = Array.from({ length: 50 }, () => ({
      x: Math.random() * 1400,
      y: Math.random() * 260,
      size: 1,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function resizeCanvas() {
    const width = Math.max(1, Math.floor(window.innerWidth));
    const height = Math.max(1, Math.floor(window.innerHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const footerH = footerEl ? footerEl.offsetHeight : 0;
    playH = Math.max(120, canvas.height - footerH - HUD_H);
    zoom = Math.max(1, playH / (TILE * VIEW_ROWS));
    viewSize.w = Math.ceil(canvas.width / zoom);
    viewSize.h = Math.ceil(playH / zoom);
    // O mundo e desenhado em resolucao multiplicada: o cenario continua
    // retro, mas os personagens em alta resolucao ficam nitidos.
    viewScale = clamp(Math.ceil(zoom), 1, 3);
    const vw = viewSize.w * viewScale;
    const vh = viewSize.h * viewScale;
    if (view.width !== vw || view.height !== vh) {
      view.width = vw;
      view.height = vh;
    }
    wc.imageSmoothingEnabled = true;
    ctx.imageSmoothingEnabled = true;
  }

  function setInstructionsVisible(visible) {
    instructionsVisible = visible;
    if (!instructionsEl) {
      return;
    }
    instructionsEl.classList.toggle("hidden", !visible);
    instructionsEl.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function approach(value, target, amount) {
    if (value < target) {
      return Math.min(value + amount, target);
    }
    if (value > target) {
      return Math.max(value - amount, target);
    }
    return value;
  }

  function rectsIntersect(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function anyDown(keys) {
    return keys.some((k) => keyState[k]);
  }

  function anyPressed(keys) {
    return keys.some((k) => keyState[k] && !prevKeyState[k]);
  }

  function anyReleased(keys) {
    return keys.some((k) => !keyState[k] && prevKeyState[k]);
  }

  function showMessage(text, seconds = 2.6) {
    game.message = text;
    game.messageTimer = seconds;
  }

  // ---------------------------------------------------------------------
  // Fases
  // ---------------------------------------------------------------------

  function parseLevel(def) {
    const h = def.map.length;
    const w = Math.max(...def.map.map((row) => row.length));
    const tiles = def.map.map((row) => row.padEnd(w, ".").split(""));
    const pickups = [];
    const enemies = [];
    const hooks = [];
    let spawn = { x: 2 * TILE + 4, y: 2 * TILE };
    let exit = null;

    const raw = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? def.map[y][x] : "#");
    const backgroundFor = (x, y) =>
      [raw(x - 1, y), raw(x + 1, y), raw(x, y - 1), raw(x, y + 1)].some((t) => t === "W" || t === "X") ? "W" : ".";

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const t = tiles[y][x];
        const cx = x * TILE + TILE * 0.5;
        const cy = y * TILE + TILE * 0.5;
        if (t === "P") {
          spawn = { x: x * TILE + 4, y: (y + 1) * TILE - 24 };
          tiles[y][x] = ".";
        } else if (t === "o" || t === "f" || t === "T") {
          const kind = t === "o" ? "coin" : t === "f" ? "fruit" : "clock";
          const size = kind === "coin" ? 16 : 20;
          pickups.push({
            kind,
            x: cx - size * 0.5,
            y: cy - size * 0.5,
            w: size,
            h: size,
            collected: false,
            bob: Math.random() * Math.PI * 2,
          });
          tiles[y][x] = backgroundFor(x, y);
        } else if (t === "M") {
          enemies.push({
            type: "walker",
            x: x * TILE + 4,
            y: (y + 1) * TILE - 24,
            w: 24,
            h: 24,
            vx: 0,
            vy: 0,
            dir: x % 2 === 0 ? 1 : -1,
            onGround: false,
            alive: true,
            stun: 0,
          });
          tiles[y][x] = ".";
        } else if (t === "V") {
          enemies.push({
            type: "bat",
            x0: cx,
            y0: cy,
            x: cx - 12,
            y: cy - 9,
            w: 24,
            h: 18,
            t: Math.random() * 6,
            dir: 1,
            alive: true,
          });
          tiles[y][x] = ".";
        } else if (t === "X") {
          enemies.push({
            type: "fish",
            x: cx - 12,
            y: cy - 8,
            w: 24,
            h: 16,
            baseY: cy - 8,
            t: Math.random() * 6,
            dir: x % 2 === 0 ? 1 : -1,
            alive: true,
          });
          tiles[y][x] = "W";
        } else if (t === "H") {
          hooks.push({ x: cx, y: cy });
          tiles[y][x] = ".";
        } else if (t === "E") {
          exit = { tx: x, ty: y };
        }
      }
    }

    return {
      def,
      theme: THEMES[def.theme] || THEMES.castle,
      w,
      h,
      tiles,
      spawn,
      pickups,
      enemies,
      hooks,
      exit,
    };
  }

  function createPlayer(level, form) {
    return {
      x: level.spawn.x,
      y: level.spawn.y,
      w: 24,
      h: 24,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyote: 0,
      jumpCount: 0,
      form,
      invuln: 1.2,
      cooldown: 0,
      drown: 0,
      charge: 0,
      charging: false,
      hook: null,
      eat: null,
      pushTimer: 0,
      transform: 0,
      transformFrom: form,
      inWater: false,
      headInWater: false,
      actionTimer: 0,
      actionType: "none",
      airSpin: 0,
      airSpinActive: false,
      squash: 0,
      ropeFlash: null,
    };
  }

  function startLevel(index) {
    game.levelIndex = clamp(index, 0, LEVELS.length - 1);
    const def = LEVELS[game.levelIndex];
    game.level = parseLevel(def);
    game.player = createPlayer(game.level, def.forms[0]);
    game.projectiles = [];
    game.particles = [];
    game.timer = def.time;
    game.timeBonus = 0;
    game.deathTimer = 0;
    game.crateTimer = 0;
    game.message = "";
    game.messageTimer = 0;
    game.snapshot = { score: game.score, coins: game.coins, fruits: game.fruits };
    snapCamera();
    game.state = "intro";
    game.stateTimer = 0;
    saveProgress(game.levelIndex);
  }

  function restartLevel() {
    if (game.snapshot) {
      game.score = game.snapshot.score;
      game.coins = game.snapshot.coins;
      game.fruits = game.snapshot.fruits;
    }
    startLevel(game.levelIndex);
  }

  function newGame(index) {
    game.score = 0;
    game.coins = 0;
    game.fruits = 0;
    game.lives = START_LIVES;
    game.snapshot = null;
    startLevel(index);
  }

  function respawnPlayer() {
    const p = game.player;
    const form = p.form;
    const fresh = createPlayer(game.level, form);
    fresh.invuln = 1.75;
    fresh.transform = TRANSFORM_TIME;
    fresh.transformFrom = form;
    game.player = fresh;
    game.timer = game.level.def.time;
    snapCamera();
  }

  // ---------------------------------------------------------------------
  // Tiles e colisao
  // ---------------------------------------------------------------------

  function getTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= game.level.w || ty >= game.level.h) {
      return tx < 0 || tx >= game.level.w || ty < 0 ? "#" : ".";
    }
    return game.level.tiles[ty][tx];
  }

  function setTile(tx, ty, value) {
    if (tx < 0 || ty < 0 || tx >= game.level.w || ty >= game.level.h) {
      return;
    }
    game.level.tiles[ty][tx] = value;
  }

  function isSolidTile(tile) {
    return tile === "#" || tile === "D" || tile === "B" || tile === "K";
  }

  function isHazardFor(tile, form) {
    if (tile === "S" || tile === "A" || tile === "L") {
      return true;
    }
    return tile === "F" && form !== "yellow";
  }

  // Area letal dentro do tile (espinhos e chamas nao ocupam o tile todo).
  const HAZARD_INSETS = {
    S: { x: 4, y: 12, w: 24, h: 20 },
    F: { x: 3, y: 10, w: 26, h: 22 },
    A: { x: 0, y: 6, w: 32, h: 26 },
    L: { x: 0, y: 6, w: 32, h: 26 },
  };

  function touchedHazard(rect, form) {
    let found = null;
    rectTouchesTile(rect, (tile, tx, ty) => {
      if (!isHazardFor(tile, form)) {
        return false;
      }
      const inset = HAZARD_INSETS[tile];
      const area = { x: tx * TILE + inset.x, y: ty * TILE + inset.y, w: inset.w, h: inset.h };
      if (rectsIntersect(rect, area)) {
        found = tile;
        return true;
      }
      return false;
    });
    return found;
  }

  function rectTouchesTile(rect, matcher) {
    const startX = Math.floor(rect.x / TILE);
    const endX = Math.floor((rect.x + rect.w - 1) / TILE);
    const startY = Math.floor(rect.y / TILE);
    const endY = Math.floor((rect.y + rect.h - 1) / TILE);
    for (let ty = startY; ty <= endY; ty += 1) {
      for (let tx = startX; tx <= endX; tx += 1) {
        if (matcher(getTile(tx, ty), tx, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  function rectHitsSolid(rect) {
    return rectTouchesTile(rect, (tile) => isSolidTile(tile));
  }

  // Move no eixo X e devolve o tile que bloqueou (ou null).
  function moveHorizontal(body, dt) {
    body.x += body.vx * dt;
    const startY = Math.floor(body.y / TILE);
    const endY = Math.floor((body.y + body.h - 1) / TILE);

    // Sondas no pixel vizinho: encostar numa parede tambem conta como colisao.
    if (body.vx > 0) {
      const tileX = Math.floor((body.x + body.w) / TILE);
      for (let ty = startY; ty <= endY; ty += 1) {
        const tile = getTile(tileX, ty);
        if (isSolidTile(tile)) {
          body.x = tileX * TILE - body.w;
          return { tx: tileX, ty, tile, dir: 1 };
        }
      }
    } else if (body.vx < 0) {
      const tileX = Math.floor((body.x - 0.01) / TILE);
      for (let ty = startY; ty <= endY; ty += 1) {
        const tile = getTile(tileX, ty);
        if (isSolidTile(tile)) {
          body.x = (tileX + 1) * TILE;
          return { tx: tileX, ty, tile, dir: -1 };
        }
      }
    }
    return null;
  }

  function moveVertical(body, dt) {
    body.onGround = false;
    body.y += body.vy * dt;
    const startX = Math.floor(body.x / TILE);
    const endX = Math.floor((body.x + body.w - 1) / TILE);

    if (body.vy >= 0) {
      // Sonda o pixel logo abaixo dos pes para ficar apoiado sem tremer.
      const tileY = Math.floor((body.y + body.h) / TILE);
      for (let tx = startX; tx <= endX; tx += 1) {
        if (isSolidTile(getTile(tx, tileY))) {
          body.y = tileY * TILE - body.h;
          body.vy = 0;
          body.onGround = true;
          return true;
        }
      }
    } else if (body.vy < 0) {
      const tileY = Math.floor(body.y / TILE);
      for (let tx = startX; tx <= endX; tx += 1) {
        if (isSolidTile(getTile(tx, tileY))) {
          body.y = (tileY + 1) * TILE;
          body.vy = 0;
          return true;
        }
      }
    }
    return false;
  }

  // Fracao do corpo submersa (0..1) e se a cabeca esta dentro da agua.
  function waterInfo(body) {
    const cx = Math.floor((body.x + body.w * 0.5) / TILE);
    const startY = Math.floor(body.y / TILE);
    const endY = Math.floor((body.y + body.h - 1) / TILE);
    let covered = 0;
    for (let ty = startY; ty <= endY; ty += 1) {
      if (getTile(cx, ty) === "W") {
        const top = Math.max(body.y, ty * TILE);
        const bottom = Math.min(body.y + body.h, (ty + 1) * TILE);
        covered += Math.max(0, bottom - top);
      }
    }
    const head = getTile(cx, Math.floor((body.y + 3) / TILE)) === "W";
    return { frac: covered / body.h, head };
  }

  // ---------------------------------------------------------------------
  // Entrada
  // ---------------------------------------------------------------------

  function getMoveAxis() {
    let axis = 0;
    if (anyDown(LEFT_KEYS)) {
      axis -= 1;
    }
    if (anyDown(RIGHT_KEYS)) {
      axis += 1;
    }
    return axis;
  }

  function getVerticalAxis() {
    let axis = 0;
    if (anyDown(UP_KEYS)) {
      axis -= 1;
    }
    if (anyDown(DOWN_KEYS)) {
      axis += 1;
    }
    return axis;
  }

  // ---------------------------------------------------------------------
  // Vidas, pontos e formas
  // ---------------------------------------------------------------------

  function burst(x, y, color, count, speed, life = 0.6, gravity = 300) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      game.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        color,
        size: 2 + Math.floor(Math.random() * 2),
        gravity,
      });
    }
  }

  function loseLife(reason) {
    const p = game.player;
    if (p.invuln > 0 || game.state !== "playing" || game.deathTimer > 0) {
      return;
    }
    game.lives -= 1;
    game.projectiles.length = 0;
    // O Tiny estoura numa nuvem de pelos, como no original.
    burst(p.x + p.w * 0.5, p.y + p.h * 0.5, FORM_COLORS[p.form], 34, 260, 0.9, 420);
    burst(p.x + p.w * 0.5, p.y + p.h * 0.5, "#ffffff", 8, 160, 0.5, 200);
    p.hook = null;
    game.deathTimer = 1.1;
    showMessage(`Voce perdeu uma vida (${reason}).`);
  }

  function finishDeath() {
    if (game.lives <= 0) {
      game.lives = 0;
      game.state = "gameover";
      game.stateTimer = 0;
      return;
    }
    respawnPlayer();
  }

  function addLife() {
    game.lives += 1;
    showMessage("Vida extra!");
  }

  function collectPickup(item) {
    item.collected = true;
    const cx = item.x + item.w * 0.5;
    const cy = item.y + item.h * 0.5;
    if (item.kind === "coin") {
      game.coins += 1;
      game.score += 10;
      burst(cx, cy, "#ffe36b", 5, 90, 0.3, 0);
      if (game.coins % COINS_PER_LIFE === 0) {
        addLife();
      }
    } else if (item.kind === "fruit") {
      game.fruits += 1;
      game.score += 250;
      game.timer += 5;
      burst(cx, cy, "#ff9a4a", 10, 120, 0.4, 0);
      showMessage("Fruta! +250 pontos e +5s", 1.6);
    } else {
      game.timer += 30;
      burst(cx, cy, "#ffffff", 12, 120, 0.4, 0);
      showMessage("Relogio! +30 segundos", 1.6);
    }
  }

  function formAvailable(form) {
    return game.level.def.forms.includes(form);
  }

  function switchForm(newForm) {
    const p = game.player;
    if (p.form === newForm || game.state !== "playing" || game.deathTimer > 0) {
      return;
    }
    if (!formAvailable(newForm)) {
      showMessage(`O Tiny ${FORM_NAMES[newForm]} nao esta disponivel nesta fase.`, 1.8);
      return;
    }
    if (p.hook) {
      releaseHook();
    }
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;
    // Explode numa nuvem de pontos e se remonta com a nova cor.
    burst(cx, cy, FORM_COLORS[p.form], 22, 150, 0.3, 0);
    p.transformFrom = p.form;
    p.form = newForm;
    p.transform = TRANSFORM_TIME;
    p.charge = 0;
    p.charging = false;
    p.eat = null;
    p.actionTimer = 0;
    p.actionType = "none";
  }

  function cycleForm(dir) {
    const forms = game.level.def.forms;
    const idx = forms.indexOf(game.player.form);
    const next = (idx + dir + forms.length) % forms.length;
    switchForm(forms[next]);
  }

  function handleFormInput() {
    if (anyPressed(["Digit1"])) switchForm("yellow");
    if (anyPressed(["Digit2"])) switchForm("blue");
    if (anyPressed(["Digit3"])) switchForm("red");
    if (anyPressed(["Digit4"])) switchForm("green");
    if (anyPressed(["KeyE"])) cycleForm(1);
  }

  // ---------------------------------------------------------------------
  // Habilidades
  // ---------------------------------------------------------------------

  function shootProjectile(type, power) {
    const p = game.player;
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;

    if (type === "fire") {
      const speed = 250 + power * 200;
      game.projectiles.push({
        x: cx + p.facing * 12,
        y: cy,
        vx: speed * p.facing,
        vy: -120,
        r: 5 + power * 4,
        life: 1.6 + power,
        type,
      });
    } else {
      game.projectiles.push({
        x: cx + p.facing * 12,
        y: cy - 2,
        vx: p.facing * 210,
        vy: 0,
        r: 6,
        life: 1.3,
        t: 0,
        type,
      });
    }
  }

  function findEatTarget() {
    const p = game.player;
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;
    const candidates = [];
    if (anyDown(DOWN_KEYS)) {
      const below = Math.floor((p.y + p.h + 2) / TILE);
      candidates.push([Math.floor(cx / TILE), below]);
      candidates.push([Math.floor((p.x + 2) / TILE), below]);
      candidates.push([Math.floor((p.x + p.w - 2) / TILE), below]);
    } else {
      candidates.push([Math.floor((cx + p.facing * (p.w * 0.5 + 6)) / TILE), Math.floor(cy / TILE)]);
      candidates.push([Math.floor((cx + p.facing * (p.w * 0.5 + 6)) / TILE), Math.floor((p.y + p.h - 3) / TILE)]);
    }
    for (const [tx, ty] of candidates) {
      if (getTile(tx, ty) === "D") {
        return { tx, ty };
      }
    }
    return null;
  }

  function updateEating(dt) {
    const p = game.player;
    if (!p.eat) {
      return;
    }
    p.eat.t += dt;
    p.vx *= 0.8;
    p.actionType = "ability";
    p.actionTimer = 0.1;
    if (Math.random() < dt * 30) {
      burst((p.eat.tx + 0.5) * TILE, (p.eat.ty + 0.5) * TILE, game.level.theme.soft, 1, 90, 0.35, 500);
    }
    if (p.eat.t >= EAT_TIME) {
      if (getTile(p.eat.tx, p.eat.ty) === "D") {
        setTile(p.eat.tx, p.eat.ty, ".");
        if (p.eat.ty * TILE >= p.y + p.h) {
          // Comeu o chao: centraliza no buraco para cair por ele.
          const holeX = p.eat.tx * TILE + (TILE - p.w) * 0.5;
          if (!rectHitsSolid({ x: holeX, y: p.y, w: p.w, h: p.h })) {
            p.x = holeX;
            p.vx = 0;
          }
        }
        game.score += 50;
        burst((p.eat.tx + 0.5) * TILE, (p.eat.ty + 0.5) * TILE, game.level.theme.softDark, 10, 140, 0.5, 600);
      }
      p.eat = null;
    }
  }

  function canSee(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const steps = Math.max(1, Math.floor(Math.hypot(dx, dy) / 8));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (isSolidTile(getTile(Math.floor((fromX + dx * t) / TILE), Math.floor((fromY + dy * t) / TILE)))) {
        return false;
      }
    }
    return true;
  }

  function tryMoveCrate(tx, ty, dir) {
    const nx = tx + dir;
    if (getTile(tx, ty) !== "K" || getTile(nx, ty) !== ".") {
      return false;
    }
    const target = { x: nx * TILE, y: ty * TILE, w: TILE, h: TILE };
    if (rectsIntersect(target, game.player)) {
      return false;
    }
    for (const enemy of game.level.enemies) {
      if (enemy.alive && rectsIntersect(target, enemy)) {
        return false;
      }
    }
    setTile(tx, ty, ".");
    setTile(nx, ty, "K");
    return true;
  }

  function tryPullCrate() {
    const p = game.player;
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;
    const ty = Math.floor(cy / TILE);
    let tx = Math.floor(cx / TILE);
    for (let i = 0; i < 7; i += 1) {
      tx += p.facing;
      const tile = getTile(tx, ty);
      if (tile === "K") {
        const pulled = tryMoveCrate(tx, ty, -p.facing);
        p.ropeFlash = { x: (tx + 0.5) * TILE, y: cy, t: 0.18 };
        if (pulled) {
          showMessage("Caixa puxada com a corda.", 1.2);
        }
        return true;
      }
      if (isSolidTile(tile)) {
        return false;
      }
    }
    return false;
  }

  function attachRope(ax, ay) {
    const p = game.player;
    const length = Math.hypot(p.x + p.w * 0.5 - ax, p.y + p.h * 0.5 - ay);
    // A corda fica frouxa ate esticar: da para correr e pular preso nela.
    p.hook = { x: ax, y: ay, length: Math.max(ROPE_MIN, length) };
    p.airSpinActive = false;
  }

  function fireRope() {
    const p = game.player;
    const px = p.x + p.w * 0.5;
    const py = p.y + p.h * 0.5;

    if (!anyDown(UP_KEYS) && tryPullCrate()) {
      return;
    }

    let best = null;
    let bestScore = Infinity;
    for (const hook of game.level.hooks) {
      const dx = hook.x - px;
      const dy = hook.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > ROPE_RANGE || dy > -8 || !canSee(px, py, hook.x, hook.y)) {
        continue;
      }
      const score = dist - (dx * p.facing > 0 ? 90 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = hook;
      }
    }
    if (best) {
      attachRope(best.x, best.y);
      return;
    }

    // Sem gancho por perto: a corda gruda em qualquer teto ou parede.
    const angle = anyDown(UP_KEYS) ? Math.PI * 0.5 : Math.PI / 3;
    const dirX = Math.cos(angle) * p.facing;
    const dirY = -Math.sin(angle);
    for (let d = 12; d <= ROPE_RANGE; d += 4) {
      const x = px + dirX * d;
      const y = py + dirY * d;
      const tile = getTile(Math.floor(x / TILE), Math.floor(y / TILE));
      if (isSolidTile(tile)) {
        if (y < 0) {
          break;
        }
        attachRope(px + dirX * (d - 2), py + dirY * (d - 2));
        return;
      }
    }
    p.ropeFlash = { x: px + dirX * ROPE_RANGE * 0.5, y: py + dirY * ROPE_RANGE * 0.5, t: 0.15 };
  }

  function releaseHook() {
    const p = game.player;
    if (!p.hook) {
      return;
    }
    p.hook = null;
    p.jumpCount = Math.min(p.jumpCount, 1);
    p.coyote = 0;
  }

  // Mantem o Tiny dentro do comprimento da corda (vira um pendulo).
  function applyRopeConstraint(dt) {
    const p = game.player;
    const hook = p.hook;
    const dx = p.x + p.w * 0.5 - hook.x;
    const dy = p.y + p.h * 0.5 - hook.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= hook.length || dist === 0) {
      return;
    }
    const k = hook.length / dist;
    const targetX = hook.x + dx * k - p.w * 0.5;
    const targetY = hook.y + dy * k - p.h * 0.5;
    const vx = p.vx;
    const vy = p.vy;
    p.vx = (targetX - p.x) / dt;
    moveHorizontal(p, dt);
    p.vy = (targetY - p.y) / dt;
    moveVertical(p, dt);
    p.vx = vx;
    p.vy = vy;
    const nx = dx / dist;
    const ny = dy / dist;
    const radial = p.vx * nx + p.vy * ny;
    if (radial > 0) {
      p.vx -= radial * nx;
      p.vy -= radial * ny;
    }
  }

  function updateRopeClimb(dt) {
    const hook = game.player.hook;
    const climb = getVerticalAxis();
    if (climb !== 0) {
      hook.length = clamp(hook.length + climb * 150 * dt, ROPE_MIN, ROPE_RANGE + 40);
    }
  }

  function handleAbilities(dt) {
    const p = game.player;
    if (p.transform > 0) {
      return;
    }
    const abilityDown = anyDown(ABILITY_KEYS);

    if (p.form === "yellow") {
      if (anyPressed(ABILITY_KEYS)) {
        p.charging = true;
        p.charge = 0;
      }
      if (p.charging && abilityDown) {
        p.charge = Math.min(1.2, p.charge + dt);
      }
      if (p.charging && !abilityDown && p.cooldown <= 0) {
        shootProjectile("fire", p.charge);
        p.charging = false;
        p.charge = 0;
        p.cooldown = 0.14;
        p.actionType = "attack";
        p.actionTimer = 0.18;
      }
      return;
    }

    p.charging = false;
    p.charge = 0;

    if (p.form === "red") {
      if (abilityDown && !p.eat) {
        const target = findEatTarget();
        if (target) {
          p.eat = { tx: target.tx, ty: target.ty, t: 0 };
        }
      }
      if (!abilityDown) {
        p.eat = null;
      }
      updateEating(dt);
      return;
    }

    if (anyPressed(ABILITY_KEYS) && p.cooldown <= 0) {
      if (p.form === "blue") {
        shootProjectile("bubble", 0);
        p.cooldown = 0.22;
      } else if (p.form === "green") {
        if (p.hook) {
          releaseHook();
        } else {
          fireRope();
        }
        p.cooldown = 0.12;
      }
      p.actionType = "ability";
      p.actionTimer = 0.22;
    }
  }

  // ---------------------------------------------------------------------
  // Atualizacao do jogador
  // ---------------------------------------------------------------------

  function updatePlayer(dt) {
    const p = game.player;

    p.invuln = Math.max(0, p.invuln - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.transform = Math.max(0, p.transform - dt);
    p.actionTimer = Math.max(0, p.actionTimer - dt);
    p.squash = Math.max(0, p.squash - dt);
    if (p.ropeFlash) {
      p.ropeFlash.t -= dt;
      if (p.ropeFlash.t <= 0) {
        p.ropeFlash = null;
      }
    }

    const moveAxis = getMoveAxis();
    if (moveAxis !== 0 && !p.eat) {
      p.facing = moveAxis;
    }

    handleAbilities(dt);

    const water = waterInfo(p);
    const inWater = water.frac > 0;
    p.inWater = inWater;
    p.headInWater = water.head;

    if (inWater && p.form !== "blue" && water.head) {
      p.drown += dt;
    } else {
      p.drown = Math.max(0, p.drown - dt * 2.2);
    }
    if (p.drown > DROWN_TIME) {
      loseLife("afogou");
      return;
    }

    const wasOnGround = p.onGround;
    const eating = Boolean(p.eat);
    const axis = eating ? 0 : moveAxis;
    const swinging = Boolean(p.hook) && !p.onGround && !inWater;

    if (p.hook) {
      updateRopeClimb(dt);
    }

    if (inWater && p.form === "blue") {
      // O Tiny azul nada livremente em todas as direcoes.
      p.vx = approach(p.vx, axis * 160, 700 * dt);
      const vAxis = getVerticalAxis();
      p.vy = approach(p.vy, vAxis * 160 + (vAxis === 0 ? 20 : 0), 800 * dt);
    } else if (inWater) {
      // Os outros boiam na superficie.
      p.vx = approach(p.vx, axis * 110, 500 * dt);
      p.vy += (GRAVITY - BUOYANCY * water.frac) * dt;
      p.vy -= p.vy * 3.5 * dt;
    } else if (swinging) {
      // Pendurado: esquerda/direita dao impulso no balanco.
      p.vx += axis * 420 * dt;
      p.vy += GRAVITY * dt;
    } else {
      const turning = axis !== 0 && Math.sign(p.vx) === -axis;
      if (axis !== 0) {
        const accel = p.onGround ? (turning ? TURN_ACCEL : GROUND_ACCEL) : AIR_ACCEL;
        p.vx = approach(p.vx, axis * RUN_SPEED, accel * dt);
      } else {
        p.vx = approach(p.vx, 0, (p.onGround ? GROUND_FRICTION : AIR_FRICTION) * dt);
      }
      p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    }

    if (p.onGround) {
      p.coyote = COYOTE_TIME;
      p.jumpCount = 0;
    } else {
      p.coyote = Math.max(0, p.coyote - dt);
      if (p.coyote <= 0 && p.jumpCount === 0 && !inWater) {
        p.jumpCount = 1;
      }
    }

    // Na corda so o Espaco pula (cima/baixo sobem e descem).
    const jumpPressed = p.hook ? anyPressed(["Space"]) : anyPressed(JUMP_KEYS);
    if (jumpPressed && !eating) {
      // Soltar a corda pulando aproveita o embalo do balanco.
      const ropeMomentum = p.hook && !p.onGround ? Math.min(p.vy, 0) : 0;
      if (p.hook) {
        releaseHook();
      }
      const fromSurface = inWater && !water.head;
      const grounded = p.onGround || p.coyote > 0 || fromSurface;
      if (grounded) {
        p.jumpCount = 0;
      }
      if ((grounded || p.jumpCount < MAX_JUMPS) && !(inWater && water.head)) {
        p.vy = Math.max(ropeMomentum - (JUMP_SPEED + p.jumpCount * JUMP_BONUS), -MAX_FALL);
        p.onGround = false;
        p.coyote = 0;
        p.jumpCount += 1;
        p.airSpinActive = true;
        if (fromSurface) {
          burst(p.x + p.w * 0.5, p.y + p.h, "#bfe8ff", 8, 110, 0.4, 500);
        }
      }
    }

    const prevVx = p.vx;
    const prevVy = p.vy;
    const hit = moveHorizontal(p, dt);
    if (hit) {
      if (hit.tile === "K" && p.onGround && moveAxis === hit.dir) {
        p.pushTimer += dt;
        if (p.pushTimer > 0.2) {
          p.pushTimer = 0;
          tryMoveCrate(hit.tx, hit.ty, hit.dir);
        }
        p.vx = 0;
      } else if (Math.abs(prevVx) > 140) {
        // Ricochete: os Tinies quicam nas paredes.
        p.vx = -prevVx * WALL_BOUNCE;
        burst(p.x + (hit.dir > 0 ? p.w : 0), p.y + p.h * 0.5, "#ffffff", 4, 80, 0.25, 0);
      } else {
        p.vx = 0;
      }
    } else {
      p.pushTimer = 0;
    }
    moveVertical(p, dt);
    if (p.hook) {
      applyRopeConstraint(dt);
    }
    if (p.onGround && !wasOnGround && prevVy > 320) {
      p.squash = 0.14;
    }

    if (p.airSpinActive && !p.onGround && !p.inWater && !p.hook) {
      const spinDir = p.facing < 0 ? -1 : 1;
      p.airSpin += spinDir * AIR_SPIN_SPEED * dt;
      if (p.airSpin > Math.PI) {
        p.airSpin -= Math.PI * 2;
      } else if (p.airSpin < -Math.PI) {
        p.airSpin += Math.PI * 2;
      }
    } else {
      p.airSpin = 0;
      if (p.onGround || p.inWater || p.hook) {
        p.airSpinActive = false;
      }
    }

    const hurtBox = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 4 };
    const hazard = touchedHazard(hurtBox, p.form);
    if (hazard) {
      const reasons = { S: "espinhos", F: "queimou", A: "caiu no acido", L: "caiu na lava" };
      loseLife(reasons[hazard]);
      return;
    }

    if (p.y > game.level.h * TILE + 32) {
      loseLife("caiu no vazio");
      return;
    }

    const exit = game.level.exit;
    const exitZone = exit ? { x: exit.tx * TILE + 2, y: (exit.ty - 3) * TILE, w: TILE - 4, h: TILE * 4 } : null;
    if (exitZone && rectsIntersect(p, exitZone)) {
      completeLevel();
    }
  }

  function completeLevel() {
    game.timeBonus = Math.ceil(Math.max(0, game.timer)) * 10;
    game.score += game.timeBonus;
    game.state = "clear";
    game.stateTimer = 0;
    burst(game.player.x + 12, game.player.y + 12, "#fff3a0", 30, 220, 0.8, 100);
    if (game.levelIndex + 1 < LEVELS.length) {
      saveProgress(game.levelIndex + 1);
    }
  }

  // ---------------------------------------------------------------------
  // Projeteis, inimigos, caixas e itens
  // ---------------------------------------------------------------------

  function hitEnemy(enemy, points) {
    enemy.alive = false;
    game.score += points;
    burst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, "#c58cff", 14, 170, 0.5, 300);
  }

  function updateProjectiles(dt) {
    for (let i = game.projectiles.length - 1; i >= 0; i -= 1) {
      const p = game.projectiles[i];
      p.life -= dt;
      let remove = p.life <= 0;

      if (p.type === "fire") {
        // Bola de fogo quica pelo chao.
        p.vy = Math.min(600, p.vy + 900 * dt);
        const nx = p.x + p.vx * dt;
        const sideTile = getTile(Math.floor((nx + Math.sign(p.vx) * p.r) / TILE), Math.floor(p.y / TILE));
        const stx = Math.floor((nx + Math.sign(p.vx) * p.r) / TILE);
        const sty = Math.floor(p.y / TILE);
        if (sideTile === "B") {
          setTile(stx, sty, ".");
          game.score += 80;
          burst((stx + 0.5) * TILE, (sty + 0.5) * TILE, "#ff8a2a", 16, 160, 0.6, -60);
          remove = true;
        } else if (isSolidTile(sideTile)) {
          burst(p.x, p.y, "#ffb13b", 5, 90, 0.25, 0);
          remove = true;
        } else {
          p.x = nx;
        }
        const ny = p.y + p.vy * dt;
        const vtx = Math.floor(p.x / TILE);
        const vty = Math.floor((ny + Math.sign(p.vy) * p.r) / TILE);
        const vTile = getTile(vtx, vty);
        if (vTile === "B") {
          setTile(vtx, vty, ".");
          game.score += 80;
          burst((vtx + 0.5) * TILE, (vty + 0.5) * TILE, "#ff8a2a", 16, 160, 0.6, -60);
          remove = true;
        } else if (isSolidTile(vTile)) {
          p.vy = p.vy > 0 ? -200 : 60;
        } else {
          p.y = ny;
        }
        if (getTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === "W") {
          burst(p.x, p.y, "#dddddd", 8, 70, 0.5, -120);
          remove = true;
        }
      } else {
        // Bolhas seguem reto, oscilando, e sobem fora da agua.
        p.t += dt;
        const inWater = getTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === "W";
        p.vy = inWater ? Math.sin(p.t * 10) * 30 : p.vy - 160 * dt;
        p.vx *= inWater ? 1 : 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (isSolidTile(getTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE)))) {
          remove = true;
        }
      }

      if (!remove) {
        const reach = p.r + 3;
        const hitBox = { x: p.x - reach, y: p.y - reach, w: reach * 2, h: reach * 2 };
        for (const enemy of game.level.enemies) {
          if (!enemy.alive || !rectsIntersect(hitBox, enemy)) {
            continue;
          }
          if (p.type === "fire" && enemy.type === "fish") {
            continue;
          }
          hitEnemy(enemy, p.type === "fire" ? 220 : 150);
          remove = true;
          break;
        }
      }

      if (remove) {
        if (p.type === "bubble") {
          burst(p.x, p.y, "#dff8ff", 5, 60, 0.25, 0);
        }
        game.projectiles.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt) {
    const player = game.player;
    const playerActive = game.deathTimer <= 0;

    for (const enemy of game.level.enemies) {
      if (!enemy.alive) {
        continue;
      }

      if (enemy.type === "walker") {
        enemy.stun = Math.max(0, enemy.stun - dt);
        const inWater = rectTouchesTile(enemy, (tile) => tile === "W");
        enemy.vy = Math.min(MAX_FALL, enemy.vy + (inWater ? 250 : 920) * dt);
        enemy.vx = enemy.stun > 0 ? enemy.vx * 0.93 : enemy.dir * (inWater ? 40 : 55);
        const hitWall = moveHorizontal(enemy, dt);
        moveVertical(enemy, dt);
        if (hitWall) {
          enemy.dir *= -1;
        }
        if (enemy.onGround) {
          // Da meia-volta na beira de buracos e antes de perigos.
          const aheadTx = Math.floor((enemy.dir > 0 ? enemy.x + enemy.w + 3 : enemy.x - 3) / TILE);
          const support = getTile(aheadTx, Math.floor((enemy.y + enemy.h + 2) / TILE));
          const front = getTile(aheadTx, Math.floor((enemy.y + enemy.h - 4) / TILE));
          if (!isSolidTile(support) || isHazardFor(front, "") || front === "W") {
            enemy.dir *= -1;
          }
        }
        if (rectTouchesTile(enemy, (tile) => tile === "A" || tile === "L" || tile === "S")) {
          enemy.alive = false;
        }
      } else if (enemy.type === "bat") {
        enemy.t += dt;
        const nx = enemy.x0 + Math.sin(enemy.t * 1.1) * 72 - enemy.w * 0.5;
        enemy.dir = nx >= enemy.x ? 1 : -1;
        enemy.x = nx;
        enemy.y = enemy.y0 + Math.sin(enemy.t * 2.6) * 18 - enemy.h * 0.5;
      } else if (enemy.type === "fish") {
        enemy.t += dt;
        const nx = enemy.x + enemy.dir * 60 * dt;
        const frontX = enemy.dir > 0 ? nx + enemy.w : nx;
        const front = getTile(Math.floor(frontX / TILE), Math.floor((enemy.y + enemy.h * 0.5) / TILE));
        if (front !== "W") {
          enemy.dir *= -1;
        } else {
          enemy.x = nx;
        }
        enemy.y = enemy.baseY + Math.sin(enemy.t * 3) * 4;
      }

      if (enemy.y > game.level.h * TILE + 32) {
        enemy.alive = false;
      }

      if (!playerActive || !enemy.alive || player.invuln > 0 || !rectsIntersect(enemy, player)) {
        continue;
      }
      const stompable = enemy.type !== "fish";
      const stomp = stompable && player.vy > 80 && player.y + player.h - 8 < enemy.y + 8;
      if (stomp) {
        hitEnemy(enemy, 180);
        player.vy = -360;
        player.jumpCount = 1;
        player.airSpinActive = true;
      } else {
        loseLife("atingido por inimigo");
        return;
      }
    }
  }

  // Caixas caem um tile por vez quando nao ha nada embaixo.
  function updateCrates(dt) {
    game.crateTimer += dt;
    if (game.crateTimer < 0.06) {
      return;
    }
    game.crateTimer = 0;
    const level = game.level;
    for (let y = level.h - 2; y >= 0; y -= 1) {
      for (let x = 0; x < level.w; x += 1) {
        if (level.tiles[y][x] !== "K" || level.tiles[y + 1][x] !== ".") {
          continue;
        }
        const target = { x: x * TILE, y: (y + 1) * TILE, w: TILE, h: TILE };
        if (game.deathTimer <= 0 && rectsIntersect(target, game.player)) {
          continue;
        }
        for (const enemy of level.enemies) {
          if (enemy.alive && rectsIntersect(target, enemy)) {
            hitEnemy(enemy, 250);
          }
        }
        level.tiles[y][x] = ".";
        level.tiles[y + 1][x] = "K";
      }
    }
  }

  function updatePickups(dt) {
    const p = game.player;
    for (const item of game.level.pickups) {
      item.bob += dt * 3.2;
      if (!item.collected && game.deathTimer <= 0 && rectsIntersect(p, item)) {
        collectPickup(item);
      }
    }
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i -= 1) {
      const pt = game.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        game.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
  }

  function cameraTarget() {
    const p = game.player;
    const worldW = game.level.w * TILE;
    const worldH = game.level.h * TILE;
    const lookAhead = p.facing * 36;
    return {
      x: clamp(p.x + p.w * 0.5 + lookAhead - viewSize.w * 0.5, 0, Math.max(0, worldW - viewSize.w)),
      y: clamp(p.y + p.h * 0.5 - viewSize.h * 0.55, 0, Math.max(0, worldH - viewSize.h)),
    };
  }

  function snapCamera() {
    const t = cameraTarget();
    game.camera.x = t.x;
    game.camera.y = t.y;
  }

  function updateCamera(dt) {
    const t = cameraTarget();
    game.camera.x += (t.x - game.camera.x) * Math.min(1, dt * 6);
    game.camera.y += (t.y - game.camera.y) * Math.min(1, dt * 6);
  }

  function updateStatusText() {
    if (!statusEl) {
      return;
    }
    let text;
    if (game.state === "title") {
      text = "ENTER para jogar. Q mostra as instrucoes.";
    } else if (game.state === "intro") {
      text = game.level.def.hint;
    } else if (game.state === "playing") {
      text = game.messageTimer > 0 ? game.message : game.level.theme.status + " Q alterna instrucoes.";
    } else if (game.state === "clear") {
      text = "Fase concluida! ENTER para continuar.";
    } else if (game.state === "victory") {
      text = "Voce venceu! ENTER para voltar ao inicio.";
    } else {
      text = "Fim de jogo. R ou ENTER para tentar a fase de novo.";
    }
    if (statusEl.textContent !== text) {
      statusEl.textContent = text;
    }
  }

  function update(dt) {
    game.stateTimer += dt;

    if (anyPressed(["KeyQ"])) {
      setInstructionsVisible(!instructionsVisible);
    }

    if (game.state === "title") {
      if (anyPressed(CONFIRM_KEYS)) {
        newGame(0);
      } else if (anyPressed(["KeyC"]) && game.saved > 0) {
        newGame(game.saved);
      }
    } else if (game.state === "intro") {
      updateParticles(dt);
      if (game.stateTimer > 2.4 || (game.stateTimer > 0.3 && anyPressed([...CONFIRM_KEYS, ...ABILITY_KEYS]))) {
        game.state = "playing";
        game.stateTimer = 0;
        game.player.transform = TRANSFORM_TIME;
      }
    } else if (game.state === "playing") {
      if (anyPressed(["KeyR"])) {
        restartLevel();
        prevKeyState = { ...keyState };
        return;
      }
      game.messageTimer = Math.max(0, game.messageTimer - dt);

      if (game.deathTimer > 0) {
        game.deathTimer -= dt;
        if (game.deathTimer <= 0) {
          finishDeath();
        }
      } else {
        handleFormInput();
        game.timer -= dt;
        if (game.timer <= 0) {
          game.timer = 0;
          loseLife("tempo esgotado");
        } else {
          updatePlayer(dt);
        }
      }
      if (game.state === "playing") {
        updateProjectiles(dt);
        updateEnemies(dt);
        updateCrates(dt);
        updatePickups(dt);
        updateParticles(dt);
        if (game.deathTimer <= 0) {
          updateCamera(dt);
        }
      }
    } else if (game.state === "clear") {
      updateParticles(dt);
      if (game.stateTimer > 0.8 && anyPressed(CONFIRM_KEYS)) {
        if (game.levelIndex + 1 < LEVELS.length) {
          startLevel(game.levelIndex + 1);
        } else {
          game.state = "victory";
          game.stateTimer = 0;
        }
      }
    } else if (game.state === "gameover") {
      updateParticles(dt);
      if (game.stateTimer > 0.6 && anyPressed(["KeyR", ...CONFIRM_KEYS])) {
        const index = game.levelIndex;
        newGame(index);
      }
    } else if (game.state === "victory") {
      if (game.stateTimer > 1 && anyPressed(CONFIRM_KEYS)) {
        game.state = "title";
        game.stateTimer = 0;
      }
    }

    updateStatusText();
    prevKeyState = { ...keyState };
  }

  // ---------------------------------------------------------------------
  // Desenho: cenario
  // ---------------------------------------------------------------------

  function skyGradient(colors) {
    const g = wc.createLinearGradient(0, 0, 0, viewSize.h);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.55, colors[1]);
    g.addColorStop(1, colors[2]);
    return g;
  }

  function wrap(v, period) {
    return ((v % period) + period) % period;
  }

  function drawHills(offset, period, baseY, amp, color, freq) {
    wc.fillStyle = color;
    wc.beginPath();
    wc.moveTo(0, viewSize.h);
    for (let x = 0; x <= viewSize.w + 8; x += 8) {
      const wx = x + offset;
      const y = baseY - amp * (0.5 + 0.5 * Math.sin((wx / period) * Math.PI * 2 * freq)) -
        amp * 0.35 * Math.sin((wx / period) * Math.PI * 2 * freq * 2.3 + 1.3);
      wc.lineTo(x, Math.round(y));
    }
    wc.lineTo(viewSize.w, viewSize.h);
    wc.closePath();
    wc.fill();
  }

  function drawBackdrop(themeName, camX, time) {
    const theme = THEMES[themeName] || THEMES.castle;
    wc.fillStyle = skyGradient(theme.sky);
    wc.fillRect(0, 0, viewSize.w, viewSize.h);
    const H = viewSize.h;

    if (themeName === "desert") {
      wc.fillStyle = "rgba(255, 244, 200, 0.9)";
      wc.beginPath();
      wc.arc(viewSize.w * 0.78 - camX * 0.02, H * 0.22, 34, 0, Math.PI * 2);
      wc.fill();
      // piramides distantes
      wc.fillStyle = "#e39a52";
      for (let i = 0; i < 4; i += 1) {
        const px = wrap(i * 260 - camX * 0.1, viewSize.w + 260) - 130;
        const s = 60 + (i % 2) * 30;
        wc.beginPath();
        wc.moveTo(px - s, H * 0.72);
        wc.lineTo(px, H * 0.72 - s);
        wc.lineTo(px + s, H * 0.72);
        wc.fill();
      }
      drawHills(camX * 0.25, 600, H * 0.8, 40, "#e8a95e", 1);
      drawHills(camX * 0.45, 420, H * 0.92, 36, "#d48d45", 1);
    } else if (themeName === "lagoon") {
      wc.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 6; i += 1) {
        const cx = wrap(i * 190 - camX * 0.08 + time * 6, viewSize.w + 200) - 100;
        const cy = 40 + (i % 3) * 30;
        wc.fillRect(cx, cy, 70, 12);
        wc.fillRect(cx + 12, cy - 8, 40, 10);
      }
      wc.fillStyle = "#2f7fc4";
      wc.fillRect(0, H * 0.66, viewSize.w, H * 0.34);
      wc.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 20; i += 1) {
        const wx = wrap(i * 67 - camX * 0.2 + Math.sin(time + i) * 6, viewSize.w);
        wc.fillRect(wx, H * 0.68 + (i % 5) * 14, 18, 2);
      }
      drawHills(camX * 0.3, 700, H * 0.7, 30, "#3a8f4a", 1);
      // palmeiras
      for (let i = 0; i < 5; i += 1) {
        const px = wrap(i * 230 - camX * 0.3, viewSize.w + 230) - 110;
        wc.fillStyle = "#5a3d24";
        wc.fillRect(px, H * 0.46, 6, H * 0.22);
        wc.fillStyle = "#2e7d38";
        wc.fillRect(px - 26, H * 0.44, 58, 8);
        wc.fillRect(px - 16, H * 0.42, 38, 6);
        wc.fillRect(px - 30, H * 0.47, 12, 6);
        wc.fillRect(px + 24, H * 0.47, 12, 6);
      }
    } else if (themeName === "forest") {
      for (let layer = 0; layer < 3; layer += 1) {
        const speed = 0.12 + layer * 0.15;
        const shade = ["#143822", "#1b4a2b", "#245c34"][layer];
        wc.fillStyle = shade;
        for (let i = 0; i < 12; i += 1) {
          const px = wrap(i * 110 + layer * 37 - camX * speed, viewSize.w + 110) - 55;
          const tw = 16 + layer * 8;
          wc.fillRect(px, 0, tw, H);
        }
      }
      wc.fillStyle = "rgba(200, 255, 170, 0.07)";
      for (let i = 0; i < 4; i += 1) {
        const px = wrap(i * 300 - camX * 0.05, viewSize.w + 300) - 150;
        wc.beginPath();
        wc.moveTo(px, 0);
        wc.lineTo(px + 60, 0);
        wc.lineTo(px + 180, H);
        wc.lineTo(px + 100, H);
        wc.fill();
      }
    } else {
      wc.fillStyle = "rgba(220, 230, 255, 0.28)";
      wc.beginPath();
      wc.arc(viewSize.w * 0.8 - camX * 0.03, H * 0.2, 30, 0, Math.PI * 2);
      wc.fill();
      for (const s of starsFar) {
        const alpha = 0.35 + 0.35 * Math.sin(time * 0.4 + s.phase);
        wc.fillStyle = `rgba(220, 230, 255, ${alpha})`;
        wc.fillRect(wrap(s.x - camX * 0.05, viewSize.w + 40) - 20, s.y, s.size, s.size);
      }
      for (const s of starsNear) {
        const alpha = 0.5 + 0.45 * Math.sin(time + s.phase);
        wc.fillStyle = `rgba(240, 246, 255, ${alpha})`;
        wc.fillRect(wrap(s.x - camX * 0.1, viewSize.w + 40) - 20, s.y, s.size, s.size);
      }
      // torres do castelo
      wc.fillStyle = "#1a2248";
      for (let i = 0; i < 6; i += 1) {
        const px = wrap(i * 200 - camX * 0.2, viewSize.w + 200) - 100;
        const th = 90 + (i % 3) * 40;
        wc.fillRect(px, H - th, 40, th);
        for (let m = 0; m < 3; m += 1) {
          wc.fillRect(px - 4 + m * 16, H - th - 10, 10, 10);
        }
        wc.fillStyle = "rgba(255, 210, 110, 0.6)";
        wc.fillRect(px + 16, H - th + 24, 6, 10);
        wc.fillStyle = "#1a2248";
      }
    }
  }

  // ---------------------------------------------------------------------
  // Desenho: tiles
  // ---------------------------------------------------------------------

  function drawGroundTile(x, y, tx, ty, theme, themeName) {
    const above = getTile(tx, ty - 1);
    const below = getTile(tx, ty + 1);
    const openAbove = !isSolidTile(above) && above !== "W";
    const openBelow = !isSolidTile(below) && ty + 1 < game.level.h;

    wc.fillStyle = theme.ground;
    wc.fillRect(x, y, TILE, TILE);

    if (themeName === "castle") {
      wc.fillStyle = theme.groundDark;
      wc.fillRect(x, y + 15, TILE, 2);
      wc.fillRect(x + (ty % 2 === 0 ? 15 : 0), y, 2, 16);
      wc.fillRect(x + (ty % 2 === 0 ? 0 : 15), y + 16, 2, 16);
      wc.fillStyle = theme.groundLight;
      wc.fillRect(x + 3, y + 2, 9, 2);
      wc.fillRect(x + 19, y + 18, 9, 2);
    } else {
      const seed = (tx * 7 + ty * 13) % 5;
      wc.fillStyle = theme.groundDark;
      wc.fillRect(x + 4 + seed * 3, y + 10, 4, 3);
      wc.fillRect(x + 20 - seed, y + 22, 5, 3);
      wc.fillStyle = theme.groundLight;
      wc.fillRect(x + 12 + seed, y + 16, 3, 2);
      wc.fillRect(x + 2, y + 26 - seed, 3, 2);
    }

    if (openAbove) {
      wc.fillStyle = theme.top;
      wc.fillRect(x, y, TILE, 7);
      wc.fillStyle = theme.topLight;
      wc.fillRect(x, y, TILE, 2);
      wc.fillStyle = theme.top;
      for (let i = 0; i < 4; i += 1) {
        const h = ((tx * 3 + i * 5) % 3) + 1;
        wc.fillRect(x + i * 8 + 2, y + 7, 4, h);
      }
    }
    if (openBelow && themeName === "forest") {
      wc.fillStyle = "#2f7d33";
      for (let i = 0; i < 4; i += 1) {
        const h = ((tx * 5 + i * 3) % 4) + 3;
        wc.fillRect(x + i * 8 + 1, y + TILE - 2, 5, h);
      }
    } else if (openBelow) {
      wc.fillStyle = theme.groundDark;
      wc.fillRect(x, y + TILE - 3, TILE, 3);
    }
  }

  function drawTile(tile, tx, ty, time, theme, themeName) {
    const x = tx * TILE;
    const y = ty * TILE;

    if (tile === "#") {
      drawGroundTile(x, y, tx, ty, theme, themeName);
      return;
    }

    if (tile === "D") {
      // Terra fofa: rachada e mais clara que o chao, o Tiny vermelho come.
      wc.fillStyle = theme.soft;
      wc.fillRect(x, y, TILE, TILE);
      wc.fillStyle = "rgba(255,255,255,0.16)";
      wc.fillRect(x + 1, y + 1, TILE - 2, 3);
      wc.fillStyle = theme.softDark;
      wc.fillRect(x, y + TILE - 2, TILE, 2);
      wc.fillRect(x + TILE - 2, y, 2, TILE);
      wc.fillRect(x + 6, y + 6, 2, 8);
      wc.fillRect(x + 8, y + 13, 6, 2);
      wc.fillRect(x + 14, y + 15, 2, 7);
      wc.fillRect(x + 20, y + 6, 2, 6);
      wc.fillRect(x + 22, y + 11, 5, 2);
      wc.fillRect(x + 5, y + 23, 5, 2);
      wc.fillRect(x + 20, y + 22, 3, 3);
      return;
    }

    if (tile === "B") {
      // Feixe de galhos secos: queima com o fogo do Tiny amarelo.
      wc.fillStyle = "#6b3f1d";
      wc.fillRect(x, y, TILE, TILE);
      wc.fillStyle = "#a8662c";
      for (let i = 0; i < 4; i += 1) {
        wc.fillRect(x + 2 + i * 8, y + 1, 4, TILE - 2);
      }
      wc.fillStyle = "#d9994a";
      wc.fillRect(x, y + 9, TILE, 3);
      wc.fillRect(x, y + 21, TILE, 3);
      wc.fillStyle = "#3c220e";
      wc.fillRect(x + 7, y + 4, 1, 5);
      wc.fillRect(x + 23, y + 14, 1, 5);
      return;
    }

    if (tile === "K") {
      wc.fillStyle = "#9a6a36";
      wc.fillRect(x, y, TILE, TILE);
      wc.fillStyle = "#5b3a18";
      wc.fillRect(x, y, TILE, 3);
      wc.fillRect(x, y + TILE - 3, TILE, 3);
      wc.fillRect(x, y, 3, TILE);
      wc.fillRect(x + TILE - 3, y, 3, TILE);
      for (let i = 0; i < 22; i += 2) {
        wc.fillRect(x + 5 + i, y + 5 + i, 3, 3);
        wc.fillRect(x + TILE - 8 - i, y + 5 + i, 3, 3);
      }
      wc.fillStyle = "#c48e52";
      wc.fillRect(x + 3, y + 3, TILE - 6, 1);
      return;
    }

    if (tile === "W") {
      const surface = getTile(tx, ty - 1) !== "W" && !isSolidTile(getTile(tx, ty - 1));
      wc.fillStyle = "rgba(40, 120, 210, 0.62)";
      wc.fillRect(x, y, TILE, TILE);
      if (surface) {
        const wave = Math.round(Math.sin(time * 3 + tx * 0.9) * 1.5);
        wc.fillStyle = "rgba(190, 235, 255, 0.85)";
        wc.fillRect(x, y + 1 + wave, TILE, 3);
        wc.fillStyle = "rgba(255, 255, 255, 0.5)";
        wc.fillRect(x + ((tx * 11) % 20), y + 6 + wave, 8, 1);
      } else if ((tx + ty) % 3 === 0) {
        wc.fillStyle = "rgba(180, 225, 255, 0.18)";
        wc.fillRect(x + 6, y + 10 + Math.round(Math.sin(time * 2 + tx) * 3), 10, 1);
      }
      return;
    }

    if (tile === "S") {
      wc.fillStyle = theme.spike;
      wc.fillRect(x, y + TILE - 6, TILE, 6);
      for (let i = 0; i < 4; i += 1) {
        wc.beginPath();
        wc.moveTo(x + i * 8, y + TILE - 5);
        wc.lineTo(x + i * 8 + 4, y + 8 + (i % 2) * 5);
        wc.lineTo(x + i * 8 + 8, y + TILE - 5);
        wc.fill();
      }
      wc.fillStyle = "rgba(255,255,255,0.45)";
      for (let i = 0; i < 4; i += 1) {
        wc.fillRect(x + i * 8 + 3, y + 12 + (i % 2) * 5, 1, 6);
      }
      return;
    }

    if (tile === "A" || tile === "L") {
      const acid = tile === "A";
      const surface = getTile(tx, ty - 1) !== tile;
      const pulse = Math.sin(time * 5 + tx * 0.7) * 0.5 + 0.5;
      wc.fillStyle = acid ? "#2d6b12" : "#8a2a14";
      wc.fillRect(x, y, TILE, TILE);
      if (surface) {
        const wave = Math.round(Math.sin(time * 3 + tx) * 1.5);
        wc.fillStyle = acid ? "#7bd62a" : `rgb(255, ${120 + Math.round(pulse * 80)}, 30)`;
        wc.fillRect(x, y + 4 + wave, TILE, 8);
        wc.fillStyle = acid ? "#d9ff9a" : "#ffe46e";
        wc.fillRect(x, y + 4 + wave, TILE, 2);
        wc.fillRect(x + ((tx * 7 + Math.floor(time * 4)) % 26), y + 1 - Math.round(pulse * 2), 4, 3);
      }
      const by = y + TILE - ((time * 20 + tx * 13) % TILE);
      wc.fillStyle = acid ? "rgba(200, 255, 120, 0.55)" : "rgba(255, 220, 90, 0.55)";
      wc.fillRect(x + ((tx * 11) % 24) + 3, Math.round(by), 3, 3);
      return;
    }

    if (tile === "F") {
      for (let i = 0; i < 3; i += 1) {
        const flick = Math.sin(time * 14 + tx * 2 + i * 2.1);
        const h = 16 + flick * 5 + (i === 1 ? 6 : 0);
        const fx = x + 2 + i * 10;
        wc.fillStyle = "#e0401e";
        wc.fillRect(fx, y + TILE - h, 9, h);
        wc.fillStyle = "#ff9a2a";
        wc.fillRect(fx + 2, y + TILE - h * 0.7, 5, h * 0.7);
        wc.fillStyle = "#ffe36b";
        wc.fillRect(fx + 3, y + TILE - h * 0.35, 3, h * 0.35);
      }
      return;
    }

    if (tile === "E") {
      // Placa grande de EXIT, como no original.
      wc.fillStyle = "#5b3a18";
      wc.fillRect(x + 13, y - 24, 6, TILE + 24);
      wc.fillStyle = "#3b240e";
      wc.fillRect(x + 13, y - 24, 2, TILE + 24);
      const glow = 0.5 + 0.5 * Math.sin(time * 4);
      wc.fillStyle = `rgba(255, 240, 150, ${0.15 + glow * 0.2})`;
      wc.fillRect(x - 18, y - 50, 68, 34);
      wc.fillStyle = "#c0282e";
      wc.fillRect(x - 14, y - 46, 60, 26);
      wc.fillStyle = "#ffffff";
      wc.fillRect(x - 12, y - 44, 56, 2);
      wc.fillStyle = "#7a1418";
      wc.fillRect(x - 14, y - 22, 60, 2);
      wc.fillStyle = "#ffffff";
      wc.font = "bold 14px monospace";
      wc.textAlign = "center";
      wc.fillText("EXIT", x + 16, y - 27);
      wc.textAlign = "left";
    }
  }

  function drawTiles(time) {
    const level = game.level;
    const theme = level.theme;
    const themeName = level.def.theme;
    const camX = Math.round(game.camera.x);
    const camY = Math.round(game.camera.y);
    const startX = Math.floor(camX / TILE) - 2;
    const endX = Math.floor((camX + viewSize.w) / TILE) + 2;
    const startY = Math.floor(camY / TILE) - 1;
    const endY = Math.floor((camY + viewSize.h) / TILE) + 2;
    let exitTile = null;

    for (let ty = startY; ty <= endY; ty += 1) {
      for (let tx = startX; tx <= endX; tx += 1) {
        if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) {
          continue;
        }
        const tile = level.tiles[ty][tx];
        if (tile === ".") {
          continue;
        }
        if (tile === "E") {
          exitTile = [tx, ty];
          continue;
        }
        drawTile(tile, tx, ty, time, theme, themeName);
      }
    }
    if (exitTile) {
      drawTile("E", exitTile[0], exitTile[1], time, theme, themeName);
    }
  }

  // ---------------------------------------------------------------------
  // Desenho: itens, inimigos e jogador
  // ---------------------------------------------------------------------

  function drawPickups(time) {
    for (const item of game.level.pickups) {
      if (item.collected) {
        continue;
      }
      const bob = Math.round(Math.sin(item.bob + time * 1.7) * 2);
      const x = item.x;
      const y = item.y + bob;
      const cx = x + item.w * 0.5;
      const cy = y + item.h * 0.5;

      if (item.kind === "coin") {
        const spin = Math.abs(Math.cos(time * 3 + item.bob));
        const w = Math.max(2, Math.round(7 * spin));
        wc.fillStyle = "#b8860b";
        wc.fillRect(cx - w - 1, cy - 7, w * 2 + 2, 14);
        wc.fillStyle = "#ffd54a";
        wc.fillRect(cx - w, cy - 6, w * 2, 12);
        wc.fillStyle = "#fff4a8";
        wc.fillRect(cx - Math.max(1, w - 3), cy - 4, Math.max(1, Math.round(w * 0.6)), 4);
      } else if (item.kind === "fruit") {
        wc.fillStyle = "#f07a2a";
        wc.beginPath();
        wc.arc(cx, cy + 1, 8, 0, Math.PI * 2);
        wc.fill();
        wc.fillStyle = "#ffb070";
        wc.fillRect(cx - 5, cy - 3, 3, 3);
        wc.fillStyle = "#3c8a48";
        wc.fillRect(cx, cy - 10, 6, 3);
        wc.fillStyle = "#5b3a18";
        wc.fillRect(cx - 1, cy - 9, 2, 4);
      } else {
        wc.fillStyle = "#c9ced9";
        wc.beginPath();
        wc.arc(cx, cy, 10, 0, Math.PI * 2);
        wc.fill();
        wc.fillStyle = "#ffffff";
        wc.beginPath();
        wc.arc(cx, cy, 8, 0, Math.PI * 2);
        wc.fill();
        wc.fillStyle = "#1c2233";
        wc.fillRect(cx - 1, cy - 6, 2, 6);
        const a = time * 2;
        wc.fillRect(cx + Math.round(Math.cos(a) * 4) - 1, cy + Math.round(Math.sin(a) * 4) - 1, 2, 2);
        wc.fillStyle = "#d33";
        wc.fillRect(cx - 3, cy - 13, 6, 3);
      }
    }
  }

  function drawAtlasFrame(c, row, state, dx, dy, size, flipX) {
    if (!spriteReady) {
      return false;
    }
    const col = Object.prototype.hasOwnProperty.call(SPRITE_INDEX, state) ? SPRITE_INDEX[state] : 0;
    const frame = spriteFrame;
    const sx = col * frame;
    const sy = row * frame;

    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    if (flipX) {
      c.translate(dx + size, dy);
      c.scale(-1, 1);
      c.drawImage(spriteSheet, sx, sy, frame, frame, 0, 0, size, size);
    } else {
      c.drawImage(spriteSheet, sx, sy, frame, frame, dx, dy, size, size);
    }
    c.restore();
    return true;
  }

  function getRunState(time) {
    const frames = ["run1", "run2", "run3", "run4"];
    return frames[Math.floor(time * 11.5) % frames.length];
  }

  function drawEnemyFallback(enemy, time) {
    const x = enemy.x;
    const y = enemy.y;
    wc.fillStyle = "#8c4fc9";
    wc.beginPath();
    wc.arc(x + 12, y + 13, 11, 0, Math.PI * 2);
    wc.fill();
    wc.fillStyle = "#b98af0";
    for (let i = 0; i < 5; i += 1) {
      const offs = Math.sin(time * 6 + i * 0.7 + x * 0.02) * 1.5;
      wc.fillRect(x + 3 + i * 4, y + 1 + offs, 3, 4);
    }
    wc.fillStyle = "#f3f8ff";
    wc.fillRect(x + 6, y + 9, 5, 5);
    wc.fillRect(x + 13, y + 9, 5, 5);
    wc.fillStyle = "#13243d";
    wc.fillRect(x + (enemy.dir > 0 ? 9 : 6), y + 11, 2, 2);
    wc.fillRect(x + (enemy.dir > 0 ? 16 : 13), y + 11, 2, 2);
  }

  function drawBat(enemy, time) {
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);
    const flap = Math.sin(time * 18 + enemy.t) > 0;
    wc.fillStyle = "#3a2350";
    wc.fillRect(x + 7, y + 4, 10, 10);
    wc.fillRect(x + 9, y + 1, 2, 3);
    wc.fillRect(x + 13, y + 1, 2, 3);
    if (flap) {
      wc.fillRect(x, y, 7, 4);
      wc.fillRect(x + 17, y, 7, 4);
      wc.fillRect(x + 3, y + 4, 4, 3);
      wc.fillRect(x + 17, y + 4, 4, 3);
    } else {
      wc.fillRect(x, y + 8, 7, 4);
      wc.fillRect(x + 17, y + 8, 7, 4);
      wc.fillRect(x + 2, y + 12, 4, 3);
      wc.fillRect(x + 18, y + 12, 4, 3);
    }
    wc.fillStyle = "#ffdb4d";
    wc.fillRect(x + 9, y + 7, 2, 2);
    wc.fillRect(x + 13, y + 7, 2, 2);
    wc.fillStyle = "#ffffff";
    wc.fillRect(x + 10, y + 12, 1, 2);
    wc.fillRect(x + 13, y + 12, 1, 2);
  }

  function drawFish(enemy, time) {
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);
    const d = enemy.dir;
    const tail = Math.sin(time * 12 + enemy.t) > 0 ? 1 : -1;
    const bx = (ox) => (d > 0 ? x + ox : x + enemy.w - ox);
    wc.fillStyle = "#e0503a";
    wc.fillRect(Math.min(bx(4), bx(20)), y + 3, 16, 10);
    wc.fillRect(Math.min(bx(8), bx(16)), y + 1, 8, 14);
    wc.fillStyle = "#b8342a";
    const tx = d > 0 ? x : x + enemy.w - 5;
    wc.fillRect(tx, y + 4 + tail, 5, 8);
    wc.fillStyle = "#ffffff";
    wc.fillRect(d > 0 ? x + 15 : x + 6, y + 4, 4, 4);
    wc.fillStyle = "#101010";
    wc.fillRect(d > 0 ? x + 17 : x + 6, y + 5, 2, 2);
    wc.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i += 1) {
      wc.fillRect(d > 0 ? x + 18 - i * 2 : x + 4 + i * 2, y + 11, 1, 2);
    }
  }

  function drawEnemy(enemy, time) {
    if (enemy.type === "bat") {
      drawBat(enemy, time);
      return;
    }
    if (enemy.type === "fish") {
      drawFish(enemy, time);
      return;
    }
    let state;
    if (enemy.vy < -80) {
      state = "jump";
    } else if (enemy.vy > 120) {
      state = "fall";
    } else if (Math.abs(enemy.vx) > 12) {
      state = getRunState(time);
    } else {
      state = Math.floor(time * 2.4) % 2 === 0 ? "idle1" : "idle2";
    }
    const drawn = drawAtlasFrame(
      wc,
      SPRITE_ROWS.enemy,
      state,
      enemy.x + ENEMY_SPRITE_OFFSET_X,
      enemy.y + ENEMY_SPRITE_OFFSET_Y,
      ENEMY_SPRITE_SIZE,
      enemy.dir < 0
    );
    if (!drawn) {
      drawEnemyFallback(enemy, time);
    }
  }

  function drawProjectiles(time) {
    for (const p of game.projectiles) {
      if (p.type === "fire") {
        wc.fillStyle = "rgba(255, 110, 30, 0.9)";
        wc.beginPath();
        wc.arc(p.x, p.y, p.r + Math.sin(time * 18) * 1.2, 0, Math.PI * 2);
        wc.fill();
        wc.fillStyle = "#ffe36b";
        wc.beginPath();
        wc.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2);
        wc.fill();
        wc.fillStyle = "rgba(255, 170, 60, 0.6)";
        wc.fillRect(p.x - Math.sign(p.vx) * (p.r + 4), p.y - 2, 4, 4);
      } else {
        wc.fillStyle = "rgba(180, 240, 255, 0.45)";
        wc.beginPath();
        wc.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        wc.fill();
        wc.strokeStyle = "rgba(235, 255, 255, 0.95)";
        wc.lineWidth = 1.5;
        wc.stroke();
        wc.fillStyle = "#ffffff";
        wc.fillRect(p.x - 3, p.y - 3, 2, 2);
      }
    }
  }

  function drawHooks(time) {
    for (const hook of game.level.hooks) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + hook.x);
      wc.fillStyle = "#4b5566";
      wc.fillRect(hook.x - 1, hook.y - 14, 2, 8);
      wc.strokeStyle = "#d9dee8";
      wc.lineWidth = 3;
      wc.beginPath();
      wc.arc(hook.x, hook.y, 6, 0, Math.PI * 2);
      wc.stroke();
      wc.strokeStyle = `rgba(109, 228, 239, ${0.3 + pulse * 0.5})`;
      wc.lineWidth = 1;
      wc.beginPath();
      wc.arc(hook.x, hook.y, 10, 0, Math.PI * 2);
      wc.stroke();
    }
  }

  function drawParticles() {
    for (const pt of game.particles) {
      const alpha = clamp(pt.life / pt.max, 0, 1);
      wc.globalAlpha = alpha;
      wc.fillStyle = pt.color;
      wc.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }
    wc.globalAlpha = 1;
  }

  function drawPlayerFallback(p, time) {
    const x = p.x;
    const y = p.y;
    const bounce = Math.abs(p.vx) > 20 ? Math.sin(time * 18) * 1.1 : 0;
    wc.fillStyle = FORM_COLORS[p.form];
    wc.beginPath();
    wc.ellipse(x + p.w * 0.5, y + p.h * 0.5, 12, 12 + bounce, 0, 0, Math.PI * 2);
    wc.fill();
    wc.fillStyle = FORM_LIGHT[p.form];
    wc.beginPath();
    wc.ellipse(x + p.w * 0.36, y + p.h * 0.34, 4, 3, -0.3, 0, Math.PI * 2);
    wc.fill();
    wc.fillStyle = "#f4f8ff";
    wc.fillRect(x + 5, y + 6, 7, 8);
    wc.fillRect(x + 12, y + 6, 7, 8);
    const pupilOffset = p.facing > 0 ? 2 : 0;
    wc.fillStyle = "#122033";
    wc.fillRect(x + 7 + pupilOffset, y + 9, 2, 3);
    wc.fillRect(x + 14 + pupilOffset, y + 9, 2, 3);
    wc.fillStyle = "#1c1514";
    wc.fillRect(x + 3, y + p.h - 2, 8, 4);
    wc.fillRect(x + 13, y + p.h - 2, 8, 4);
  }

  function getPlayerAnimState(time) {
    const p = game.player;
    if (p.actionTimer > 0.01) {
      if (p.actionType === "attack") {
        return Math.floor(time * 28) % 2 === 0 ? "attack1" : "attack2";
      }
      return Math.floor(time * 20) % 2 === 0 ? "ability1" : "ability2";
    }
    if (p.hook && !p.onGround) {
      return "ability2";
    }
    if (!p.inWater && p.vy < -140) {
      return "jump";
    }
    if (!p.inWater && p.vy > 140) {
      return "fall";
    }
    if (Math.abs(p.vx) > 30 || (p.inWater && Math.abs(p.vx) + Math.abs(p.vy) > 40)) {
      return getRunState(time);
    }
    return Math.floor(time * 0.7) % 5 === 0 ? "idle2" : "idle1";
  }

  function drawTransformCloud(p, time) {
    const k = p.transform / TRANSFORM_TIME;
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;
    const radius = 4 + k * 26;
    for (let i = 0; i < 22; i += 1) {
      const a = (i / 22) * Math.PI * 2 + time * 5;
      const r = radius * (0.6 + 0.4 * Math.sin(i * 2.7));
      wc.fillStyle = i % 3 === 0 ? FORM_LIGHT[p.form] : FORM_COLORS[p.form];
      wc.fillRect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 3, 3);
    }
  }

  function drawPlayer(time) {
    const p = game.player;
    if (game.deathTimer > 0) {
      return;
    }
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) {
      return;
    }

    if (p.transform > 0.08) {
      drawTransformCloud(p, time);
      if (p.transform > TRANSFORM_TIME * 0.45) {
        return;
      }
    }

    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;
    const spinAngle = !p.onGround && !p.inWater && !p.hook ? p.airSpin : 0;
    const squash = p.squash > 0 ? p.squash / 0.14 : 0;
    const sx = 1 + squash * 0.22;
    const sy = 1 - squash * 0.22;

    wc.save();
    wc.translate(cx, p.y + p.h);
    wc.scale(sx, sy);
    wc.translate(0, -p.h * 0.5);
    if (spinAngle !== 0) {
      wc.rotate(spinAngle);
    }
    wc.translate(-cx, -cy);
    const state = getPlayerAnimState(time);
    const drawn = drawAtlasFrame(
      wc,
      SPRITE_ROWS[p.form],
      state,
      p.x + PLAYER_SPRITE_OFFSET_X,
      p.y + PLAYER_SPRITE_OFFSET_Y,
      PLAYER_SPRITE_SIZE,
      p.facing < 0
    );
    if (!drawn) {
      drawPlayerFallback(p, time);
    }
    wc.restore();

    if (p.form === "yellow" && p.charging) {
      wc.fillStyle = `rgba(255, 200, 80, ${0.25 + p.charge * 0.4})`;
      wc.beginPath();
      wc.arc(cx, cy, 14 + p.charge * 10, 0, Math.PI * 2);
      wc.fill();
    }

    if (p.drown > 0.2) {
      const left = 1 - p.drown / DROWN_TIME;
      for (let i = 0; i < 5; i += 1) {
        wc.fillStyle = i / 5 < left ? "#dff8ff" : "rgba(255,255,255,0.15)";
        wc.fillRect(Math.round(cx - 12 + i * 5), Math.round(p.y - 10), 4, 4);
      }
    }
  }

  function drawRope() {
    const p = game.player;
    if (game.deathTimer > 0) {
      return;
    }
    const px = p.x + p.w * 0.5;
    const py = p.y + p.h * 0.5;
    let ax = null;
    let ay = null;
    if (p.hook) {
      ax = p.hook.x;
      ay = p.hook.y;
    } else if (p.ropeFlash) {
      ax = p.ropeFlash.x;
      ay = p.ropeFlash.y;
    }
    if (ax === null) {
      return;
    }
    wc.strokeStyle = "#f0e6c8";
    wc.lineWidth = 2;
    wc.beginPath();
    wc.moveTo(px, py);
    wc.lineTo(ax, ay);
    wc.stroke();
    wc.fillStyle = "#8a8f99";
    wc.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 4, 4);
  }

  function renderWorld(time) {
    const camX = Math.round(game.camera.x * viewScale) / viewScale;
    const camY = Math.round(game.camera.y * viewScale) / viewScale;
    wc.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    drawBackdrop(game.level.def.theme, camX, time);
    wc.save();
    wc.translate(-camX, -camY);
    drawTiles(time);
    drawHooks(time);
    drawPickups(time);
    for (const enemy of game.level.enemies) {
      if (enemy.alive) {
        drawEnemy(enemy, time);
      }
    }
    drawProjectiles(time);
    drawRope();
    drawPlayer(time);
    drawParticles();
    wc.restore();
  }

  function blitView(height = viewSize.h * zoom) {
    const scale = height / viewSize.h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(view, 0, 0, view.width, view.height, 0, 0, Math.round(viewSize.w * scale), Math.round(height));
  }


  // ---------------------------------------------------------------------
  // HUD e telas
  // ---------------------------------------------------------------------

  function drawTinyIcon(c, x, y, size, form, dim) {
    if (spriteReady) {
      c.save();
      if (dim) {
        c.globalAlpha = 0.28;
      }
      drawAtlasFrame(c, SPRITE_ROWS[form], "idle1", x - size * 0.28, y - size * 0.3, size * 1.56, false);
      c.restore();
      return;
    }
    c.fillStyle = dim ? "rgba(120,120,140,0.5)" : FORM_COLORS[form];
    c.beginPath();
    c.arc(x + size * 0.5, y + size * 0.5, size * 0.45, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffffff";
    c.fillRect(x + size * 0.25, y + size * 0.3, size * 0.2, size * 0.25);
    c.fillRect(x + size * 0.55, y + size * 0.3, size * 0.2, size * 0.25);
  }

  function drawCoinIcon(x, y) {
    ctx.fillStyle = "#b8860b";
    ctx.fillRect(x, y, 16, 18);
    ctx.fillStyle = "#ffd54a";
    ctx.fillRect(x + 2, y + 2, 12, 14);
    ctx.fillStyle = "#fff4a8";
    ctx.fillRect(x + 4, y + 4, 3, 6);
  }

  function drawClockIcon(x, y) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + 9, y + 9, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2233";
    ctx.fillRect(x + 8, y + 3, 2, 7);
    ctx.fillRect(x + 8, y + 8, 6, 2);
  }

  function drawFruitIcon(x, y) {
    ctx.fillStyle = "#f07a2a";
    ctx.beginPath();
    ctx.arc(x + 9, y + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3c8a48";
    ctx.fillRect(x + 9, y, 6, 3);
  }

  function hudText(text, x, y, color = "#f3f6ff", size = 16) {
    ctx.font = `bold ${size}px monospace`;
    ctx.fillStyle = "#000000";
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function pad(n, len) {
    return String(Math.max(0, Math.floor(n))).padStart(len, "0");
  }

  function drawHUD(time) {
    const y0 = playH;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + HUD_H);
    g.addColorStop(0, "#2a2f55");
    g.addColorStop(1, "#141833");
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, canvas.width, HUD_H);
    ctx.fillStyle = "#6b78c9";
    ctx.fillRect(0, y0, canvas.width, 2);
    ctx.fillStyle = "#0a0c1c";
    ctx.fillRect(0, y0 + HUD_H - 2, canvas.width, 2);

    const p = game.player;
    const forms = game.level.def.forms;
    const midY = y0 + HUD_H * 0.5;
    let x = 14;

    FORMS.forEach((form, index) => {
      const available = forms.includes(form);
      const selected = p.form === form;
      if (selected) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 3, y0 + 6, 44, HUD_H - 12);
        ctx.fillStyle = FORM_COLORS[form];
        ctx.fillRect(x - 1, y0 + 8, 40, HUD_H - 16);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x - 1, y0 + 8, 40, HUD_H - 16);
      }
      drawTinyIcon(ctx, x + 5, y0 + 13, 28, form, !available);
      hudText(String(index + 1), x + 1, y0 + 22, available ? "#ffffff" : "#777b90", 11);
      x += 48;
    });

    x += 10;
    drawTinyIcon(ctx, x, midY - 12, 22, p.form, false);
    hudText(`x${game.lives}`, x + 28, midY + 6);
    x += 82;

    drawClockIcon(x, midY - 9);
    const secs = Math.ceil(Math.max(0, game.timer));
    const low = secs <= 20 && Math.floor(time * 4) % 2 === 0;
    hudText(`${Math.floor(secs / 60)}:${pad(secs % 60, 2)}`, x + 24, midY + 6, low ? "#ff6b6b" : "#f3f6ff");
    x += 92;

    drawCoinIcon(x, midY - 9);
    hudText(pad(game.coins, 3), x + 22, midY + 6, "#ffe36b");
    x += 74;

    drawFruitIcon(x, midY - 10);
    hudText(pad(game.fruits, 2), x + 22, midY + 6, "#ffb070");
    x += 62;

    hudText(`PONTOS ${pad(game.score, 6)}`, x, midY + 6);
    x += 170;

    if (x + 200 < canvas.width) {
      ctx.textAlign = "right";
      hudText(`${game.levelIndex + 1}/${LEVELS.length} ${game.level.def.name}`, canvas.width - 14, midY + 6, "#a6b8df", 14);
      ctx.textAlign = "left";
    }
  }

  function drawPanel(title, lines, accent) {
    const w = Math.min(560, canvas.width - 40);
    const h = 70 + lines.length * 26;
    const x = Math.round((canvas.width - w) / 2);
    const y = Math.round(playH * 0.5 - h / 2);
    ctx.fillStyle = "rgba(5, 9, 24, 0.82)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.textAlign = "center";
    hudText(title, canvas.width / 2, y + 42, "#ffffff", 26);
    lines.forEach((line, i) => {
      hudText(line, canvas.width / 2, y + 74 + i * 26, "#c4d4ff", 15);
    });
    ctx.textAlign = "left";
  }

  function drawIntroCard() {
    const def = game.level.def;
    const names = def.forms.map((f) => `${FORMS.indexOf(f) + 1} ${FORM_NAMES[f]}`).join("   ");
    drawPanel(`Fase ${game.levelIndex + 1}: ${def.name}`, [
      `Tinies disponiveis: ${names}`,
      def.hint.length > 60 ? def.hint.slice(0, def.hint.lastIndexOf(" ", 60)) : def.hint,
      def.hint.length > 60 ? def.hint.slice(def.hint.lastIndexOf(" ", 60) + 1) : "",
      "ENTER para comecar",
    ].filter(Boolean), "#f5cf4b");
  }

  function drawTitle(time) {
    wc.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    drawBackdrop("desert", time * 40, time);
    blitView(playH + HUD_H);
    ctx.fillStyle = "rgba(10, 8, 30, 0.35)";
    ctx.fillRect(0, 0, canvas.width, playH + HUD_H);

    const cx = canvas.width / 2;
    const cy = playH * 0.42;
    ctx.textAlign = "center";
    hudText("MAMONAS ASSASSINAS", cx, cy - 40, "#ffe36b", Math.min(56, Math.floor(canvas.width / 14)));
    hudText("O JOGO", cx, cy + 4, "#ffffff", 28);
    hudText("uma homenagem a Fury of the Furries (1993)", cx, cy + 36, "#c4d4ff", 16);

    FORMS.forEach((form, i) => {
      const bx = cx - 150 + i * 100;
      const by = cy + 78 - Math.abs(Math.sin(time * 4 + i * 0.8)) * 26;
      if (!drawAtlasFrame(ctx, SPRITE_ROWS[form], "jump", bx - 48, by, 96, false)) {
        drawTinyIcon(ctx, bx - 20, by + 10, 40, form, false);
      }
      hudText(FORM_NAMES[form], bx, cy + 192, FORM_COLORS[form], 15);
    });

    const blink = Math.floor(time * 2) % 2 === 0;
    if (blink) {
      hudText("ENTER para jogar", cx, cy + 232, "#ffffff", 20);
    }
    if (game.saved > 0) {
      hudText(`C para continuar da fase ${game.saved + 1}: ${LEVELS[game.saved].name}`, cx, cy + 260, "#8ff0c1", 15);
    }
    ctx.textAlign = "left";
  }

  function render(time) {
    ctx.fillStyle = "#05091e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (game.state === "title") {
      drawTitle(time);
      return;
    }

    renderWorld(time);
    blitView();
    drawHUD(time);

    if (game.state === "intro") {
      drawIntroCard();
    } else if (game.state === "clear") {
      const last = game.levelIndex + 1 >= LEVELS.length;
      drawPanel("Fase concluida!", [
        `Bonus de tempo: ${game.timeBonus}`,
        `Moedas: ${game.coins}   Frutas: ${game.fruits}`,
        last ? "ENTER para o final" : `Proxima: ${LEVELS[game.levelIndex + 1].name}`,
      ], "#57f29f");
    } else if (game.state === "gameover") {
      drawPanel("Fim de jogo", [`Pontos: ${game.score}`, "R ou ENTER para tentar esta fase de novo"], "#ff5c68");
    } else if (game.state === "victory") {
      drawPanel("Parabens!", [
        "Os Tinies escaparam do castelo!",
        `Pontuacao final: ${game.score}`,
        "ENTER para voltar ao inicio",
      ], "#ffe36b");
    }
  }

  resizeCanvas();
  rebuildBackdropStars();
  setInstructionsVisible(false);
  window.addEventListener("resize", resizeCanvas);

  if (/[?&]debug\b/.test(window.location.search)) {
    window.__tiny = { game, LEVELS, keyState, startLevel, newGame, update, getTile };
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render(now / 1000);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
