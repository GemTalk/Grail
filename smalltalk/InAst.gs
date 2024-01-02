! ------------------- Remove existing behavior from InAst
expectvalue /Metaclass3
doit
InAst removeAllMethods.
InAst class removeAllMethods.
%
! ------------------- Class methods for InAst
! ------------------- Instance methods for InAst
set compile_env: 0
category: 'other'
method: InAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __contains__: '.
%
category: 'other'
method: InAst
printSmalltalkOn: aStream left: left rightList: right

	right size == 1 ifTrue: [
		self smalltalkSourceFor: (right at: 1) parenthesisIf: 3 on: aStream.
	] ifFalse: [
		aStream nextPut: $(.
		aStream nextPutAll: '((lhs := '.
		self smalltalkSourceFor: (right at: 1) parenthesisIf: 4 on: aStream.
		aStream nextPutAll: ')'.
	].

	aStream nextPutAll: ' __contains__: '.

	left ifNil: [
		aStream nextPutAll: 'rhs'.
	] ifNotNil: [
		self smalltalkSourceFor: left parenthesisIf: 3 on: aStream.
	].

	right size ~= 1 ifTrue: [
		aStream nextPutAll: ') ___ignore: (rhs := lhs)'.
	]
%
