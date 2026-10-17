/**
 * 通过 GitHub Git Database REST API 推送代码（绕过 github.com 的 CONNECT 封锁）
 *
 * 适用场景：当前网络环境代理只允许 api.github.com，禁止 github.com 的 git 协议隧道。
 * 流程：先用 Contents API 给空仓库播种首个 commit（本脚本假设已完成，或自动补种），
 * 再通过 REST API 逐文件创建 blob → tree → commit（基于当前 main）→ PATCH 更新 main。
 *
 *   export GH_PAT=ghp_你的token
 *   node scripts/push-via-api.mjs
 *
 * 依赖：Node.js + curl（curl 借用系统代理访问 api.github.com）。
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const PAT = process.env.GH_PAT;
if (!PAT) {
  console.error('错误：请先设置环境变量 GH_PAT（GitHub Personal Access Token）');
  process.exit(1);
}

const REPO = process.env.GH_REPO || 'qufang888/landlord-ai';
const API = `https://api.github.com/repos/${REPO}`;
const COMMIT_MSG = process.env.GH_COMMIT_MSG ||
  '初始提交：弈牌AI（模型配置中心 / 15 主题 / 完整音效 / AI 互动系统）';

function api(method, path, body, accept = 'application/vnd.github+json') {
  const input = body ? JSON.stringify(body) : '';
  const out = execSync(
    `curl -sS -X ${method} ` +
    `-H "Authorization: Bearer ${PAT}" ` +
    `-H "Accept: ${accept}" ` +
    `-H "Content-Type: application/json" ` +
    `-H "User-Agent: push-via-api" ` +
    `-d @- "${API}${path}"`,
    { input, maxBuffer: 200 * 1024 * 1024, encoding: 'utf8' }
  );
  const text = out.toString();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!json || json.message === 'Git Repository is empty.') {
    // 空仓库：先用 Contents API 播种一个初始 commit
    if (json && json.message === 'Git Repository is empty.') {
      console.log('仓库为空，先用 Contents API 播种初始 commit...');
      execSync(
        `curl -sS -X PUT ` +
        `-H "Authorization: Bearer ${PAT}" ` +
        `-H "Accept: ${accept}" -H "Content-Type: application/json" ` +
        `-d '{"message":"chore: seed","content":"aW5pdA==","branch":"main"}' ` +
        `"${API}/contents/.gitkeep"`,
        { encoding: 'utf8' }
      );
      return api(method, path, body, accept);
    }
    console.error(`API ${method} ${path} 失败：`, text.slice(0, 300));
    process.exit(1);
  }
  if (json.message && (json.message.includes('rate limit') || json.errors)) {
    console.error(`API ${method} ${path} 失败：`, text.slice(0, 300));
    process.exit(1);
  }
  return json;
}

// 取已 git 跟踪的文件（自动排除 node_modules / dist 等被 .gitignore 忽略的内容）
const files = execSync('git ls-files', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
console.log(`跟踪到 ${files.length} 个文件，开始创建 blob...`);

const treeEntries = [];
for (const f of files) {
  const buf = readFileSync(f);
  const b64 = buf.toString('base64');
  const res = api('POST', '/git/blobs', { content: b64, encoding: 'base64' });
  treeEntries.push({ path: f, mode: '100644', type: 'blob', sha: res.sha });
  process.stderr.write(`  blob ✓ ${f}\n`);
}

// 当前 main 作为父提交
const refInfo = api('GET', '/git/refs/heads/main');
const parentSha = refInfo.object.sha;
console.log('父提交:', parentSha);

console.log('创建 tree...');
const tree = api('POST', '/git/trees', { tree: treeEntries });

console.log('创建 commit...');
const commit = api('POST', '/git/commits', {
  message: COMMIT_MSG,
  tree: tree.sha,
  parents: [parentSha],
});

console.log('更新 refs/heads/main...');
const ref = api('PATCH', '/git/refs/heads/main', { sha: commit.sha, force: true });

console.log('完成！');
console.log('  commit:', commit.sha);
console.log('  ref   :', ref.ref);
console.log('  URL   : https://github.com/' + REPO);
