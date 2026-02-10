! ------------------- Remove existing behavior from InvertAst
removeallmethods InvertAst
removeallclassmethods InvertAst
set compile_env: 0
! ------------------- Class methods for InvertAst
! ------------------- Instance methods for InvertAst
category: 'other'
method: InvertAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __invert__'.
%
