! ------------------- Remove existing behavior from PyGlobals
removeallmethods PyGlobals
removeallclassmethods PyGlobals
! ------------------- Class methods for PyGlobals
category: 'other'
classmethod: PyGlobals
new
	^super new 
		initialize;
		parent: Builtins singleton;
		yourself.
%
! ------------------- Instance methods for PyGlobals
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
