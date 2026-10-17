@echo off
REM ============================================================================
REM 将本项目作为 GitHub「新仓库」上传（在【本机】执行，不要在沙箱内运行）
REM
REM 由于沙箱阻断到 github.com 的 TLS，无法在 AI 环境内直接 git push。
REM 本脚本用于你在本机手动执行，完成：建库 -> 初始化 -> 提交 -> 推送。
REM
REM 用法（cmd / PowerShell 均可）：
REM   set GH_PAT=ghp_你的GitHubPersonalAccessToken
REM   scripts\github-init.cmd [仓库名] [仓库描述]
REM
REM 说明：
REM   - 仓库名默认 landlord-ai
REM   - 需要 token 具备 repo 权限（classic PAT 勾选 repo 即可）
REM   - 若同名仓库已存在，会忽略创建错误并继续推送
REM ============================================================================

setlocal EnableDelayedExpansion

set "REPO_NAME=%~1"
if "%REPO_NAME%"=="" set "REPO_NAME=landlord-ai"

set "REPO_DESC=%~2"
if "%REPO_DESC%"=="" set "REPO_DESC=AI 驱动的智能斗地主桌面游戏（严格还原《欢乐斗地主》），含模型配置中心、15 套主题、完整音效与 AI 互动系统"

if "%GH_PAT%"=="" (
  echo 错误：未设置 GH_PAT 环境变量（GitHub Personal Access Token）。
  echo 请先执行： set GH_PAT=ghp_你的token
  exit /b 1
)

where curl >nul 2>nul
if errorlevel 1 (
  echo 错误：未检测到 curl，请先安装 curl 或使用 Git Bash 运行 github-init.sh。
  exit /b 1
)

REM 推断当前 GitHub 用户名
for /f "tokens=*" %%u in ('curl -s -H "Authorization: Bearer %GH_PAT%" https://api.github.com/user ^| findstr /C:"\"login\""') do (
  set "LINE=%%u"
)
set "USER_NAME="
for /f "tokens=2 delims=:," %%a in ("!LINE!") do set "USER_NAME=%%a"
set "USER_NAME=!USER_NAME:"=!"
set "USER_NAME=!USER_NAME: =!"

if "!USER_NAME!"=="" (
  echo 错误：无法获取 GitHub 用户名，请检查 GH_PAT 是否正确 / 网络是否可达。
  exit /b 1
)
echo GitHub 用户: !USER_NAME!

REM 创建仓库（忽略错误）
curl -s -o nul -w "创建仓库 HTTP: %%{http_code}（201=新建，422=已存在，均可继续）\n" -X POST ^
  -H "Authorization: Bearer %GH_PAT%" ^
  -H "Accept: application/vnd.github+json" ^
  -d "{\"name\":\"%REPO_NAME%\",\"description\":\"%REPO_DESC%\",\"private\":false,\"has_issues\":true,\"has_projects\":true,\"has_wiki\":true}" ^
  https://api.github.com/user/repos

REM 初始化并推送
git init -q 2>nul
git remote remove origin 2>nul
git remote add origin https://%GH_PAT%@github.com/!USER_NAME!/%REPO_NAME%.git
git add -A
git commit -m "初始提交：弈牌AI（模型配置中心 / 15主题 / 完整音效 / AI互动）" || echo （无新变更，跳过提交）
git branch -M main
git push -u origin main --force
echo 完成：https://github.com/!USER_NAME!/%REPO_NAME%
endlocal
