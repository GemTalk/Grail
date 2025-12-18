! ------------------- Remove existing behavior from sys
removeallmethods sys
removeallclassmethods sys
! ------------------- Class methods for sys
category: 'other'
classmethod: sys
functionNames

	^#( #is_stack_trampoline_active )
%
! ------------------- Instance methods for sys
category: 'other'
method: sys
is_stack_trampoline_active

	| function |
	function := builtin_function_or_method new
		params: {};
		yourself.
	function block: [:currentScope |
		False.
	].
	^function
%
