! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- ValueError (used by list and tuple)
expectvalue /Class
doit
Exception subclass: 'ValueError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ValueError category: 'Grail-Exceptions'
%
