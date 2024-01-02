! ------------------- Remove existing behavior from PyGlobals
expectvalue /Metaclass3
doit
PyGlobals removeAllMethods.
PyGlobals class removeAllMethods.
%
! ------------------- Class methods for PyGlobals
set compile_env: 0
category: 'other'
classmethod: PyGlobals
new
	^super new 
		initialize;
		parent: Builtins singleton;
		yourself.
%
! ------------------- Instance methods for PyGlobals
set compile_env: 0
category: 'other'
method: PyGlobals
globals

	^self
%
category: 'other'
method: PyGlobals
isGlobals

	^true
%
