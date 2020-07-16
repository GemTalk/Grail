! ------------------- Remove existing behavior from PySlice
expectvalue /Metaclass3       
doit
PySlice removeAllMethods.
PySlice class removeAllMethods.
%
! ------------------- Class methods for PySlice
! ------------------- Instance methods for PySlice
set compile_env: 0
category: 'other'
method: PySlice
_lower
	^ lower
%
category: 'other'
method: PySlice
_step
	^ step
%
category: 'other'
method: PySlice
_upper
	^ upper
%
category: 'other'
method: PySlice
children

	^super children
		add: lower;
		add: step;
		add: upper;
		yourself
%
category: 'other'
method: PySlice
evaluate: aList
	self halt.
%
category: 'other'
method: PySlice
initialize
	"Slice(expr? lower, expr? upper, expr? step)"

	lower:= self optionalExpression.
	self commaSpace.
	upper := self optionalExpression.
	self commaSpace.
	step := self optionalExpression.
	(self stream peekFor: $)) ifFalse: [self error].
%
