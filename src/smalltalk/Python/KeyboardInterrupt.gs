! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- KeyboardInterrupt
expectvalue /Class
doit
BaseException subclass: 'KeyboardInterrupt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
KeyboardInterrupt comment:
'Program interrupted by user.

This exception is raised when the user hits the interrupt key (normally
Control-C or Delete). It inherits from BaseException so that it is not
accidentally caught by code that catches Exception.
'
%

expectvalue /Class
doit
KeyboardInterrupt category: 'Grail-Exceptions'
%
