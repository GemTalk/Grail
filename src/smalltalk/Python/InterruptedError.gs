! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- InterruptedError
expectvalue /Class
doit
OSError subclass: 'InterruptedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
InterruptedError category: 'Exceptions'
%
