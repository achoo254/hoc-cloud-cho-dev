@echo off
mode con: cols=118 lines=44 >/dev/null
cls
echo %SSHPASS%| plink -ssh -batch -hostkey SHA256:XC5G+ZSbn5yiqmA1M9d3xtRgltcNur7GMLxHTuKdwuU -pw %SSHPASS% %SSHHOST% -m "%SSHSCRIPT%"
echo.
echo [== done ==]
