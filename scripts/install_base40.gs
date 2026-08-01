! ===============================================================================
!  additions to base classes when using GemStone64 v4.0.0+
!  want this as base image methods, not session methods for reliability of error handling
output pushnew install_base40.out 
set user SystemUser pass swordfish
iferr 1 where
iferr 2 exit 1
login

fileformat utf8

input src/smalltalk/Python/GsTestResult.gs

commit

logout
