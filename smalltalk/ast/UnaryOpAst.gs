! ------------------- Remove existing behavior from UnaryOpAst
removeallmethods UnaryOpAst
removeallclassmethods UnaryOpAst
set compile_env: 0
! ------------------- Class methods for UnaryOpAst
category: 'other'
classmethod: UnaryOpAst
isAbstract

	^self == UnaryOpAst
%
! ------------------- Instance methods for UnaryOpAst
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
category: 'other'
method: UnaryOpAst
printSmalltalkOn: aStream

	self halt.
%
