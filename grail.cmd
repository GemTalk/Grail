@ECHO off


:: All of the variable below are obviously machine-specific and must be changed
:: Setup variables specifying the server-accessible working directories
SET workdir=/home/will/Code/Python/Grail/
SET pyCodeDir=%workdir%tests/
:: Setup variables for connecting to GemStone server via Topaz
SET gemn=!tcp@192.168.1.24#netldi:50377#task!gemnetobject
SET gems=!tcp@localhost#server!gs64stone


:: Get file argument from command line
SET file=%~1
IF "%file%" == "" (
    echo File argument not provided
    EXIT /b 1
)
:: Parse the file name from the path
For %%A in ("%file%") do ( set filename=%%~nxA )
:: Set the path to the server location
set file=%pyCodeDir%%filename%


echo Translating Python into Smalltalk...
:: Run topaz script
(
    echo set gemn %gemn% & ^
    echo set gems %gems% & ^
    echo set u DataCurator & ^
    echo set p swordfish & ^
    echo login & ^
    echo run & ^
    echo ^^^| module stream ^^^| & ^
    echo module := ModuleAst script: '%file: =%'. & ^
    echo stream := PrettyWriteStream on: String new. & ^
    echo module printSmalltalkOn: stream. & ^
    echo stream contents evaluate. & ^
    echo %% & ^
    echo exit
) | topaz


:: Output the results
echo Translation complete.
echo.
echo ** START OF PROGRAM OUTPUT **
echo.
type stdout.txt
del stdout.txt
