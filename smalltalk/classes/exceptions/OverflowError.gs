! ------------------- Superclass check
run
ArithmeticError ifNil: [self error: 'ArithmeticError is not defined. Check file ordering.'].
%

! ------- OverflowError
expectvalue /Class
doit
ArithmeticError subclass: 'OverflowError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
OverflowError category: 'Exceptions'
%
