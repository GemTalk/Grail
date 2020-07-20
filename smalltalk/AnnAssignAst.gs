! ------------------- Remove existing behavior from AnnAssignAst
expectvalue /Metaclass3       
doit
AnnAssignAst removeAllMethods.
AnnAssignAst class removeAllMethods.
%
! ------------------- Class methods for AnnAssignAst
! ------------------- Instance methods for AnnAssignAst
set compile_env: 0
category: 'other'
method: AnnAssignAst
children

	^super children
		add: annotation;
		add: simple;
		add: target;
		add: value;
		yourself
%
category: 'other'
method: AnnAssignAst
initialize
	"AnnAssign(expr target, expr annotation, expr? value, int simple)"

	| stream | 
	stream := self stream.
	target := self expression.
	self commaSpace.
	annotation := self expression. 
	self commaSpace.
	value := self optionalExpression.
	self commaSpace.
	simple := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
