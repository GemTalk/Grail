! ------------------- Remove existing behavior from CompareAst
expectvalue /Metaclass3       
doit
CompareAst removeAllMethods.
CompareAst class removeAllMethods.
%
! ------------------- Class methods for CompareAst
! ------------------- Instance methods for CompareAst
set compile_env: 0
category: 'other'
method: CompareAst
children

	^super children
		addAll: cmpopList;
		addAll: comparatorList;
		add: left;
		yourself
%
category: 'other'
method: CompareAst
evaluate
	| temp |
	temp := left evaluate.
	1 to: cmpopList size do: [:i |
		| op operand |
		op := cmpopList at: i.
		operand := (comparatorList at: i) evaluate.
		(op left: temp right: operand) ifFalse: [^false].
		temp := operand.
	].
	^true
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
