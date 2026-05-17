! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- SystemExit
expectvalue /Class
doit
BaseException subclass: 'SystemExit'
  instVarNames: #( code )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SystemExit comment:
'Request to exit from the interpreter.

This exception is raised by the sys.exit() function. It inherits from
BaseException instead of Exception so that it is not accidentally caught
by code that catches Exception.

Instance variables:
  code - the exit status code
'
%

expectvalue /Class
doit
SystemExit category: 'Grail-Exceptions'
%
