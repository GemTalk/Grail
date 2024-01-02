! ------------------- Remove existing behavior from Builtins
expectvalue /Metaclass3
doit
Builtins removeAllMethods.
Builtins class removeAllMethods.
%
! ------------------- Class methods for Builtins
set compile_env: 0
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
set compile_env: 0
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
