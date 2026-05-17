! ------------------- Superclass check
run
BaseExceptionGroup ifNil: [self error: 'BaseExceptionGroup is not defined. Check file ordering.'].
%

! ------- ExceptionGroup (Python 3.11+)
expectvalue /Class
doit
BaseExceptionGroup subclass: 'ExceptionGroup'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ExceptionGroup comment:
'A group of Exception instances.

This is a subclass of BaseExceptionGroup that can only contain Exception
instances (not BaseException instances like KeyboardInterrupt or SystemExit).
'
%

expectvalue /Class
doit
ExceptionGroup category: 'Grail-Exceptions'
%
