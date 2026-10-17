@echo off
rem Publication de L'Archive du Neant sur GitHub Pages, en un double-clic.
rem Ce fichier doit rester dans le dossier du jeu, a cote de index.html.
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "GH_USER=azertyuser09876-spec"
set "GH_REPO=Archive-du-N-ant"
set "REPO=%GH_USER%/%GH_REPO%"
set "REMOTE=https://github.com/%GH_USER%/%GH_REPO%.git"
set "SITE=https://%GH_USER%.github.io/%GH_REPO%/"
set "HAVE_GH="
set "GH_ID="
set "NEW_PAGES="
set "RUN_EVENT="

title L’Archive du Néant · publication sur GitHub
echo.
echo  ================================================
echo    L’Archive du Néant · publication sur GitHub
echo  ================================================
echo    Compte : %GH_USER%
echo    Dépôt  : %GH_REPO%
echo    Site   : %SITE%
echo.

if not exist "index.html" (
  echo  [Erreur] Ce fichier doit rester dans le dossier du jeu, à côté de index.html.
  goto :erreur
)

rem ============ 1. Git ============
where git >nul 2>nul
if not errorlevel 1 goto :git_ok
if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul
if not errorlevel 1 goto :git_ok
echo  Git n’est pas installé. Il sert à envoyer les fichiers vers GitHub.
where winget >nul 2>nul
if errorlevel 1 goto :git_manuel
choice /c ON /n /m " Installer Git maintenant ? [O]ui / [N]on : "
if errorlevel 2 goto :git_manuel
winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul
if not errorlevel 1 goto :git_ok
echo  Git est installé, mais cette fenêtre ne le voit pas encore.
echo  Fermez-la et relancez le script.
goto :erreur
:git_manuel
echo  Installez Git depuis la page qui s’ouvre (options par défaut), puis relancez ce script.
start "" "https://git-scm.com/download/win"
goto :erreur
:git_ok

rem ============ 2. GitHub CLI (facultatif) ============
rem Avec lui, le script crée le dépôt et active la publication tout seul.
if exist "%ProgramFiles%\GitHub CLI\gh.exe" set "PATH=%ProgramFiles%\GitHub CLI;%PATH%"
where gh >nul 2>nul
if not errorlevel 1 goto :gh_ok
echo  GitHub CLI n’est pas installé. Avec lui, tout est automatique ;
echo  sans lui, le script vous guidera dans le navigateur (deux clics).
where winget >nul 2>nul
if errorlevel 1 goto :sans_gh
choice /c ON /n /m " Installer GitHub CLI maintenant ? [O]ui / [N]on : "
if errorlevel 2 goto :sans_gh
winget install --id GitHub.cli -e --source winget --accept-source-agreements --accept-package-agreements
if exist "%ProgramFiles%\GitHub CLI\gh.exe" set "PATH=%ProgramFiles%\GitHub CLI;%PATH%"
where gh >nul 2>nul
if not errorlevel 1 goto :gh_ok
:sans_gh
echo  On continue sans GitHub CLI.
echo.
goto :depot_local

:gh_ok
set "HAVE_GH=1"
gh auth status >nul 2>nul
if not errorlevel 1 goto :gh_compte
echo.
echo  Connexion à GitHub : une page va s’ouvrir dans le navigateur.
echo  Recopiez-y le code affiché ci-dessous, puis autorisez GitHub CLI.
gh auth login --hostname github.com --git-protocol https --web
if errorlevel 1 goto :erreur
:gh_compte
set "GH_LOGIN="
for /f "usebackq delims=" %%u in (`gh api user --jq .login`) do set "GH_LOGIN=%%u"
if /i "%GH_LOGIN%"=="%GH_USER%" goto :gh_bon_compte
echo.
echo  Vous êtes connecté à GitHub en tant que « %GH_LOGIN% », pas « %GH_USER% ».
echo  Connectez-vous avec le bon compte dans la page qui va s’ouvrir.
gh auth login --hostname github.com --git-protocol https --web
set "GH_LOGIN="
for /f "usebackq delims=" %%u in (`gh api user --jq .login`) do set "GH_LOGIN=%%u"
if /i not "%GH_LOGIN%"=="%GH_USER%" (
  echo  [Erreur] Toujours connecté en tant que « %GH_LOGIN% ».
  goto :erreur
)
:gh_bon_compte
for /f "usebackq delims=" %%i in (`gh api user --jq .id`) do set "GH_ID=%%i"
gh auth setup-git >nul 2>nul
echo  Connecté à GitHub en tant que %GH_LOGIN%.
echo.

rem ============ 3. Dépôt local ============
:depot_local
if exist ".git" goto :git_existe
echo  Préparation du dépôt local...
git init -q
if errorlevel 1 goto :erreur
git symbolic-ref HEAD refs/heads/main
git remote add origin "%REMOTE%"
rem Si le dépôt GitHub existe déjà (nouvelle version du jeu dans un nouveau dossier),
rem on repart de son historique : pas besoin de tout écraser.
git fetch -q origin main >nul 2>nul
if not errorlevel 1 git reset -q --soft FETCH_HEAD
goto :identite
:git_existe
git remote get-url origin >nul 2>nul
if errorlevel 1 (git remote add origin "%REMOTE%") else (git remote set-url origin "%REMOTE%")
git rev-parse --verify HEAD >nul 2>nul
if not errorlevel 1 git branch -M main

