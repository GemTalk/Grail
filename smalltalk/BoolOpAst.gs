! ------------------- Remove existing behavior from BoolOpAst
expectvalue /Metaclass3       
doit
BoolOpAst removeAllMethods.
BoolOpAst class removeAllMethods.
%
! ------------------- Class methods for BoolOpAst
set compile_env: 0
category: 'other'
classmethod: BoolOpAst
isAbstract

	^self == BoolOpAst
%
! ------------------- Instance methods for BoolOpAst
set compile_env: 0
category: 'other'
method: BoolOpAst
evaluate: aScope

	self subclassResponsibility.
%
category: 'other'
method: BoolOpAst
initialize
	"BoolOp(boolop op, expr* values)
				boolop = And | Or"

	(self stream peekFor: $)) ifFalse: [self error].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
