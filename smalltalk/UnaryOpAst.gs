! ------------------- Remove existing behavior from UnaryOpAst
removeAllMethods UnaryOpAst
removeAllClassMethods UnaryOpAst
! ------------------- Class methods for UnaryOpAst
set compile_env: 0
category: 'other'
classmethod: UnaryOpAst
isAbstract

	^self == UnaryOpAst
%
! ------------------- Instance methods for UnaryOpAst
set compile_env: 0
category: 'other'
method: UnaryOpAst
initialize
	"UnaryOp(unaryop op, expr operand)"
	"unaryop = Invert | Not | UAdd | USub"

	(self stream peekFor: $)) ifFalse: [self error].
	self commaSpace.
	operand := self expression.
	self readPosition.
%
