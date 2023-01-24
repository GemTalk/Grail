! ------------------- Remove existing behavior from PyGlobals
removeAllMethods PyGlobals
removeAllClassMethods PyGlobals
! ------------------- Class methods for PyGlobals
set compile_env: 0
category: 'other'
classmethod: PyGlobals
new
	^super new 
		initialize;
		parent: builtins;
		yourself.
%
! ------------------- Instance methods for PyGlobals
set compile_env: 0
category: 'other'
method: PyGlobals
createChildScope

	^Variables newWithParent: self.
%
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
