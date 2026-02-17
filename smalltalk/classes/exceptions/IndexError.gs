! ------------------- Superclass check
run
LookupError ifNil: [self error: 'LookupError is not defined. Check file ordering.'].
%

! ------- IndexError (used by list and tuple)
expectvalue /Class
doit
LookupError subclass: 'IndexError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IndexError category: 'Exceptions'
%
