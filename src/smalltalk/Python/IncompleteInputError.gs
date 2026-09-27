! ------------------- Superclass check
run
SyntaxError ifNil: [self error: 'SyntaxError is not defined. Check file ordering.'].
%

! ------- _IncompleteInputError
! CPython 3.13's SyntaxError subclass, raised by the compiler for source that
! is incomplete rather than wrong (the REPL's continuation prompt).  Grail's
! compiler does not make that distinction, so it never raises it; it is a
! builtin name all the same, and code that names it (test_pickle's
! CompatPickleTests.test_exceptions) must find a class rather than NameError.
expectvalue /Class
doit
SyntaxError subclass: '_IncompleteInputError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_IncompleteInputError category: 'Grail-Exceptions'
%
