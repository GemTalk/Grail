! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- LookupError (base for IndexError and KeyError)
expectvalue /Class
doit
Exception subclass: 'LookupError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
LookupError category: 'Grail-Exceptions'
%
