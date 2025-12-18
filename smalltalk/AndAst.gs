! ------------------- Remove existing behavior from AndAst
removeallmethods AndAst
removeallclassmethods AndAst
! ------------------- Class methods for AndAst
! ------------------- Instance methods for AndAst
category: 'other'
method: AndAst
printSmalltalkOn: aStream
	"Generate short-circuit 'and' using blocks for lazy evaluation.
	 Python's 'and' returns one of the operands, not a boolean."

	values size - 2 timesRepeat: [
		aStream nextPutAll: '('
	].
	values first printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___and: ['.
	2 to: values size - 1 do: [:each |
		(values at: each) printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ']) ___and: ['.
	].
	values last printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $].
%
