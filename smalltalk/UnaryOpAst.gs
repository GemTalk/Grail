! ------------------- Remove existing behavior from UnaryOpAst
expectvalue /Metaclass3       
doit
UnaryOpAst removeAllMethods.
UnaryOpAst class removeAllMethods.
%
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
_operand
	^ operand
%
category: 'other'
method: UnaryOpAst
children

	^super children
		add: operand;
		yourself
%
category: 'other'
method: UnaryOpAst
evaluate

	self subclassResponsibility.
%
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
