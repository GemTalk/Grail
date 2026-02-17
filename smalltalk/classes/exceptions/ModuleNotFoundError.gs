! ------------------- Superclass check
run
ImportError ifNil: [self error: 'ImportError is not defined. Check file ordering.'].
%

! ------- ModuleNotFoundError
expectvalue /Class
doit
ImportError subclass: 'ModuleNotFoundError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ModuleNotFoundError category: 'Exceptions'
%
