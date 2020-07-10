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
	"Pywithitem may return an instance of PyWithItem"
	^class parent: aNode

"
	self == PyStatement ifTrue: [
		^self customChildForParent: aNode peekForCloseParenthesis: true.
	] ifFalse: [
		^super parent: aNode
	].
"
%
! ------------------- Instance methods for PyStatement
set compile_env: 0
category: 'other'
method: PyStatement
evaluate

	self subclassResponsibility.
%
