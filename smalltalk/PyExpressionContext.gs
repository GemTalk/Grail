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
isAbstract

	^self == PyExpressionContext
%
! ------------------- Instance methods for PyExpressionContext
set compile_env: 0
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
	"expr_context = Load | Store | Del | AugLoad | AugStore | Param"

	(self stream peekFor: $)) ifFalse: [self error].
%
