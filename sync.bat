@echo off
chcp 65001 >nul
echo ========================================
echo 同步到 Gitea
echo ========================================
echo.

echo [1/4] 检查本地和 Gitea 是否匹配...
git fetch gitea >nul 2>&1
set diff_output=
for /f "delims=" %%i in ('git diff main gitea/main') do set diff_output=%%i
if defined diff_output (
    echo [提示] 本地和 Gitea 不匹配，准备同步...
) else (
    echo [提示] 本地和 Gitea 已匹配，无需同步
    goto :end
)
echo.

echo [2/4] 添加所有修改的文件...
git add .
if %errorlevel% neq 0 (
    echo [错误] 添加文件失败
    pause
    exit /b 1
)
echo [完成] 文件已添加
echo.

echo [3/4] 提交修改...
set commit_message=update: %date:~0,10% %time:~0,8%
git commit -m "%commit_message%"
if %errorlevel% neq 0 (
    echo [提示] 没有需要提交的修改
    goto :push
)
echo [完成] 提交成功
echo.

:push
echo [4/4] 推送到 Gitea...
git push gitea main
if %errorlevel% neq 0 (
    echo [错误] 推送失败
    pause
    exit /b 1
)
echo [完成] 推送成功
echo.

echo ========================================
echo 验证同步结果...
echo ========================================
git fetch gitea >nul 2>&1
set diff_output=
for /f "delims=" %%i in ('git diff main gitea/main') do set diff_output=%%i
if defined diff_output (
    echo [警告] 同步后仍然不匹配，请检查！
) else (
    echo [成功] 本地和 Gitea 已完全匹配！
)
echo.

:end
echo ========================================
echo 同步完成
echo ========================================
pause
