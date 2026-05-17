! ------------------- Superclass check
run
ConnectionError ifNil: [self error: 'ConnectionError is not defined. Check file ordering.'].
%

! ------- ConnectionRefusedError
expectvalue /Class
doit
ConnectionError subclass: 'ConnectionRefusedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ConnectionRefusedError category: 'Grail-Exceptions'
%
