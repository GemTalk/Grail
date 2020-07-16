! ------------------- Remove existing behavior from PyTuple
expectvalue /Metaclass3       
doit
PyTuple removeAllMethods.
PyTuple class removeAllMethods.
%
! ------------------- Class methods for PyTuple
! ------------------- Instance methods for PyTuple
set compile_env: 0
category: 'other'
method: PyTuple
_ctx
	^ ctx
%
category: 'other'
method: PyTuple
_elts
	^ elts
%
category: 'other'
method: PyTuple
children

	^super children
		add: ctx;
		addAll: elts;
		yourself
%
category: 'other'
method: PyTuple
evaluate
	"May wish to revisit context"
	^Py_Tuple withAll: (elts collect: [:each | each evaluate]) immediateInvariant
%
category: 'other'
method: PyTuple
initialize
	"Tuple(expr* elts, expr_context ctx)"

	elts := self collectAst: [self expression].
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
category: 'other'
method: PyTuple
saveVariableAssociation
	"Not really a variable?"
%
