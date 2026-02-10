! ------------------- Remove existing behavior from IsAst
removeallmethods IsAst
removeallclassmethods IsAst
set compile_env: 0
! ------------------- Class methods for IsAst
! ------------------- Instance methods for IsAst
category: 'other'
method: IsAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' == '.
%
category: 'other'
method: IsAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' == '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
