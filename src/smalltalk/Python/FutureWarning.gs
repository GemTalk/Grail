! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- FutureWarning
expectvalue /Class
doit
Warning subclass: 'FutureWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
FutureWarning category: 'Grail-Exceptions'
%
