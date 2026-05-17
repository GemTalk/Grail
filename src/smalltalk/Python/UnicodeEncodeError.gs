! ------------------- Superclass check
run
UnicodeError ifNil: [self error: 'UnicodeError is not defined. Check file ordering.'].
%

! ------- UnicodeEncodeError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeEncodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeEncodeError category: 'Grail-Exceptions'
%
