! ------------------- Superclass check
run
RuntimeError ifNil: [self error: 'RuntimeError is not defined. Check file ordering.'].
%

! ------- NotImplementedError
expectvalue /Class
doit
RuntimeError subclass: 'NotImplementedError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
NotImplementedError category: 'Grail-Exceptions'
%
