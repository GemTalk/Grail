! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- ResourceWarning
expectvalue /Class
doit
Warning subclass: 'ResourceWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ResourceWarning category: 'Grail-Exceptions'
%
