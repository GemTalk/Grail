! ------------------- Superclass check
run
UnicodeError ifNil: [self error: 'UnicodeError is not defined. Check file ordering.'].
%

! ------- UnicodeDecodeError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeDecodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeDecodeError category: 'Grail-Exceptions'
%
