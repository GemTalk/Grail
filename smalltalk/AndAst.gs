! ------------------- Remove existing behavior from AndAst
expectvalue /Metaclass3       
doit
AndAst removeAllMethods.
AndAst class removeAllMethods.
%
! ------------------- Class methods for AndAst
! ------------------- Instance methods for AndAst
set compile_env: 0
category: 'other'
method: AndAst
evaluate

	^values allSatisfy: [:each | each evaluate].
%
category: 'other'
method: AndAst
values: anArray

	self halt.
	^anArray allSatisfy: [:each | each evaluate].
%
