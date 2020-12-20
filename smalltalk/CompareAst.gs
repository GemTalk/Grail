! ------------------- Remove existing behavior from CompareAst
removeAllMethods CompareAst
removeAllClassMethods CompareAst
! ------------------- Class methods for CompareAst
! ------------------- Instance methods for CompareAst
set compile_env: 0
category: 'other'
method: CompareAst
evaluate: aScope

	| lhs |
	lhs := left evaluate: aScope.
	1 to: cmpopList size do: [:i |
		| op operand |
		op := cmpopList at: i.
		operand := (comparatorList at: i) evaluate: aScope.
		(lhs := (op left: lhs right: operand)).
		(lhs == True) ifFalse: [^False].
		lhs := operand.
	].
	^True
%
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
