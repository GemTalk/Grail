! ------------------- Remove existing behavior from UAddAst
removeallmethods UAddAst
removeallclassmethods UAddAst
set compile_env: 0
! ------------------- Class methods for UAddAst
! ------------------- Instance methods for UAddAst
category: 'other'
method: UAddAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __pos__'.
%
