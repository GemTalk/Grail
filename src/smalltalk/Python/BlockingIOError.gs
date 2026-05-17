! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- OSError subclasses
! ------- BlockingIOError
expectvalue /Class
doit
OSError subclass: 'BlockingIOError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BlockingIOError category: 'Grail-Exceptions'
%
