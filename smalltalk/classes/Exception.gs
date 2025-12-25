! ===============================================================================
! Exception Methods (Python 'Exception' type)
! ===============================================================================
! This file contains method implementations for the Exception class,
! which is the base class for most Python exceptions.
!
! Exception inherits from Python's BaseException and inherits most of its
! behavior. This file only adds or overrides methods specific to Exception.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from Exception
expectvalue /Metaclass3
doit
Exception removeAllMethods: 2.
Exception class removeAllMethods: 2.
%

! ------------------- Class methods for Exception
set compile_env: 2

category: 'Python-Initialization'
classmethod: Exception
__new__: cls
	"Create a new Exception instance with no arguments."
	
	| instance |
	instance := cls perform: #new env: 0 withArguments: {  }.
	instance perform: #___args: env: 0 withArguments: { #() }.
	^ instance
%

category: 'Python-Initialization'
classmethod: Exception
__new__: cls _: anArray
	"Create a new Exception instance with arguments.
	anArray should be a tuple (Array) of arguments."
	
	| instance |
	instance := cls perform: #new env: 0 withArguments: {  }.
	instance 
		perform: #___args: 
		env: 0 
		withArguments: { anArray ifNil: [ #() ] }.
	^ instance
%

! ------------------- Instance methods for Exception
set compile_env: 2

category: 'Python-Initialization'
method: Exception
__init__
	"Initialize with no arguments."
	
	args := #().
%

category: 'Python-Initialization'
method: Exception
__init__: a
	"Initialize with arguments.
	a should be a tuple (Array) of arguments."
	
	a ifNil: [ args := #() ] ifNotNil: [ args := a ].
%

! Note: Exception inherits all other methods from BaseException:
! - args (attribute)
! - __str__
! - __repr__
! - __cause__, __context__, __suppress_context__, __traceback__
! - with_traceback:
! - add_note:
! - __eq__:, __ne__:

! ------------------- Reset compile environment
set compile_env: 0
