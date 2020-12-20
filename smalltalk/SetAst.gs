! ------------------- Remove existing behavior from SetAst
removeAllMethods SetAst
removeAllClassMethods SetAst
! ------------------- Class methods for SetAst
! ------------------- Instance methods for SetAst
set compile_env: 0
category: 'other'
method: SetAst
evaluate: aScope

	^ set withAll: (elts collect: [:each | each evaluate: aScope])
%
category: 'other'
method: SetAst
initialize
	"Set(expr* elts)"

	elts := self collectAst: [self expression].
	self readPosition.
%
