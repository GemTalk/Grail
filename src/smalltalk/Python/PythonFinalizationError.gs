! ------------------- Superclass check
run
RuntimeError ifNil: [self error: 'RuntimeError is not defined. Check file ordering.'].
%

! ------- PythonFinalizationError
! CPython 3.13's RuntimeError subclass for operations refused during
! interpreter shutdown.  Grail never raises it -- a gem has no finalization
! phase that refuses work -- but it is a builtin name, and code that names it
! (test.pickletester's exception table, an ``except PythonFinalizationError'')
! must find a class rather than raise NameError.
expectvalue /Class
doit
RuntimeError subclass: 'PythonFinalizationError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonFinalizationError category: 'Grail-Exceptions'
%
