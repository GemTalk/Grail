! ------------------- Remove existing behavior from PyGlobals
removeAllMethods PyGlobals
removeAllClassMethods PyGlobals
! ------------------- Class methods for PyGlobals
set compile_env: 0
category: 'other'
classmethod: PyGlobals
new
	^Builtins singleton createChildScope.
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
