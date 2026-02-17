! ------------------- Superclass check
run
NameError ifNil: [self error: 'NameError is not defined. Check file ordering.'].
%

! ------- UnboundLocalError
expectvalue /Class
doit
NameError subclass: 'UnboundLocalError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnboundLocalError category: 'Exceptions'
%
