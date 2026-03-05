! ------------------- Superclass check
run
Warning ifNil: [self error: 'Warning is not defined. Check file ordering.'].
%

! ------- PendingDeprecationWarning
expectvalue /Class
doit
Warning subclass: 'PendingDeprecationWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PendingDeprecationWarning category: 'Exceptions'
%
