! ------------------- Remove existing behavior from NotInAst
removeallmethods NotInAst
removeallclassmethods NotInAst
! ------------------- Class methods for NotInAst
! ------------------- Instance methods for NotInAst
category: 'other'
method: NotInAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' ___contains_not: '.
%
category: 'other'
method: NotInAst
printSmalltalkOn: aStream left: left rightList: right

	aStream nextPut: $(.
	

	" Duplicated from InAst"
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
	].

	aStream nextPutAll: ') __not__'.
%
