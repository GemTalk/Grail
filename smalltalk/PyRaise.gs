! ------------------- Remove existing behavior from PyRaise
expectvalue /Metaclass3       
doit
PyRaise removeAllMethods.
PyRaise class removeAllMethods.
%
! ------------------- Class methods for PyRaise
! ------------------- Instance methods for PyRaise
set compile_env: 0
category: 'other'
method: PyRaise
_cause
	^ cause
%
category: 'other'
method: PyRaise
_exc
	^ exc
%
category: 'other'
method: PyRaise
children

	^super children
		add: exc;
		add: cause;
		yourself
%
category: 'other'
method: PyRaise
initialize
	"Raise(expr? exc, expr? cause)"

	exc := self optionalExpression.
	self commaSpace.
	cause := self optionalExpression.
	self readPosition.
%
