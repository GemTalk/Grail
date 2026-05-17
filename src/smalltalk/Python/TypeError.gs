! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- TypeError (used by tuple for immutability)
expectvalue /Class
doit
Exception subclass: 'TypeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
TypeError category: 'Grail-Exceptions'
%
