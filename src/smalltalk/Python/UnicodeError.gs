! ------------------- Superclass check
run
ValueError ifNil: [self error: 'ValueError is not defined. Check file ordering.'].
%

! ------- UnicodeError
expectvalue /Class
doit
ValueError subclass: 'UnicodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeError category: 'Grail-Exceptions'
%
