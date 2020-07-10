! ------------------- Remove existing behavior from PyUnaryop
expectvalue /Metaclass3       
doit
PyUnaryop removeAllMethods.
PyUnaryop class removeAllMethods.
%
! ------------------- Class methods for PyUnaryop
set compile_env: 0
category: 'other'
classmethod: PyUnaryop
parent: aNode
	"unaryop = Invert | Not | UAdd | USub"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyUnaryop
set compile_env: 0
category: 'other'
method: PyUnaryop
initialize
	"override to do nothing!"
%
category: 'other'
method: PyUnaryop
operand: operand
	^self subclassResponsibility
%
