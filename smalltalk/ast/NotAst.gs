! ------------------- Remove existing behavior from NotAst
removeallmethods NotAst
removeallclassmethods NotAst
set compile_env: 0
! ------------------- Class methods for NotAst
! ------------------- Instance methods for NotAst
category: 'other'
method: NotAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___not___'.
%