:identite
rem Adresse masquée de GitHub : votre vraie adresse n’apparaît pas dans l’historique.
set "GIT_NAME="
for /f "usebackq delims=" %%n in (`git config user.name`) do set "GIT_NAME=%%n"
if not defined GIT_NAME git config user.name "%GH_USER%"
set "GIT_MAIL="
for /f "usebackq delims=" %%m in (`git config user.email`) do set "GIT_MAIL=%%m"
if defined GIT_MAIL goto :ignore
if defined GH_ID (git config user.email "%GH_ID%+%GH_USER%@users.noreply.github.com") else (git config user.email "%GH_USER%@users.noreply.github.com")

:ignore
if exist ".gitignore" goto :valider
> ".gitignore" echo Thumbs.db
>> ".gitignore" echo desktop.ini
>> ".gitignore" echo .DS_Store
>> ".gitignore" echo *.zip

:valider
rem Le mod de triche (dossier mods) reste sur cet ordinateur : jamais publié.
findstr /x /c:"mods/" ".gitignore" >nul 2>nul || >> ".gitignore" echo mods/
git rm -r -q --cached --ignore-unmatch mods >nul 2>nul
if exist "mods" echo  Le mod de triche, dans le dossier mods, reste sur cet ordinateur : il n'est pas publié.
git add -A
git diff --cached --quiet
if not errorlevel 1 goto :deja_valide
git commit -q -m "Publication du %date% à %time:~0,5%"
if errorlevel 1 goto :erreur
echo  Nouvelle version enregistrée.
goto :depot_distant
:deja_valide
git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 (
  echo  [Erreur] Aucun fichier à envoyer.
  goto :erreur
)
echo  Aucun changement depuis la dernière publication : on renvoie la même version.

rem ============ 4. Dépôt sur GitHub ============
:depot_distant
if not defined HAVE_GH goto :depot_manuel
gh repo view "%REPO%" >nul 2>nul
if not errorlevel 1 goto :envoi
echo  Création du dépôt %REPO% sur GitHub...
gh repo create "%REPO%" --public --description "L’Archive du Néant : un jeu d’extraction et de collection, jouable dans le navigateur." --homepage "%SITE%"
if errorlevel 1 goto :erreur
set "NEW_PAGES=1"
goto :envoi
:depot_manuel
git ls-remote "%REMOTE%" >nul 2>nul
if not errorlevel 1 goto :envoi
echo.
echo  Le dépôt n’existe pas encore sur GitHub. La page de création va s’ouvrir :
echo    - nom : %GH_REPO%
echo    - visibilité : Public
echo    - ne cochez PAS « Add a README » : le dépôt doit être vide
start "" "https://github.com/new?name=%GH_REPO%&visibility=public"
echo.
echo  Créez le dépôt, puis revenez ici.
pause
set "NEW_PAGES=1"

rem ============ 5. Envoi ============
:envoi
echo  Envoi des fichiers vers GitHub...
git push -u origin main
if not errorlevel 1 goto :pages
echo.
echo  L’envoi a été refusé. Le plus souvent, le dépôt GitHub contient des fichiers
echo  que ce dossier n’a pas (par exemple un README créé en même temps que lui).
choice /c ON /n /m " Remplacer le contenu du dépôt GitHub par ce dossier ? [O]ui / [N]on : "
if errorlevel 2 goto :erreur
git push -u origin main --force
if errorlevel 1 goto :erreur

rem ============ 6. Publication (GitHub Pages) ============
:pages
if not defined HAVE_GH goto :pages_manuel
gh api "repos/%REPO%/pages" >nul 2>nul
if not errorlevel 1 goto :suivi
echo  Activation de la publication (GitHub Pages, source : GitHub Actions)...
gh api -X POST "repos/%REPO%/pages" -f build_type=workflow >nul
if errorlevel 1 goto :pages_manuel
rem le premier envoi a pu partir avant l’activation : on relance la publication
timeout /t 3 /nobreak >nul
gh workflow run deploy.yml --ref main >nul 2>nul
set "RUN_EVENT=--event workflow_dispatch"
:suivi
echo  Publication en cours, une à deux minutes...
timeout /t 10 /nobreak >nul
set "RUN_ID="
for /f "usebackq delims=" %%r in (`gh run list --workflow deploy.yml %RUN_EVENT% --limit 1 --json databaseId --jq .[0].databaseId`) do set "RUN_ID=%%r"
if not defined RUN_ID goto :fini
gh run watch %RUN_ID% --exit-status
if errorlevel 1 (
  echo  [Attention] La publication a échoué. Détails dans l’onglet Actions du dépôt :
  echo    https://github.com/%REPO%/actions
  start "" "https://github.com/%REPO%/actions"
  goto :erreur
)
goto :fini

:pages_manuel
if exist ".git\pages-active" goto :fini
echo.
echo  Dernière étape, à faire une seule fois : activer la publication.
echo  La page des réglages va s’ouvrir. Dans « Build and deployment », choisissez :
echo    Source : GitHub Actions
start "" "https://github.com/%REPO%/settings/pages"
echo.
echo  Quand c’est fait, revenez ici.
pause
> ".git\pages-active" echo ok
rem relance la publication maintenant que Pages est actif
git commit -q --allow-empty -m "Relance de la publication"
git push -q origin main

:fini
echo.
echo  ================================================
echo    Terminé. Le jeu est (ou sera d’ici une minute) en ligne :
echo      %SITE%
echo.
echo    Pour publier une nouvelle version : mettez les nouveaux fichiers
echo    dans ce dossier, puis relancez ce script.
echo  ================================================
start "" "%SITE%"
echo.
pause
exit /b 0

:erreur
echo.
echo  La publication n’a pas abouti. Lisez le message ci-dessus, corrigez, puis relancez le script.
echo  Aide : https://docs.github.com/fr/pages
echo.
pause
exit /b 1
