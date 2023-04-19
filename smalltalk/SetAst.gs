! ------------------- Remove existing behavior from SetAst
removeAllMethods SetAst
removeAllClassMethods SetAst
! ------------------- Class methods for SetAst
! ------------------- Instance methods for SetAst
set compile_env: 0
category: 'other'
method: SetAst
initialize
	"Set(expr* elts)"

	elts := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: SetAst
messagePrecedence
	
	^3
%
category: 'other'
method: SetAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'set ___value: { '.
	elts do: [ :elt |
		self smalltalkSourceFor: elt parenthesisIf: 1 on: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPut: '} asSet'.
%
