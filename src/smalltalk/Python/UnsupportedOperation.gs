! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- io.UnsupportedOperation
! CPython defines it as class UnsupportedOperation(OSError, ValueError);
! GemStone has single inheritance, so OSError wins (callers catch it as
! an I/O error far more often than as a ValueError).
expectvalue /Class
doit
OSError subclass: 'UnsupportedOperation'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnsupportedOperation category: 'Grail-Exceptions'
%
