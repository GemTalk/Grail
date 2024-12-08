! ------------------- Remove existing behavior from Builtins
removeallmethods Builtins
removeallclassmethods Builtins
! ------------------- Class methods for Builtins
category: 'other'
classmethod: Builtins
new
	
	self error: 'use singleton'
%
category: 'other'
classmethod: Builtins
reset

	singleton := nil.
%
category: 'other'
classmethod: Builtins
singleton
	
	singleton ifNil: [
		singleton := self basicNew.
		singleton initialize.
	].
	^singleton
%
! ------------------- Instance methods for Builtins
category: 'other'
method: Builtins
builtins

	^self
%
category: 'other'
method: Builtins
initialize
	super initialize.
	builtin_function_or_method new initialize.
%
category: 'other'
method: Builtins
isBuiltins

	^true
%
