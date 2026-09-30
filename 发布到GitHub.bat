@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   蔚县剪纸网页版 - 一键发布到 GitHub
echo ================================================
echo.

rem ---- 检查 git 配置（首次需要填写一次） ----
git config user.name >nul 2>&1
if errorlevel 1 goto askname
git config user.email >nul 2>&1
if errorlevel 1 goto askemail
goto ready

:askname
set /p GNAME=请输入你的 GitHub 用户名:
git config user.name "%GNAME%"
:askemail
set /p GEMAIL=请输入你的 GitHub 邮箱:
git config user.email "%GEMAIL%"

:ready
rem ---- 初始化并提交 ----
if not exist .git git init
git add .
git commit -m "蔚县剪纸网页版 v1.0"
git branch -M main

rem ---- 绑定远程仓库 ----
echo.
echo 请先在浏览器打开 https://github.com/new 新建一个【空仓库】
echo （仓库名建议 weixian-jianzhi-web，不要勾选任何初始化选项）
echo 创建后复制仓库地址，例如: https://github.com/你的用户名/weixian-jianzhi-web.git
echo.
set /p REPO=粘贴仓库地址后回车:
git remote remove origin 2>nul
git remote add origin "%REPO%"

rem ---- 推送 ----
git push -u origin main

echo.
echo ================================================
echo   推送完成！接下来 3 步开启网页：
echo   1. 打开 https://github.com/你的用户名/weixian-jianzhi-web/settings/pages
echo   2. Source 选择 main 分支 → Save
echo   3. 等 1-2 分钟，访问 https://你的用户名.github.io/weixian-jianzhi-web/
echo.
echo   之后把该网址填入草料二维码 https://cli.im 即可生成二维码
echo ================================================
pause
