@echo off
chcp 65001 >nul
title Publicando FormatMail Pro no GitHub
echo ====================================================
echo   Publicando FormatMail Pro no GitHub
echo   Repositorio: https://github.com/gtsistemastech-web/formatacao
echo ====================================================
echo.
cd /d "%~dp0"
echo Verificando arquivos...
git status
echo.
echo Enviando para o GitHub (branch main)...
git push -u origin main --force
echo.
if %ERRORLEVEL% equ 0 (
    echo ====================================================
    echo  [SUCESSO] Arquivos enviados com sucesso!
    echo ====================================================
    echo Agora seu repositorio ja esta com todos os arquivos.
) else (
    echo [AVISO] Houve uma falha no envio. Se pediu login, confirme a janela do navegador.
)
echo.
pause
