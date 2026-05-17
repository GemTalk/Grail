! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- ProcessLookupError
expectvalue /Class
doit
OSError subclass: 'ProcessLookupError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ProcessLookupError category: 'Grail-Exceptions'
%
