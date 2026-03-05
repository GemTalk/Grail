! ------------------- Superclass check
run
ArithmeticError ifNil: [self error: 'ArithmeticError is not defined. Check file ordering.'].
%

! ------- ZeroDivisionError
expectvalue /Class
doit
ArithmeticError subclass: 'ZeroDivisionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ZeroDivisionError category: 'Exceptions'
%
