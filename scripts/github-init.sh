#!/usr/bin/env bash
# ============================================================================
# 将本项目作为 GitHub「新仓库」上传（在【本机】执行，不要在沙箱内运行）
#
# 由于沙箱阻断到 github.com 的 TLS，无法在 AI 环境内直接 git push。
# 本脚本用于你在本机手动执行，完成：建库 → 初始化 → 提交 → 推送。
#
# 用法：
#   export GH_PAT=ghp_你的GitHubPersonalAccessToken
#   bash scripts/github-init.sh [仓库名] [仓库描述]
#
# 说明：
#   - 仓库名默认 landlord-ai，描述默认中文简介
#   - 需要 token 具备 repo 权限（classic PAT 勾选 repo 即可）
#   - 若同名仓库已存在，会自动忽略创建错误并继续推送
# ============================================================================
set -euo pipefail

REPO_NAME="${1:-landlord-ai}"
REPO_DESC="${2:-AI 驱动的智能斗地主桌面游戏（严格还原《欢乐斗地主》），含模型配置中心、15 套主题、完整音效与 AI 互动系统}"
GH_PAT="${GH_PAT:-${GITHUB_TOKEN:-}}"

if [ -z "$GH_PAT" ]; then
  echo "错误：未设置 GH_PAT 环境变量（GitHub Personal Access Token）。"
  echo "请先执行： export GH_PAT=ghp_你的token"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "错误：未检测到 curl，请先安装 curl。"
  exit 1
fi

# 推断当前 GitHub 用户名
USER_NAME=$(curl -s -H "Authorization: Bearer $GH_PAT" https://api.github.com/user \
  | grep '"login"' | head -1 | sed -E 's/.*"login": *"([^"]+)".*/\1/')
if [ -z "$USER_NAME" ]; then
  echo "错误：无法获取 GitHub 用户名，请检查 GH_PAT 是否正确 / 网络是否可达。"
  exit 1
fi
echo "GitHub 用户: $USER_NAME"

# 创建仓库（已存在则忽略错误）
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $GH_PAT" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false,\"has_issues\":true,\"has_projects\":true,\"has_wiki\":true}" \
  https://api.github.com/user/repos)
echo "创建仓库返回 HTTP: $HTTP_CODE（201=新建，422=已存在，均可继续）"

# 初始化并推送
git init -q 2>/dev/null || true
git remote remove origin 2>/dev/null || true
git remote add origin "https://$GH_PAT@github.com/$USER_NAME/$REPO_NAME.git"
git add -A
git commit -m "初始提交：弈牌AI（模型配置中心 / 15主题 / 完整音效 / AI互动）" || echo "（无新变更，跳过提交）"
git branch -M main
git push -u origin main --force
echo "完成：https://github.com/$USER_NAME/$REPO_NAME"
