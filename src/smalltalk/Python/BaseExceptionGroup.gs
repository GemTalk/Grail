! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- BaseExceptionGroup (Python 3.11+)
expectvalue /Class
doit
BaseException subclass: 'BaseExceptionGroup'
  instVarNames: #( message exceptions )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BaseExceptionGroup comment:
'A group of unrelated exceptions.

Introduced in Python 3.11 to support exception groups.

Instance variables:
  message - description of the exception group
  exceptions - sequence of exceptions in the group
'
%

expectvalue /Class
doit
BaseExceptionGroup category: 'Grail-Exceptions'
%
