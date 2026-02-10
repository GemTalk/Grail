! ------------------- Remove existing behavior from IfExpAst
removeallmethods IfExpAst
removeallclassmethods IfExpAst
set compile_env: 0
! ------------------- Class methods for IfExpAst
! ------------------- Instance methods for IfExpAst
category: 'other'
method: IfExpAst
printSmalltalkOn: aStream

	aStream nextPutAll: '('.
	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ifTrue: ['.
	body printSmalltalkOn: aStream.
	aStream nextPutAll: '] ifFalse: ['.
	orelse printSmalltalkOn: aStream.
	aStream nextPutAll: '])'.
%
