! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- SyntaxWarning
expectvalue /Class
doit
Warning subclass: 'SyntaxWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SyntaxWarning category: 'Grail-Exceptions'
%
