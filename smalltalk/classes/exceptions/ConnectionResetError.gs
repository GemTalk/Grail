! ------------------- Superclass check
run
ConnectionError ifNil: [self error: 'ConnectionError is not defined. Check file ordering.'].
%

! ------- ConnectionResetError
expectvalue /Class
doit
ConnectionError subclass: 'ConnectionResetError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ConnectionResetError category: 'Exceptions'
%
