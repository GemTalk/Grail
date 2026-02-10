! ------------------- Remove existing behavior from GtAst
removeallmethods GtAst
removeallclassmethods GtAst
set compile_env: 0
! ------------------- Class methods for GtAst
! ------------------- Instance methods for GtAst
category: 'other'
method: GtAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __gt__: '.
%
category: 'other'
method: GtAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __gt__: '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
