! ------------------- Remove existing behavior from PyCall
expectvalue /Metaclass3       
doit
PyCall removeAllMethods.
PyCall class removeAllMethods.
%
! ------------------- Class methods for PyCall
! ------------------- Instance methods for PyCall
set compile_env: 0
category: 'other'
method: PyCall
children

	^super children
		addAll: arguments;
		add: function;
		addAll: keywords;
		yourself
%
category: 'other'
method: PyCall
evaluate
	"https://docs.python.org/3/reference/expressions.html#calls"

	^function evaluate 
		callWith: arguments
		keywords: keywords
%
category: 'other'
method: PyCall
initialize
	"Call(expr func, expr* args, keyword* keywords)"
	
	function := self expression.
	self commaSpace.
	arguments := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [PyKeyword parent: self].
	self readPosition.
%
