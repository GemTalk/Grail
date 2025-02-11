! ------------------- Remove existing behavior from AndAst
removeallmethods AndAst
removeallclassmethods AndAst
! ------------------- Class methods for AndAst
! ------------------- Instance methods for AndAst
category: 'other'
method: AndAst
printSmalltalkOn: aStream

	1 to: values size - 2 do: [:each | aStream nextPutAll: '('].
	values first printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___and: '.
	2 to: values size - 1 do: [:each |
		(values at: each) printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $).
		aStream nextPutAll: ' ___and: '.
	].
	values last printSmalltalkWithParenthesisOn: aStream.

%
