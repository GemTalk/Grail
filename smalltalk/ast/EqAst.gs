! ------------------- Remove existing behavior from EqAst
removeallmethods EqAst
removeallclassmethods EqAst
set compile_env: 0
! ------------------- Class methods for EqAst
! ------------------- Instance methods for EqAst
category: 'other'
method: EqAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __eq__: '.
%
category: 'other'
method: EqAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __eq__: '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
