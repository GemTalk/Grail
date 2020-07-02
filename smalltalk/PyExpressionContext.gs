! ------------------- Remove existing behavior from PyExpressionContext
expectvalue /Metaclass3       
doit
PyExpressionContext removeAllMethods.
PyExpressionContext class removeAllMethods.
%
! ------------------- Class methods for PyExpressionContext
set compile_env: 0
category: 'other'
classmethod: PyExpressionContext
parent: aNode
	"expr_context = Load | Store | Del | AugLoad | AugStore | Param"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyExpressionContext
set compile_env: 0
category: 'other'
method: PyExpressionContext
addMissingPositions

	| token |
	token := self stream next.
self halt.
%
category: 'other'
method: PyExpressionContext
assertIsLoad

	self error: 'Expression Context should be <Load> but is <' , self class name , '>'.
%
category: 'other'
method: PyExpressionContext
assertIsStore

	self error: 'Expression Context should be <Store> but is <' , self class name , '>'.
%
category: 'other'
method: PyExpressionContext
initialize
	"override to do nothing!"
%
