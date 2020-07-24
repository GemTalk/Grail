! ------------------- Remove existing behavior from BinOpAst
expectvalue /Metaclass3       
doit
BinOpAst removeAllMethods.
BinOpAst class removeAllMethods.
%
! ------------------- Class methods for BinOpAst
! ------------------- Instance methods for BinOpAst
set compile_env: 0
category: 'other'
method: BinOpAst
assertContextIsLoad

	self halt
%
category: 'other'
method: BinOpAst
children

	^super children
		add: left;
		add: op;
		add: right;
		yourself
%
category: 'other'
method: BinOpAst
evaluate
	^op left: left evaluate right: right evaluate
%
category: 'other'
method: BinOpAst
initialize
	"BinOp(expr left, operator op, expr right)"
	"If BinOp were the only use of operator, then we would replace it with a subclass of operator.
		But see also AugAssign()."

	left := self expression.
	self commaSpace.
	op := OperatorAst parent: self.
	self commaSpace.
	right := self expression.
	self readPosition.
%
