! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- FileNotFoundError
expectvalue /Class
doit
OSError subclass: 'FileNotFoundError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
FileNotFoundError category: 'Exceptions'
%
