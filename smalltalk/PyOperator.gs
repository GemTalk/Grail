! ------------------- Remove existing behavior from PyOperator
expectvalue /Metaclass3       
doit
PyOperator removeAllMethods.
PyOperator class removeAllMethods.
%
! ------------------- Class methods for PyOperator
set compile_env: 0
category: 'other'
classmethod: PyOperator
parent: aNode
	    "operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
                 | RShift | BitOr | BitXor | BitAnd | FloorDiv"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyOperator
set compile_env: 0
category: 'other'
method: PyOperator
initialize
	"override to do nothing!"
%
category: 'other'
method: PyOperator
left: leftOperand right: rightOperand

	self subclassResponsibility
%
