! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- StopAsyncIteration
expectvalue /Class
doit
Exception subclass: 'StopAsyncIteration'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
StopAsyncIteration category: 'Grail-Exceptions'
%
