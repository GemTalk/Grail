! ------------------- Superclass check
run
ArithmeticError ifNil: [self error: 'ArithmeticError is not defined. Check file ordering.'].
%

! ------- FloatingPointError
expectvalue /Class
doit
ArithmeticError subclass: 'FloatingPointError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
FloatingPointError category: 'Grail-Exceptions'
%
