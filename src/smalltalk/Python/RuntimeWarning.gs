! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- RuntimeWarning
expectvalue /Class
doit
Warning subclass: 'RuntimeWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
RuntimeWarning category: 'Grail-Exceptions'
%
