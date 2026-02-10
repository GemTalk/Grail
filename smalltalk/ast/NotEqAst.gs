! ------------------- Remove existing behavior from NotEqAst
removeallmethods NotEqAst
removeallclassmethods NotEqAst
set compile_env: 0
! ------------------- Class methods for NotEqAst
! ------------------- Instance methods for NotEqAst
category: 'other'
method: NotEqAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __ne__: '.
%
category: 'other'
method: NotEqAst
printSmalltalkOn: aStream left: aLeft rightList: aRight

	aLeft printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __ne__: '.
	aRight first printSmalltalkWithParenthesisOn: aStream.
%
