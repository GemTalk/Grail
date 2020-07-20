! ------------------- Remove existing behavior from ReturnAst
expectvalue /Metaclass3       
doit
ReturnAst removeAllMethods.
ReturnAst class removeAllMethods.
%
! ------------------- Class methods for ReturnAst
! ------------------- Instance methods for ReturnAst
set compile_env: 0
category: 'other'
method: ReturnAst
_value
	^ value
%
category: 'other'
method: ReturnAst
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: ReturnAst
evaluate

	^value evaluate
%
category: 'other'
method: ReturnAst
initialize
	"Return(expr? value)"
	
	| stream next |
	stream := self stream.
	next := stream peekN: 4.
	value := self optionalExpression.
	self readPosition.
%
