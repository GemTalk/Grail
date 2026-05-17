! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- RuntimeError
expectvalue /Class
doit
Exception subclass: 'RuntimeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
RuntimeError category: 'Grail-Exceptions'
%
