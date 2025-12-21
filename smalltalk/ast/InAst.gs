! ------------------- Remove existing behavior from InAst
removeallmethods InAst
removeallclassmethods InAst
! ------------------- Class methods for InAst
! ------------------- Instance methods for InAst
category: 'other'
method: InAst
printSmalltalkOn: aStream

%
category: 'other'
method: InAst
printSmalltalkOn: aStream left: left rightList: right

	right size == 1 ifTrue: [
		right first printSmalltalkWithParenthesisOn: aStream.
	] ifFalse: [
		aStream nextPut: $(.
		aStream nextPutAll: '((lhs := '.
		(right at: 1) printSmalltalkOn: aStream.
		aStream nextPutAll: ')'.
	].

	aStream nextPutAll: ' __contains__: '.

	left ifNil: [
		aStream nextPutAll: 'rhs'.
	] ifNotNil: [
		left printSmalltalkWithParenthesisOn: aStream.
	].

	right size ~= 1 ifTrue: [
		aStream nextPutAll: ') ___ignore: (rhs := lhs)'.
	]
%
