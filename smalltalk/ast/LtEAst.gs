! ------------------- Remove existing behavior from LtEAst
removeallmethods LtEAst
removeallclassmethods LtEAst
set compile_env: 0
! ------------------- Class methods for LtEAst
! ------------------- Instance methods for LtEAst
category: 'other'
method: LtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __le__: '.
%
category: 'other'
method: LtEAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __le__: '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
