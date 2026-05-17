! ------------------- Superclass check
run
ConnectionError ifNil: [self error: 'ConnectionError is not defined. Check file ordering.'].
%

! ------- ConnectionAbortedError
expectvalue /Class
doit
ConnectionError subclass: 'ConnectionAbortedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ConnectionAbortedError category: 'Grail-Exceptions'
%
