! ------------------- Remove existing behavior from CompareAst
removeAllMethods CompareAst
removeAllClassMethods CompareAst
! ------------------- Class methods for CompareAst
! ------------------- Instance methods for CompareAst
set compile_env: 0
category: 'other'
method: CompareAst
initialize
	"Compare(expr left, cmpop* ops, expr* comparators)"

	| stream |
	stream := self stream.
	left := self expression.
	self commaSpace.
	cmpopList := self collectAst: [CmpOpAst parent: self].
	self commaSpace.
	comparatorList := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: CompareAst
messagePrecedence

	^3
%
category: 'other'
method: CompareAst
printSmalltalkOn: aStream

	self smalltalkSourceFor: left parenthesisIf: 3 on: aStream.
	1 to: cmpopList size do: [ :i |
		(cmpopList at: i) printSmalltalkOn: aStream.
		self smalltalkSourceFor: (comparatorList at: i) parenthesisIf: 2 on: aStream.
	].
%
