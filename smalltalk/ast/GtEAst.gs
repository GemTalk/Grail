! ------------------- Remove existing behavior from GtEAst
removeallmethods GtEAst
removeallclassmethods GtEAst
set compile_env: 0
! ------------------- Class methods for GtEAst
! ------------------- Instance methods for GtEAst
category: 'other'
method: GtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __ge__: '.
%
category: 'other'
method: GtEAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __ge__: '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
