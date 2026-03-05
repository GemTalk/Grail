! ------------------- Superclass check
run
LookupError ifNil: [self error: 'LookupError is not defined. Check file ordering.'].
%

! ------- KeyError (subclass of LookupError which maps to GemStone LookupError)
expectvalue /Class
doit
LookupError subclass: 'KeyError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
KeyError category: 'Exceptions'
%
