! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- Exception (Python's main exception class)
expectvalue /Class
doit
BaseException subclass: 'Exception'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Exception comment:
'Python Exception - base class for most Python exceptions.

All built-in, non-system-exiting exceptions are derived from this class.
All user-defined exceptions should also be derived from this class.
'
%

expectvalue /Class
doit
Exception category: 'Exceptions'
%

! ===============================================================================
! Exception Methods (Python 'Exception' type)
! ===============================================================================
! This file contains method implementations for the Exception class,
! which is the base class for most Python exceptions.
!
! Exception inherits from Python's BaseException and inherits most of its
! behavior. This file only adds or overrides methods specific to Exception.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from Exception
expectvalue /Metaclass3
doit
Exception removeAllMethods: 1.
Exception class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Initialization'
method: Exception
__init__
	"Initialize with no arguments."

	args := #().
	^ None
%

category: 'Python-Initialization'
method: Exception
__init__: a
	"Initialize with arguments.
	a should be a tuple (Array) of arguments."

	a ifNil: [ args := #() ] ifNotNil: [ args := a ].
	^ None
%

set compile_env: 0
