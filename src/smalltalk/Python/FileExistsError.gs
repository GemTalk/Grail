! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- FileExistsError
expectvalue /Class
doit
OSError subclass: 'FileExistsError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
FileExistsError category: 'Grail-Exceptions'
%
