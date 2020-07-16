! ------------------- Remove existing behavior from PyIfExp
expectvalue /Metaclass3       
doit
PyIfExp removeAllMethods.
PyIfExp class removeAllMethods.
%
! ------------------- Class methods for PyIfExp
! ------------------- Instance methods for PyIfExp
set compile_env: 0
category: 'other'
method: PyIfExp
children

	^super children
		add: test;
		add: body;
		add: orelse;
		yourself
%
category: 'other'
method: PyIfExp
initialize
	"IfExp(expr test, expr body, expr orelse)"

	test := self expression.
	self commaSpace.
	body := self expression.
	self commaSpace.
	orelse := self expression.
	self readPosition.
%
