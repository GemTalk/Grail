! ------------------- Remove existing behavior from sys
removeallmethods sys
removeallclassmethods sys
! ------------------- Class methods for sys
category: 'other'
classmethod: sys
instance
	
	^self new
%
! ------------------- Instance methods for sys
category: 'other'
method: sys
initialize
	self
		is_stack_trampoline_active;
		yourself.
%
category: 'other'
method: sys
is_stack_trampoline_active

	| function |
	function := FunctionDef new
		params: {};
		yourself.
	function block: [:currentScope |
		self halt.
	].
	Builtins singleton at: #abs put: function.
%
