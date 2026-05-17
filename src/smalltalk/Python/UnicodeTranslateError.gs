! ------------------- Superclass check
run
UnicodeError ifNil: [self error: 'UnicodeError is not defined. Check file ordering.'].
%

! ------- UnicodeTranslateError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeTranslateError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeTranslateError category: 'Grail-Exceptions'
%
