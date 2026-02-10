! ------------------- Remove existing behavior from IsNotAst
removeallmethods IsNotAst
removeallclassmethods IsNotAst
set compile_env: 0
! ------------------- Class methods for IsNotAst
! ------------------- Instance methods for IsNotAst
category: 'other'
method: IsNotAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' ~~ '.
%
category: 'other'
method: IsNotAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ~~ '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
