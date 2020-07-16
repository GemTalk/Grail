! ------------------- Remove existing behavior from PyIndex
expectvalue /Metaclass3       
doit
PyIndex removeAllMethods.
PyIndex class removeAllMethods.
%
! ------------------- Class methods for PyIndex
! ------------------- Instance methods for PyIndex
set compile_env: 0
category: 'other'
method: PyIndex
assign: aValue to: aVariable
	| x y |
	x := value evaluate.
	y := aVariable evaluate.
	y at: x + 1 put: aValue.
%
category: 'other'
method: PyIndex
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: PyIndex
evaluate: aList
	value assertContextIsLoad.
	^aList at: value evaluate + 1.
%
category: 'other'
method: PyIndex
initialize
	"Index(expr value)"
	
	value := self expression.
	(self stream peekFor: $)) ifFalse: [self error].
%
