! ------------------- Superclass check
run
ConnectionError ifNil: [self error: 'ConnectionError is not defined. Check file ordering.'].
%

! ------- BrokenPipeError
expectvalue /Class
doit
ConnectionError subclass: 'BrokenPipeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BrokenPipeError category: 'Exceptions'
%
