! ------------------- Remove existing behavior from CompareAst
removeallmethods CompareAst
removeallclassmethods CompareAst
set compile_env: 0
! ------------------- Class methods for CompareAst
! ------------------- Instance methods for CompareAst
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
printSmalltalkOn: aStream

	self halt.
%
