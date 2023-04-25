! ------------------- Remove existing behavior from OrAst
removeAllMethods OrAst
removeAllClassMethods OrAst
! ------------------- Class methods for OrAst
! ------------------- Instance methods for OrAst
set compile_env: 0
category: 'other'
method: OrAst
printSmalltalkOn: aStream

	(1 to: (values size -2)) do:[ :each | aStream nextPutAll: '(' ].
	self smalltalkSourceFor: (values first) parenthesisIf: 3 on: aStream.
	aStream nextPutAll: ' ___or: '.
	(2 to: (values size-1)) do:[ :each |
		self smalltalkSourceFor: (values at: each) parenthesisIf: 3 on: aStream.
		aStream nextPut: $).
		aStream nextPutAll: ' ___or: '.
	].

	self smalltalkSourceFor: (values last) parenthesisIf: 3 on: aStream.
	"aStream nextPut: $)."
%
