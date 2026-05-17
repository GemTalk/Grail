! ------------------- Superclass check
run
SyntaxError ifNil: [self error: 'SyntaxError is not defined. Check file ordering.'].
%

! ------- IndentationError
expectvalue /Class
doit
SyntaxError subclass: 'IndentationError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IndentationError category: 'Grail-Exceptions'
%
