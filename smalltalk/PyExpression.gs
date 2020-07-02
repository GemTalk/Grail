! ------------------- Remove existing behavior from PyExpression
expectvalue /Metaclass3       
doit
PyExpression removeAllMethods.
PyExpression class removeAllMethods.
%
! ------------------- Class methods for PyExpression
set compile_env: 0
category: 'other'
classmethod: PyExpression
expressionFrom: aNode

| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	class := PythonGlobals at: symbol.
	^class parent: aNode
%
! ------------------- Instance methods for PyExpression
set compile_env: 0
category: 'other'
method: PyExpression
evaluate

	self subclassResponsibility.
%
