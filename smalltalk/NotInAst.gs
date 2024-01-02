! ------------------- Remove existing behavior from NotInAst
expectvalue /Metaclass3
doit
NotInAst removeAllMethods.
NotInAst class removeAllMethods.
%
! ------------------- Class methods for NotInAst
! ------------------- Instance methods for NotInAst
set compile_env: 0
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
	].

	aStream nextPutAll: ') __not__'.
%
