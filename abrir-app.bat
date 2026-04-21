@echo off
:: Crea una carpeta temporal para el perfil del dashboard (necesario para los permisos)
set "TMP_PROFILE=%TEMP%\Dashboard_Voley_Perfil"

:: Abre Chrome como App, con permisos para leer los datos de Google Sheets
start chrome --app="file:///%~dp0index.html" --disable-web-security --user-data-dir="%TMP_PROFILE%"

exit