/**
 * TTS 批量生成报牌语音脚本
 * 使用 edge-tts 生成所有牌型语音到 assets/audio/voice/
 *
 * 使用前安装: npm install edge-tts
 * 运行: npm run generate:voice
 */

import * as fs from 'fs';
import * as path from 'path';

// edge-tts 的 TypeScript 类型可能缺失，用 any 绕过
// @ts-ignore
import edgeTTS from 'edge-tts';

const VOICE_TEXT_MAP: Record<string, string> = {
  // 单牌
  'single_3': '三',
  'single_4': '四',
  'single_5': '五',
  'single_6': '六',
  'single_7': '七',
  'single_8': '八',
  'single_9': '九',
  'single_10': '十',
  'single_J': '勾',
  'single_Q': '圈',
  'single_K': 'K',
  'single_A': '尖',
  'single_2': '二',
  'single_joker_small': '小王',
  'single_joker_big': '大王',
  // 牌型
  'pair': '一对',
  'triple': '三个',
  'triple_with_one': '三带一',
  'triple_with_pair': '三带一对',
  'straight': '顺子',
  'double_straight': '连对',
  'plane': '飞机',
  'plane_with_wings': '飞机带翅膀',
  'bomb': '炸弹！',
  'rocket': '王炸！！',
  'four_with_two': '四带二',
  // 嘲讽
  'taunt_bomb': '炸死你！',
  'taunt_no_play': '要不起吧？',
  'taunt_last_cards': '我就剩两张牌了~',
  'taunt_take_that': '管上！',
};

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'voice');

async function generateVoice(text: string, outputPath: string, voice: string = 'zh-CN-XiaoxiaoNeural') {
  const tts = new edgeTTS.Communicate(text, voice);
  await tts.save(outputPath);
  console.log(`生成: ${path.basename(outputPath)} → "${text}"`);
}

async function main() {
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`开始生成语音文件到: ${OUTPUT_DIR}\n`);

  for (const [filename, text] of Object.entries(VOICE_TEXT_MAP)) {
    const outputPath = path.join(OUTPUT_DIR, `${filename}.mp3`);
    try {
      await generateVoice(text, outputPath);
    } catch (err) {
      console.error(`生成失败: ${filename}`, err);
    }
  }

  console.log('\n全部语音生成完成！');
  console.log('注意: 当前为 mp3 格式，如需 ogg 可用 ffmpeg 批量转换:');
  console.log('  for %f in (*.mp3) do ffmpeg -i "%f" "%~nf.ogg"');
}

main().catch(console.error);
