! ------------------- Superclass check
run
IndentationError ifNil: [self error: 'IndentationError is not defined. Check file ordering.'].
%

! ------- TabError
expectvalue /Class
doit
IndentationError subclass: 'TabError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
TabError category: 'Grail-Exceptions'
%
