! ------------------- Remove existing behavior from PyBoolop
expectvalue /Metaclass3       
doit
PyBoolop removeAllMethods.
PyBoolop class removeAllMethods.
%
! ------------------- Class methods for PyBoolop
set compile_env: 0
category: 'other'
classmethod: PyBoolop
parent: aNode
	"boolop = And | Or"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyBoolop
set compile_env: 0
category: 'other'
method: PyBoolop
initialize
	"override to do nothing!"
%
