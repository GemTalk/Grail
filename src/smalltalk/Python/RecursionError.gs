! ------------------- Superclass check
run
RuntimeError ifNil: [self error: 'RuntimeError is not defined. Check file ordering.'].
%

! ------- RecursionError
expectvalue /Class
doit
RuntimeError subclass: 'RecursionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
RecursionError category: 'Grail-Exceptions'
%
