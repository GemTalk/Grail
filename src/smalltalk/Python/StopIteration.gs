! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- StopIteration
expectvalue /Class
doit
Exception subclass: 'StopIteration'
  instVarNames: #( value )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
StopIteration comment:
'Python StopIteration exception.

Instance variables:
  value - the value returned by the iterator
'
%

expectvalue /Class
doit
StopIteration category: 'Grail-Exceptions'
%
