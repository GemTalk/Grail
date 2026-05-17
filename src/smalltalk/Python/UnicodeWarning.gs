! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- UnicodeWarning
expectvalue /Class
doit
Warning subclass: 'UnicodeWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeWarning category: 'Grail-Exceptions'
%
