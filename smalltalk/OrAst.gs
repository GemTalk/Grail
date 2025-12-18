! ------------------- Remove existing behavior from OrAst
removeallmethods OrAst
removeallclassmethods OrAst
! ------------------- Class methods for OrAst
! ------------------- Instance methods for OrAst
category: 'other'
method: OrAst
printSmalltalkOn: aStream
	"Generate short-circuit 'or' using blocks for lazy evaluation.
	 Python's 'or' returns one of the operands, not a boolean."

	(1 to: (values size -2)) do: [:each | aStream nextPutAll: '('].
	values first printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___or: ['.
	2 to: values size - 1 do: [:i |
		(values at: i) printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ']) ___or: ['.
	].
	values last printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $].
%
