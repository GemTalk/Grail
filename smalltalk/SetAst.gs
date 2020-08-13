! ------------------- Remove existing behavior from SetAst
expectvalue /Metaclass3       
doit
SetAst removeAllMethods.
SetAst class removeAllMethods.
%
! ------------------- Class methods for SetAst
! ------------------- Instance methods for SetAst
set compile_env: 0
category: 'other'
method: SetAst
evaluate: aScope

	^(elts collect: [:each | each evaluate: aScope]) asSet
%
category: 'other'
method: SetAst
initialize
	"Set(expr* elts)"

	elts := self collectAst: [self expression].
	self readPosition.
%
