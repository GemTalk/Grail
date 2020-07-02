! ------------------- Remove existing behavior from PyStatement
expectvalue /Metaclass3       
doit
PyStatement removeAllMethods.
PyStatement class removeAllMethods.
%
! ------------------- Class methods for PyStatement
set compile_env: 0
category: 'other'
classmethod: PyStatement
statementFrom: aNode

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	class := PythonGlobals at: symbol.
	^class parent: aNode
%
! ------------------- Instance methods for PyStatement
set compile_env: 0
category: 'other'
method: PyStatement
evaluate

	self subclassResponsibility.
%
