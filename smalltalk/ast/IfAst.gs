! ------------------- Remove existing behavior from IfAst
removeallmethods IfAst
removeallclassmethods IfAst
set compile_env: 0
! ------------------- Class methods for IfAst
! ------------------- Instance methods for IfAst
category: 'other'
method: IfAst
printSmalltalkOn: aStream

	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ifTrue: ['; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	aStream decreaseIndent; nextPutAll: '].'.
%
