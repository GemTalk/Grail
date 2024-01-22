! ------------------- Remove existing behavior from AndAst
expectvalue /Metaclass3
doit
AndAst removeAllMethods.
AndAst class removeAllMethods.
%
! ------------------- Class methods for AndAst
! ------------------- Instance methods for AndAst
set compile_env: 0
category: 'other'
method: AndAst
printSmalltalkOn: aStream

	(1 to: (values size -2)) do: [:each | aStream nextPutAll: '('].
	self smalltalkSourceFor: (values first) parenthesisIf: 3 on: aStream.
	aStream nextPutAll: ' ___and: '.
	(2 to: (values size-1)) do: [:each |
		self smalltalkSourceFor: (values at: each) parenthesisIf: 3 on: aStream.
		aStream nextPut: $).
		aStream nextPutAll: ' ___and: '.
	].

	self smalltalkSourceFor: (values last) parenthesisIf: 3 on: aStream.
	"aStream nextPut: $)."
%
