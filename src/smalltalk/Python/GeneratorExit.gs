! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- Special exceptions that inherit directly from BaseException
! ------- GeneratorExit
expectvalue /Class
doit
BaseException subclass: 'GeneratorExit'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GeneratorExit comment:
'Request that a generator exit.

This exception is raised when a generator''s close() method is called.
It inherits directly from BaseException instead of Exception since it is
technically not an error.
'
%

expectvalue /Class
doit
GeneratorExit category: 'Grail-Exceptions'
%
