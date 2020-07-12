! ------------------- Remove existing behavior from PyCompare
expectvalue /Metaclass3       
doit
PyCompare removeAllMethods.
PyCompare class removeAllMethods.
%
! ------------------- Class methods for PyCompare
! ------------------- Instance methods for PyCompare
set compile_env: 0
category: 'other'
method: PyCompare
_cmpopList
	^ cmpopList
%
category: 'other'
method: PyCompare
_comparatorList
	^ comparatorList
%
category: 'other'
method: PyCompare
_left
	^ left
%
category: 'other'
method: PyCompare
evaluate
	| temp |
	temp := left evaluate.
	1 to: cmpopList size do: [:i |
		| op operand |
		op := cmpopList at: i.
		operand := (comparatorList at: i) evaluate.
		(op left: temp right: operand) ifFalse: [^false].
		temp := operand.
	].
	^true
%
category: 'other'
method: PyCompare
initialize
	"Compare(expr left, cmpop* ops, expr* comparators)"

	| stream |
	stream := self stream.
	left := self expression.
	self commaSpace.
	cmpopList := self collectAst: [PyCmpOp parent: self].
	self commaSpace.
	comparatorList := self collectAst: [self expression].
	self readPosition.
%
