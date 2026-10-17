/**
 * 游戏玩法与机制说明（10 语言）
 * 内容严格对照本软件的游戏引擎（src/core）、AI 引擎（src/ai）与设置实际实现，
 * 牌型为 13 种可出牌型（另加“不出”）。
 */

export interface RulesSection {
  heading: string;
  items: string[];
}

export interface RulesContent {
  sections: RulesSection[];
}

export const RULES_CONTENT: Record<string, RulesContent> = {
  'zh-CN': {
    sections: [
      {
        heading: '📋 基本规则',
        items: [
          '一副牌共 54 张（含大王、小王），3 名玩家各发 17 张，剩余 3 张为底牌。',
          '叫分阶段最高分者成为地主，获得 3 张底牌（共 20 张），其余两人为农民。',
          '地主 1 人对战 2 名农民；谁先出完手牌，谁所在的一方获胜。',
          '点数大小：大王 ＞ 小王 ＞ 2 ＞ A ＞ K ＞ Q ＞ J ＞ 10 ＞ 9 ＞ … ＞ 3。',
          '花色（黑桃、红桃、梅花、方块）仅用于显示，不影响牌的大小。',
        ],
      },
      {
        heading: '🗳 叫分规则',
        items: [
          '从随机首家开始，逆时针依次叫分，可叫 1 分、2 分、3 分或不叫。',
          '每人只能叫比当前最高分更高的分，或选择不叫。',
          '有人叫 3 分立即结束并成为地主；一轮结束后最高分者为地主。',
          '三家都不叫时，系统强制首家叫 1 分成为地主。',
          '合作模式（固定农民）下，你不会成为地主，地主必由 AI 产生。',
        ],
      },
      {
        heading: '🃏 牌型（共 13 种）',
        items: [
          '单牌：单张牌；对子：两张同点；三张：三张同点。',
          '三带一：三张 + 一张单牌；三带对：三张 + 一个对子。',
          '顺子：5 张及以上连续单牌（不含 2 与王）。',
          '连对：3 对及以上连续对子（不含 2 与王）。',
          '飞机：2 组及以上连续三张（不含 2 与王）。',
          '飞机带翅膀：飞机 + 等量的单牌或对子。',
          '四带二单：四张 + 两张单牌；四带二对：四张 + 两个对子。',
          '炸弹：四张同点牌；火箭：大王 + 小王（双王）。',
        ],
      },
      {
        heading: '⚖ 大小比较',
        items: [
          '火箭 ＞ 炸弹 ＞ 普通牌型。',
          '炸弹之间按点数比大小（张数相同）。',
          '普通牌型必须牌型相同、张数相同才能比较，比较最大牌张的点数。',
          '跟牌时必须出相同牌型且更大的牌，或使用炸弹 / 火箭压制。',
        ],
      },
      {
        heading: '💰 倍数与计分',
        items: [
          '总倍数 = 叫分 × 场次倍数 × 炸弹倍数 × 春天倍数。',
          '每打出一个炸弹，总倍数 ×2（可累乘）；火箭 ×4。',
          '春天：地主先出完牌且两名农民一张未出，×2。',
          '反春天：农民先出完牌且地主只出过第一手，×2。',
          '场次倍数：初级 ×1、低级 ×2、中级 ×5、高级 ×10。',
          '单注 = 总倍数 × 场次倍数 × 10 金币；地主输赢按 2 倍结算，每名农民按 1 倍结算。',
        ],
      },
      {
        heading: '🎮 三种对战模式',
        items: [
          '人机对战：你与两名 AI 对局，角色由叫分决定。',
          '合作模式（农民）：你固定为农民，与一名 AI 农民搭档对战 AI 地主。',
          'AI 观战：三名 AI 自动对战，可查看每步推理、调节速度（1×/2×/4×）、暂停与单步执行。',
        ],
      },
      {
        heading: '🤖 AI 与其他功能',
        items: [
          'AI 由大语言模型（OpenAI / Claude / Gemini，支持原生与兼容接口）进行决策。',
          'AI 连续 3 次返回非法动作时，本回合自动降级为规则兜底 AI，并标注“AI 降级中”。',
          '模型 120 秒无响应会自动暂停并弹出提醒，可重新加载模型或跳过本轮。',
          '可随时接管任意 AI 座位、切换视角或把座位交还 AI。',
          '设置中可测试连接、获取模型列表、调节音量、切换主题与语言、一键备份 / 还原（含模型配置）。',
        ],
      },
    ],
  },

  'zh-TW': {
    sections: [
      {
        heading: '📋 基本規則',
        items: [
          '一副牌共 54 張（含大王、小王），3 名玩家各發 17 張，剩餘 3 張為底牌。',
          '叫分階段最高分者成為地主，獲得 3 張底牌（共 20 張），其餘兩人為農民。',
          '地主 1 人對戰 2 名農民；誰先出完手牌，誰所在的一方獲勝。',
          '點數大小：大王 ＞ 小王 ＞ 2 ＞ A ＞ K ＞ Q ＞ J ＞ 10 ＞ 9 ＞ … ＞ 3。',
          '花色（黑桃、紅桃、梅花、方塊）僅用於顯示，不影響牌的大小。',
        ],
      },
      {
        heading: '🗳 叫分規則',
        items: [
          '從隨機首家開始，逆時針依次叫分，可叫 1 分、2 分、3 分或不叫。',
          '每人只能叫比當前最高分更高的分，或選擇不叫。',
          '有人叫 3 分立即結束並成為地主；一輪結束後最高分者為地主。',
          '三家都不叫時，系統強制首家叫 1 分成為地主。',
          '合作模式（固定農民）下，你不會成為地主，地主必由 AI 產生。',
        ],
      },
      {
        heading: '🃏 牌型（共 13 種）',
        items: [
          '單牌：單張牌；對子：兩張同點；三張：三張同點。',
          '三帶一：三張 + 一張單牌；三帶對：三張 + 一個對子。',
          '順子：5 張及以上連續單牌（不含 2 與王）。',
          '連對：3 對及以上連續對子（不含 2 與王）。',
          '飛機：2 組及以上連續三張（不含 2 與王）。',
          '飛機帶翅膀：飛機 + 等量的單牌或對子。',
          '四帶二單：四張 + 兩張單牌；四帶二對：四張 + 兩個對子。',
          '炸彈：四張同點牌；火箭：大王 + 小王（雙王）。',
        ],
      },
      {
        heading: '⚖ 大小比較',
        items: [
          '火箭 ＞ 炸彈 ＞ 普通牌型。',
          '炸彈之間按點數比大小（張數相同）。',
          '普通牌型必須牌型相同、張數相同才能比較，比較最大牌張的點數。',
          '跟牌時必須出相同牌型且更大的牌，或使用炸彈 / 火箭壓制。',
        ],
      },
      {
        heading: '💰 倍數與計分',
        items: [
          '總倍數 = 叫分 × 場次倍數 × 炸彈倍數 × 春天倍數。',
          '每打出一個炸彈，總倍數 ×2（可累乘）；火箭 ×4。',
          '春天：地主先出完牌且兩名農民一張未出，×2。',
          '反春天：農民先出完牌且地主只出過第一手，×2。',
          '場次倍數：初級 ×1、低級 ×2、中級 ×5、高級 ×10。',
          '單注 = 總倍數 × 場次倍數 × 10 金幣；地主輸贏按 2 倍結算，每名農民按 1 倍結算。',
        ],
      },
      {
        heading: '🎮 三種對戰模式',
        items: [
          '人機對戰：你與兩名 AI 對局，角色由叫分決定。',
          '合作模式（農民）：你固定為農民，與一名 AI 農民搭檔對戰 AI 地主。',
          'AI 觀戰：三名 AI 自動對戰，可查看每步推理、調節速度（1×/2×/4×）、暫停與單步執行。',
        ],
      },
      {
        heading: '🤖 AI 與其他功能',
        items: [
          'AI 由大語言模型（OpenAI / Claude / Gemini，支援原生與相容介面）進行決策。',
          'AI 連續 3 次返回非法動作時，本回合自動降級為規則兜底 AI，並標註「AI 降級中」。',
          '模型 120 秒無回應會自動暫停並彈出提醒，可重新載入模型或跳過本輪。',
          '可隨時接管任意 AI 座位、切換視角或把座位交還 AI。',
          '設定中可測試連線、取得模型列表、調節音量、切換主題與語言、一鍵備份 / 還原（含模型配置）。',
        ],
      },
    ],
  },

  en: {
    sections: [
      {
        heading: '📋 Basic Rules',
        items: [
          'A deck of 54 cards (Big & Small Joker): each of 3 players gets 17, with 3 bottom cards.',
          'The highest bidder becomes the Landlord and takes the 3 bottom cards (20 in total); the others are Farmers.',
          '1 Landlord vs 2 Farmers. Whichever side empties a hand first wins.',
          'Card order: Big Joker > Small Joker > 2 > A > K > Q > J > 10 > 9 > … > 3.',
          'Suits (spade, heart, club, diamond) are display-only and do not affect rank.',
        ],
      },
      {
        heading: '🗳 Bidding',
        items: [
          'Starting from a random first player, bid counter-clockwise: 1, 2, 3 points or pass.',
          'You may only bid higher than the current highest, or pass.',
          'A bid of 3 ends bidding immediately and makes the bidder Landlord; otherwise the highest bid wins.',
          'If all three pass, the first player is forced to bid 1 and become Landlord.',
          'In Fixed-Farmer mode you can never be the Landlord — the Landlord is always an AI.',
        ],
      },
      {
        heading: '🃏 Card Types (13)',
        items: [
          'Single; Pair (two same rank); Triple (three same rank).',
          'Triple+Single: triple + one kicker; Triple+Pair: triple + one pair.',
          'Straight: 5+ consecutive singles (no 2, no jokers).',
          'Double Straight: 3+ consecutive pairs (no 2, no jokers).',
          'Airplane: 2+ consecutive triples (no 2, no jokers).',
          'Airplane+Wings: airplane plus an equal number of singles or pairs.',
          'Four+Two Singles: four + two kickers; Four+Two Pairs: four + two pairs.',
          'Bomb: four cards of the same rank; Rocket: Big Joker + Small Joker.',
        ],
      },
      {
        heading: '⚖ Comparing Cards',
        items: [
          'Rocket > Bomb > normal card types.',
          'Bombs are compared by rank (equal card count).',
          'Normal plays must match in type and card count; compare the highest card rank.',
          'To follow, play the same type but larger, or beat with a Bomb / Rocket.',
        ],
      },
      {
        heading: '💰 Multipliers & Scoring',
        items: [
          'Total multiplier = bid × hall multiplier × bomb multiplier × spring multiplier.',
          'Each Bomb multiplies the total by 2 (cumulative); Rocket multiplies by 4.',
          'Spring: Landlord empties first while neither Farmer played a card — ×2.',
          'Anti-Spring: a Farmer empties first while the Landlord only played once — ×2.',
          'Hall multipliers: Beginner ×1, Low ×2, Mid ×5, High ×10.',
          'Unit = total multiplier × hall multiplier × 10 coins; the Landlord settles 2 units, each Farmer 1 unit.',
        ],
      },
      {
        heading: '🎮 Three Game Modes',
        items: [
          'Human vs AI: you play against two AIs; roles are decided by bidding.',
          'Fixed Farmer: you are always a Farmer, partnered with an AI Farmer against an AI Landlord.',
          'AI Spectate: three AIs auto-play; view reasoning, set speed (1×/2×/4×), pause and step.',
        ],
      },
      {
        heading: '🤖 AI & Other Features',
        items: [
          'AI decisions are made by an LLM (OpenAI / Claude / Gemini, native or compatible endpoints).',
          'After 3 illegal responses in a row, the AI falls back to a rule-based engine and is marked “degraded”.',
          'No response for 120s auto-pauses with a prompt; you can reload the model or skip the turn.',
          'You can take over any AI seat at any time, switch views, or return a seat to the AI.',
          'Settings support connection tests, model lists, volume, themes/languages and one-click backup/restore (incl. model config).',
        ],
      },
    ],
  },

  es: {
    sections: [
      {
        heading: '📋 Reglas básicas',
        items: [
          'Mazo de 54 cartas (comodines grande y pequeño): 3 jugadores reciben 17 cada uno, con 3 cartas de reserva.',
          'El mejor postor es el Terrateniente y toma las 3 cartas de reserva (20 en total); los demás son Campesinos.',
          '1 Terrateniente contra 2 Campesinos. Gana el bando que vacíe primero su mano.',
          'Orden: Comodín grande > Comodín pequeño > 2 > A > K > Q > J > 10 > 9 > … > 3.',
          'Los palos (picas, corazones, tréboles, diamantes) solo se muestran; no afectan al valor.',
        ],
      },
      {
        heading: '🗳 Subastas',
        items: [
          'Desde un primer jugador aleatorio, se puja en sentido antihorario: 1, 2, 3 o pasar.',
          'Solo puedes pujar más alto que la puja máxima actual, o pasar.',
          'Pujar 3 termina de inmediato y el pujador es el Terrateniente; si no, gana la puja más alta.',
          'Si los tres pasan, el primer jugador es forzado a pujar 1 y ser Terrateniente.',
          'En el modo Campesino fijo nunca serás el Terrateniente; siempre será una IA.',
        ],
      },
      {
        heading: '🃏 Tipos de jugada (13)',
        items: [
          'Sencilla; Pareja (dos iguales); Trío (tres iguales).',
          'Trío+1: trío + una carta; Trío+Pareja: trío + una pareja.',
          'Escalera: 5+ sencillas consecutivas (sin 2 ni comodines).',
          'Doble escalera: 3+ parejas consecutivas (sin 2 ni comodines).',
          'Avión: 2+ tríos consecutivos (sin 2 ni comodines).',
          'Avión con alas: avión + igual número de sencillas o parejas.',
          'Cuatro+2 sencillas: cuatro + dos cartas; Cuatro+2 parejas: cuatro + dos parejas.',
          'Bomba: cuatro del mismo valor; Cohete: comodín grande + pequeño.',
        ],
      },
      {
        heading: '⚖ Comparación',
        items: [
          'Cohete > Bomba > jugadas normales.',
          'Las bombas se comparan por valor (mismo número de cartas).',
          'Las jugadas normales deben coincidir en tipo y número; se compara la carta más alta.',
          'Para seguir, juega el mismo tipo pero mayor, o gana con una Bomba / Cohete.',
        ],
      },
      {
        heading: '💰 Multiplicadores y puntos',
        items: [
          'Multiplicador total = puja × multiplicador de sala × bombas × primavera.',
          'Cada Bomba multiplica por 2 (acumulativo); el Cohete por 4.',
          'Primavera: el Terrateniente vacía primero sin que un Campesino jugara — ×2.',
          'Contraprimavera: un Campesino vacía primero y el Terrateniente solo jugó una vez — ×2.',
          'Salas: Principiante ×1, Baja ×2, Media ×5, Alta ×10.',
          'Unidad = multiplicador total × multiplicador de sala × 10 monedas; el Terrateniente paga 2, cada Campesino 1.',
        ],
      },
      {
        heading: '🎮 Tres modos',
        items: [
          'Humano vs IA: juegas contra dos IAs; los roles se deciden por la subasta.',
          'Campesino fijo: siempre eres Campesino, con una IA campesina contra el terrateniente IA.',
          'Espectador IA: tres IAs juegan solas; ve el razonamiento, velocidad (1×/2×/4×), pausa y paso a paso.',
        ],
      },
      {
        heading: '🤖 IA y funciones',
        items: [
          'La IA decide con un modelo de lenguaje (OpenAI / Claude / Gemini, endpoints nativos o compatibles).',
          'Tras 3 respuestas inválidas seguidas, pasa a una IA de reglas y se marca “degradada”.',
          'Sin respuesta en 120 s se pausa con aviso; puedes recargar el modelo o saltar el turno.',
          'Puedes tomar cualquier asiento de IA, cambiar de vista o devolver el asiento a la IA.',
          'Ajustes: prueba de conexión, lista de modelos, volumen, temas/idiomas y copia/restauración (incluye la config).',
        ],
      },
    ],
  },

  de: {
    sections: [
      {
        heading: '📋 Grundregeln',
        items: [
          'Blatt mit 54 Karten (großer & kleiner Joker): 3 Spieler erhalten je 17, dazu 3 Grundkarten.',
          'Der Höchstbieter wird Grundherr und erhält die 3 Grundkarten (20 gesamt); die anderen sind Bauern.',
          '1 Grundherr gegen 2 Bauern. Wer zuerst seine Hand leerlegt, dessen Seite gewinnt.',
          'Reihenfolge: großer Joker > kleiner Joker > 2 > A > K > Q > J > 10 > 9 > … > 3.',
          'Farben (Pik, Herz, Kreuz, Karo) dienen nur der Anzeige und beeinflussen den Wert nicht.',
        ],
      },
      {
        heading: '🗳 Bieten',
        items: [
          'Ab einem zufälligen ersten Spieler wird gegen den Uhrzeigersinn geboten: 1, 2, 3 oder passen.',
          'Du darfst nur höher als das aktuelle Maximum bieten oder passen.',
          'Ein Gebot von 3 beendet sofort und macht den Bieter zum Grundherrn; sonst gewinnt das höchste Gebot.',
          'Passen alle drei, muss der erste Spieler 1 bieten und Grundherr werden.',
          'Im Modus Fester Bauer wirst du nie Grundherr – der Grundherr ist immer eine KI.',
        ],
      },
      {
        heading: '🃏 Kartentypen (13)',
        items: [
          'Einzel; Paar (zwei Gleiche); Drilling (drei Gleiche).',
          'Drilling+1: Drilling + eine Karte; Drilling+Paar: Drilling + ein Paar.',
          'Straße: 5+ aufeinanderfolgende Einzelkarten (keine 2, keine Joker).',
          'Doppelstraße: 3+ aufeinanderfolgende Paare (keine 2, keine Joker).',
          'Flugzeug: 2+ aufeinanderfolgende Drillinge (keine 2, keine Joker).',
          'Flugzeug mit Flügeln: Flugzeug + ebenso viele Einzelkarten oder Paare.',
          'Vierer+2 Einzel: Vierer + zwei Karten; Vierer+2 Paare: Vierer + zwei Paare.',
          'Bombe: vier gleiche Karten; Rakete: großer + kleiner Joker.',
        ],
      },
      {
        heading: '⚖ Vergleichen',
        items: [
          'Rakete > Bombe > normale Kartentypen.',
          'Bomben werden nach Rang verglichen (gleiche Kartenzahl).',
          'Normale Züge müssen in Typ und Anzahl übereinstimmen; Vergleich über die höchste Karte.',
          'Zum Bedienen denselben Typ, aber höher spielen, oder mit Bombe / Rakete schlagen.',
        ],
      },
      {
        heading: '💰 Multiplikatoren & Wertung',
        items: [
          'Gesamtmultiplikator = Gebot × Tischmultiplikator × Bomben × Frühling.',
          'Jede Bombe ×2 (kumulativ); die Rakete ×4.',
          'Frühling: Grundherr legt zuerst leer, kein Bauer spielte — ×2.',
          'Gegenfrühling: ein Bauer legt zuerst leer, Grundherr spielte nur einmal — ×2.',
          'Tische: Anfänger ×1, Niedrig ×2, Mittel ×5, Hoch ×10.',
          'Einheit = Gesamtmultiplikator × Tischmultiplikator × 10 Münzen; Grundherr 2 Einheiten, jeder Bauer 1.',
        ],
      },
      {
        heading: '🎮 Drei Spielmodi',
        items: [
          'Mensch gegen KI: du gegen zwei KIs; die Rollen werden durch Bieten bestimmt.',
          'Fester Bauer: du bist immer Bauer, mit einer KI-Bäuerin gegen den KI-Grundherrn.',
          'KI zuschauen: drei KIs spielen allein; mit Begründung, Tempo (1×/2×/4×), Pause und Einzelschritt.',
        ],
      },
      {
        heading: '🤖 KI & Funktionen',
        items: [
          'Die KI entscheidet über ein Sprachmodell (OpenAI / Claude / Gemini, native oder kompatible Endpunkte).',
          'Nach 3 ungültigen Antworten greift eine regelbasierte KI („KI herabgestuft“).',
          '120 s ohne Antwort pausiert automatisch mit Hinweis; Modell neu laden oder Zug überspringen.',
          'Du kannst jeden KI-Sitz übernehmen, die Ansicht wechseln oder den Sitz zurückgeben.',
          'In den Einstellungen: Verbindungstest, Modellliste, Lautstärke, Themes/Sprachen, Backup/Wiederherstellung (inkl. Konfig).',
        ],
      },
    ],
  },

  ja: {
    sections: [
      {
        heading: '📋 基本ルール',
        items: [
          '計54枚（大小ジョーカー込み）。3人に17枚ずつ配り、3枚が場札（底札）。',
          '最高値を付けた者が地主となり3枚の底札を取得（計20枚）。他の2人は農民。',
          '地主1人対農民2人。先に手札を出し切った側の勝利。',
          '強さ：大王 > 小王 > 2 > A > K > Q > J > 10 > 9 > … > 3。',
          'スート（スペード・ハート・クラブ・ダイヤ）は表示のみで強さに影響しません。',
        ],
      },
      {
        heading: '🗳 せり（叫分）',
        items: [
          'ランダムな最初のプレイヤーから反時計回りに1、2、3点、またはパス。',
          '現在の最高値より高い点を付けるか、パスしかできません。',
          '3点を付けると即終了し地主確定。それ以外は最高値の者が地主。',
          '3人ともパスの場合、最初のプレイヤーが1点で地主になります。',
          '固定農民モードではあなたは地主になれず、地主は必ずAIです。',
        ],
      },
      {
        heading: '🃏 役（全13種）',
        items: [
          '単牌／対子（同値2枚）／三枚（同値3枚）。',
          '三帯一：三枚+単牌1枚；三帯対：三枚+対子1組。',
          '順子：5枚以上の連続単牌（2とジョーカーを含まない）。',
          '連対：3組以上の連続対子（2とジョーカーを含まない）。',
          '飛機：2組以上の連続三枚（2とジョーカーを含まない）。',
          '飛機帯翅膀：飛機+同数の単牌または対子。',
          '四帯二単：四枚+単牌2枚；四帯二対：四枚+対子2組。',
          '炸弾：同値4枚；火箭：大王+小王。',
        ],
      },
      {
        heading: '⚖ 強さ比較',
        items: [
          '火箭 > 炸弾 > 通常の役。',
          '炸弾同士は同枚数でランクを比較。',
          '通常の役は種類と枚数が一致する場合のみ比較可能。最大カードで判定。',
          'フォロー時は同じ役でより強いか、炸弾/火箭で潰す必要があります。',
        ],
      },
      {
        heading: '💰 倍率と計算',
        items: [
          '合計倍率 = 叫分 × 場の倍率 × 炸弾倍率 × 春天倍率。',
          '炸弾1枚ごとに×2（累積）、火箭は×4。',
          '春天：地主が先に出し切り、農民が1枚も出していない ×2。',
          '反春天：農民が先に出し切り、地主が最初の1手しか出していない ×2。',
          '場の倍率：初級×1、低級×2、中級×5、高級×10。',
          '単位 = 合計倍率 × 場の倍率 × 10コイン。地主は2単位、農民は各1単位で精算。',
        ],
      },
      {
        heading: '🎮 3つの対戦モード',
        items: [
          '人vs AI：あなたと2体のAI。役割はせりで決定。',
          '固定農民：あなたは農民固定、AI農民と組みAI地主と対戦。',
          'AI観戦：3体のAIが自動対戦。思考表示、速度（1×/2×/4×）、一時停止、ステップ実行が可能。',
        ],
      },
      {
        heading: '🤖 AIとその他の機能',
        items: [
          'AIはLLM（OpenAI/Claude/Gemini、ネイティブ・互換エンドポイント）で判断します。',
          '不正な応答が3回連続するとルールベースAIに切り替わり「AI低下中」と表示されます。',
          '120秒無応答で自動停止し通知。モデル再読込かターンスキップが可能。',
          '任意のAI席の操作、視点切替、AIへの返却がいつでも可能。',
          '設定：接続テスト、モデル一覧、音量、テーマ/言語、バックアップ/復元（モデル設定を含む）。',
        ],
      },
    ],
  },

  fr: {
    sections: [
      {
        heading: '📋 Règles de base',
        items: [
          'Paquet de 54 cartes (grands et petits jokers) : 3 joueurs reçoivent 17 cartes, 3 cartes de réserve.',
          'Le meilleur enchérisseur devient Propriétaire et prend les 3 cartes de réserve (20 au total) ; les autres sont Fermiers.',
          '1 Propriétaire contre 2 Fermiers. Le camp qui vide sa main en premier gagne.',
          'Ordre : Grand joker > Petit joker > 2 > A > K > Q > J > 10 > 9 > … > 3.',
          'Les enseignes (pique, cœur, trèfle, carreau) servent à l’affichage et n’influencent pas la valeur.',
        ],
      },
      {
        heading: '🗳 Enchères',
        items: [
          'À partir d’un premier joueur aléatoire, enchérissez dans l’ordre antihoraire : 1, 2, 3 ou passe.',
          'Vous ne pouvez qu’enchérir plus haut que le maximum actuel, ou passer.',
          'Une enchère de 3 termine immédiatement et désigne le Propriétaire ; sinon le plus haut l’emporte.',
          'Si les trois passent, le premier joueur est forcé d’enchérir 1 et devient Propriétaire.',
          'En mode Fermier fixe vous ne pouvez pas être Propriétaire — c’est toujours une IA.',
        ],
      },
      {
        heading: '🃏 Types de combinaison (13)',
        items: [
          'Simple ; Paire (deux cartes égales) ; Brelan (trois cartes égales).',
          'Brelan+1 : brelan + une carte ; Brelan+Paire : brelan + une paire.',
          'Suite : 5+ simples consécutives (ni 2 ni jokers).',
          'Double suite : 3+ paires consécutives (ni 2 ni jokers).',
          'Avion : 2+ brelans consécutifs (ni 2 ni jokers).',
          'Avion avec ailes : avion + nombre égal de simples ou de paires.',
          'Carré+2 simples : carré + deux cartes ; Carré+2 paires : carré + deux paires.',
          'Bombe : quatre cartes égales ; Fusée : grand + petit joker.',
        ],
      },
      {
        heading: '⚖ Comparaison',
        items: [
          'Fusée > Bombe > combinaisons normales.',
          'Les bombes se comparent par valeur (même nombre de cartes).',
          'Les combinaisons normales doivent avoir même type et même nombre ; on compare la carte la plus haute.',
          'Pour suivre, jouez le même type mais supérieur, ou battez avec une Bombe / Fusée.',
        ],
      },
      {
        heading: '💰 Multiplicateurs et score',
        items: [
          'Multiplicateur total = enchère × multiplicateur de table × bombes × printemps.',
          'Chaque Bombe ×2 (cumulatif) ; la Fusée ×4.',
          'Printemps : le Propriétaire vide en premier sans qu’un Fermier ait joué — ×2.',
          'Contre-printemps : un Fermier vide en premier et le Propriétaire n’a joué qu’une fois — ×2.',
          'Tables : Débutant ×1, Bas ×2, Moyen ×5, Haut ×10.',
          'Unité = multiplicateur total × multiplicateur de table × 10 pièces ; le Propriétaire règle 2, chaque Fermier 1.',
        ],
      },
      {
        heading: '🎮 Trois modes',
        items: [
          'Humain vs IA : vous contre deux IAs ; les rôles dépendent des enchères.',
          'Fermier fixe : vous êtes toujours Fermier, allié à une IA fermière contre le Propriétaire IA.',
          'Spectateur IA : trois IAs jouent seules ; raisonnement, vitesse (1×/2×/4×), pause et pas à pas.',
        ],
      },
      {
        heading: '🤖 IA et fonctions',
        items: [
          'L’IA décide via un modèle de langage (OpenAI / Claude / Gemini, endpoints natifs ou compatibles).',
          'Après 3 réponses invalides de suite, une IA de règles prend le relais (« IA dégradée »).',
          'Aucune réponse après 120 s : pause automatique avec alerte, rechargez le modèle ou sautez le tour.',
          'Prenez n’importe quel siège IA à tout moment, changez de vue, ou rendez le siège à l’IA.',
          'Réglages : test de connexion, liste de modèles, volume, thèmes/langues, sauvegarde/restauration (config incluse).',
        ],
      },
    ],
  },

  ru: {
    sections: [
      {
        heading: '📋 Основные правила',
        items: [
          'Колода 54 карты (большой и малый джокер): 3 игрока получают по 17, остаются 3 карты прикупа.',
          'Давший наибольшую ставку становится Помещиком и берёт 3 карты прикупа (всего 20); остальные — Крестьяне.',
          '1 Помещик против 2 Крестьян. Побеждает сторона, первой опустевшая в руке.',
          'Порядок: большой джокер > малый джокер > 2 > А > К > Q > J > 10 > 9 > … > 3.',
          'Масти (пика, черви, трефы, бубны) только для показа и не влияют на старшинство.',
        ],
      },
      {
        heading: '🗳 Торги',
        items: [
          'Начиная со случайного первого игрока, торги идут против часовой стрелки: 1, 2, 3 или пас.',
          'Можно ставить только выше текущего максимума или пасовать.',
          'Ставка 3 сразу завершает торги и делает игрока Помещиком; иначе выигрывает высшая ставка.',
          'Если все трое спасовали, первый игрок вынужден поставить 1 и стать Помещиком.',
          'В режиме Фиксированный крестьянин вы не станете Помещиком — им всегда будет ИИ.',
        ],
      },
      {
        heading: '🃏 Комбинации (13)',
        items: [
          'Сингл; Пара (две равные); Тройка (три равные).',
          'Тройка+1: тройка + одна карта; Тройка+пара: тройка + пара.',
          'Стрит: 5+ последовательных синглов (без 2 и джокеров).',
          'Двойной стрит: 3+ последовательные пары (без 2 и джокеров).',
          'Самолёт: 2+ последовательные тройки (без 2 и джокеров).',
          'Самолёт с крыльями: самолёт + равное число синглов или пар.',
          'Четвёрка+2 сингла: четвёрка + две карты; Четвёрка+2 пары: четвёрка + две пары.',
          'Бомба: четыре равные карты; Ракета: большой + малый джокер.',
        ],
      },
      {
        heading: '⚖ Сравнение',
        items: [
          'Ракета > Бомба > обычные комбинации.',
          'Бомбы сравниваются по рангу (равное число карт).',
          'Обычные комбинации должны совпадать по типу и числу карт; сравнивается старшая карта.',
          'Чтобы перебить, сыграйте тот же тип, но старше, либо Бомбу / Ракету.',
        ],
      },
      {
        heading: '💰 Множители и счёт',
        items: [
          'Общий множитель = ставка × множитель стола × бомбы × весна.',
          'Каждая Бомба ×2 (накопительно); Ракета ×4.',
          'Весна: Помещик опустел первым, а крестьяне не сыграли ни карты — ×2.',
          'Антивесна: крестьянин опустел первым, а Помещик сыграл лишь один раз — ×2.',
          'Столы: Новичок ×1, Низкий ×2, Средний ×5, Высокий ×10.',
          'Единица = общий множитель × множитель стола × 10 монет; Помещик — 2 единицы, каждый крестьянин — 1.',
        ],
      },
      {
        heading: '🎮 Три режима',
        items: [
          'Человек против ИИ: вы против двух ИИ; роли решают торги.',
          'Фиксированный крестьянин: вы всегда крестьянин, в команде с ИИ против ИИ-Помещика.',
          'Наблюдение ИИ: три ИИ играют сами; видны рассуждения, скорость (1×/2×/4×), пауза и шаги.',
        ],
      },
      {
        heading: '🤖 ИИ и функции',
        items: [
          'Решения ИИ принимает языковая модель (OpenAI / Claude / Gemini, нативные или совместимые точки).',
          'После 3 неверных ответов подряд включается правило́вая ИИ с пометкой «ИИ понижен».',
          'Нет ответа 120 с — авто-пауза с предупреждением; можно перезагрузить модель или пропустить ход.',
          'Можно занять любое место ИИ, переключить вид или вернуть место ИИ.',
          'Настройки: проверка соединения, список моделей, громкость, темы/языки, бэкап/восстановление (включая конфиг).',
        ],
      },
    ],
  },

  ko: {
    sections: [
      {
        heading: '📋 기본 규칙',
        items: [
          '총 54장(조커 2장 포함). 3명의 플레이어가 17장씩 받고, 3장이 바닥패(뒷패).',
          '가장 높은 점수를 부른 사람이 지주가 되어 3장의 바닥패를 가져갑니다(총 20장). 나머지 2명은 농부.',
          '지주 1명 대 농부 2명. 먼저 손패를 비운 쪽이 승리합니다.',
          '서열: 왕조커 > 작은조커 > 2 > A > K > Q > J > 10 > 9 > … > 3.',
          '무늬(스페이드·하트·클럽·다이아)는 표시용이며 크기에 영향하지 않습니다.',
        ],
      },
      {
        heading: '🗳 부르기(叫分)',
        items: [
          '임의의 선플레이어부터 반시계 방향으로 1, 2, 3점 또는 스킵.',
          '현재 최고점보다 높은 점을 부르거나 스킵만 할 수 있습니다.',
          '3점을 부르면 즉시 지주로 확정. 그 외에는 최고점자가 지주.',
          '3명 모두 스킵하면 첫 플레이어가 1점으로 지주가 됩니다.',
          '고정 농부 모드에서는 당신은 지주가 될 수 없고 지주는 항상 AI입니다.',
        ],
      },
      {
        heading: '🃏 족보 (총 13종)',
        items: [
          '싱글 / 페어(같은 값 2장) / 트리플(같은 값 3장).',
          '트리플+1: 트리플 + 싱글 1장; 트리플+페어: 트리플 + 페어 1조.',
          '스트레이트: 5장 이상 연속 싱글(2와 조커 제외).',
          '더블 스트레이트: 3조 이상 연속 페어(2와 조커 제외).',
          '비행기: 2조 이상 연속 트리플(2와 조커 제외).',
          '비행기 날개: 비행기 + 같은 수의 싱글 또는 페어.',
          '포카드+2싱글: 포카드 + 싱글 2장; 포카드+2페어: 포카드 + 페어 2조.',
          '폭탄: 같은 값 4장; 로켓: 왕조커 + 작은조커.',
        ],
      },
      {
        heading: '⚖ 크기 비교',
        items: [
          '로켓 > 폭탄 > 일반 족보.',
          '폭탄끼리는 같은 장수에서 랭크로 비교.',
          '일반 족보는 종류와 장수가 같을 때만 비교 가능하며 최고 카드로 판정.',
          '받을 때는 같은 족보 중 더 높은 카드를 내거나 폭탄/로켓으로 제압해야 합니다.',
        ],
      },
      {
        heading: '💰 배율과 점수',
        items: [
          '총 배율 = 부른 점수 × 방 배율 × 폭탄 배율 × 봄 배율.',
          '폭탄 하나마다 ×2(누적), 로켓은 ×4.',
          '봄: 지주가 먼저 비우고 농부가 한 장도 내지 않음 ×2.',
          '역봄: 농부가 먼저 비우고 지주가 첫 패만 냄 ×2.',
          '방 배율: 초급 ×1, 저급 ×2, 중급 ×5, 고급 ×10.',
          '단위 = 총 배율 × 방 배율 × 10 코인; 지주는 2단위, 농부는 각 1단위로 정산.',
        ],
      },
      {
        heading: '🎮 세 가지 대전 모드',
        items: [
          '인간 vs AI: 당신과 두 AI. 역할은 부르기로 결정.',
          '고정 농부: 당신은 농부 고정, AI 농부와 팀을 이뤄 AI 지주와 대전.',
          'AI 관전: 세 AI가 자동 대전. 사고 표시, 속도(1×/2×/4×), 일시정지, 단계 실행 가능.',
        ],
      },
      {
        heading: '🤖 AI 및 기타 기능',
        items: [
          'AI는 LLM(OpenAI / Claude / Gemini, 네이티브·호환 엔드포인트)으로 결정합니다.',
          '잘못된 응답이 3번 연속이면 규칙 기반 AI로 전환되며 “AI 저하”로 표시됩니다.',
          '120초 무응답 시 자동 일시정지되며 모델 재로딩 또는 턴 스킵이 가능합니다.',
          '언제든 AI 자리 takeover, 시점 전환, AI로 반환이 가능합니다.',
          '설정: 연결 테스트, 모델 목록, 음량, 테마/언어, 백업/복원(모델 설정 포함).',
        ],
      },
    ],
  },

  ar: {
    sections: [
      {
        heading: '📋 القواعد الأساسية',
        items: [
          'رزمة من 54 بطاقة (الجوكر الكبير والصغير): يأخذ كل لاعب 17 بطاقة، وتبقى 3 بطاقات سفلية.',
          'صاحب أعلى مزايدة يصبح المالك ويأخذ البطاقات السفلية الثلاث (20 إجماليًا) والباقون فلاحون.',
          'مالك واحد ضد فلاحَين. يفوز الطرف الذي يُفرغ يده أولًا.',
          'ترتيب البطاقات: الجوكر الكبير > الصغير > 2 > A > K > Q > J > 10 > 9 > … > 3.',
          'الألوان (سباتي/قلب/سبايكي/ديمن) للعرض فقط ولا تؤثر على قيمة البطاقة.',
        ],
      },
      {
        heading: '🗳 المزايدة',
        items: [
          'بدءًا من لاعب أول عشوائي، تتم المزايدة بعكس اتجاه عقارب الساعة: 1 أو 2 أو 3 أو تمرير.',
          'يمكنك المزايدة أعلى من الحد الحالي فقط، أو التمرير.',
          'مزايدة 3 تنهي فورًا وتجعل اللاعب مالكًا؛ وإلا يفوز صاحب أعلى مزايدة.',
          'إذا مرّر الثلاثة، يُجبر أول لاعب على المزايدة بـ1 ويصبح مالكًا.',
          'في وضع الفلاح الثابت لن تكون المالك أبدًا — يكون المالك ذكاءً اصطناعيًا دائمًا.',
        ],
      },
      {
        heading: '🃏 أنواع الورق (13)',
        items: [
          'مفردة؛ زوج (بطاقتان متساويتان)؛ ثلاثية (ثلاث بطاقات متساوية).',
          'ثلاثية+مفردة: ثلاثية + بطاقة واحدة؛ ثلاثية+زوج: ثلاثية + زوج.',
          'سلسلة: 5+ مفردات متتالية (بدون 2 والجوكر).',
          'سلسلة أزواج: 3+ أزواج متتالية (بدون 2 والجوكر).',
          'طائرة: 2+ ثلاثيات متتالية (بدون 2 والجوكر).',
          'طائرة بأجنحة: طائرة + عدد مساوٍ من المفردات أو الأزواج.',
          'أربعة+مفردتان: أربعة + بطاقتان؛ أربعة+زوجان: أربعة + زوجان.',
          'قنبلة: أربع بطاقات متساوية؛ صاروخ: الجوكر الكبير + الصغير.',
        ],
      },
      {
        heading: '⚖ المقارنة',
        items: [
          'الصاروخ > القنبلة > الأنواع العادية.',
          'تُقارن القنابل حسب الرتبة (نفس عدد البطاقات).',
          'الأنواع العادية يجب أن تتطابق في النوع والعدد، وتُقارن أعلى بطاقة.',
          'للرد، العب النوع نفسه لكن أكبر، أو اهزم بالقنبلة / الصاروخ.',
        ],
      },
      {
        heading: '💰 المضاعفات والنقاط',
        items: [
          'المضاعف الإجمالي = المزايدة × مضاعف الصالة × القنابل × الربيع.',
          'كل قنبلة تضاعف ×2 (تراكمي) والصاروخ ×4.',
          'الربيع: يُفرغ المالك أولًا دون أن يلعب فلاح أي بطاقة — ×2.',
          'الربيع العكسي: يُفرغ فلاح أولًا ولم يلعب المالك إلا اليد الأولى — ×2.',
          'مضاعفات الصالات: مبتدئ ×1، منخفض ×2، متوسط ×5، مرتفع ×10.',
          'الوحدة = المضاعف الإجمالي × مضاعف الصالة × 10 عملات؛ المالك يُسوّي 2 وحدات وكل فلاح وحدة واحدة.',
        ],
      },
      {
        heading: '🎮 ثلاثة أوضاع',
        items: [
          'إنسان ضد الذكاء: تلعب ضد ذكاءين؛ تُحدد الأدوار بالمزايدة.',
          'فلاح ثابت: تكون فلاحًا دائمًا، مع فلاح ذكاء ضد المالك الذكاء.',
          'مشاهدة الذكاء: ثلاثة أذكياء يلعبون تلقائيًا؛ مع عرض التفكير والسرعة (1×/2×/4×) والإيقاف والخطوة.',
        ],
      },
      {
        heading: '🤖 الذكاء والميزات',
        items: [
          'يقرر الذكاء عبر نموذج لغوي (OpenAI / Claude / Gemini، نقاط أصلية أو متوافقة).',
          'بعد 3 ردود غير صالحة متتالية يتحول إلى ذكاء قائم على القواعد مع علامة «خفض الأداء».',
          'انعدام الرد لمدة 120 ثانية يوقف اللعبة تلقائيًا مع تنبيه؛ أعد تحميل النموذج أو تخطَّ الدور.',
          'يمكنك تولي أي مقعد ذكاء في أي وقت، أو تبديل العرض، أو إعادة المقعد للذكاء.',
          'الإعدادات: اختبار الاتصال، قائمة النماذج، مستوى الصوت، السمات/اللغات، النسخ/الاستعادة (تشمل إعداد النموذج).',
        ],
      },
    ],
  },
};

export function getRulesContent(lang: string): RulesContent {
  return RULES_CONTENT[lang] || RULES_CONTENT['zh-CN'];
}
