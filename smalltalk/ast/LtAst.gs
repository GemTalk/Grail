! ------------------- Remove existing behavior from LtAst
removeallmethods LtAst
removeallclassmethods LtAst
set compile_env: 0
! ------------------- Class methods for LtAst
! ------------------- Instance methods for LtAst
category: 'other'
method: LtAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __lt__: '.
%
category: 'other'
method: LtAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __lt__: '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
