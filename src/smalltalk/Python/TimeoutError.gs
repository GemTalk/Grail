! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- TimeoutError
expectvalue /Class
doit
OSError subclass: 'TimeoutError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
TimeoutError category: 'Grail-Exceptions'
%
