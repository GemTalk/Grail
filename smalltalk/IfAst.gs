! ------------------- Remove existing behavior from IfAst
expectvalue /Metaclass3       
doit
IfAst removeAllMethods.
IfAst class removeAllMethods.
%
! ------------------- Class methods for IfAst
! ------------------- Instance methods for IfAst
set compile_env: 0
category: 'other'
method: IfAst
evaluate: aScope

	(test evaluate: aScope) == True
		ifTrue: [body evaluate: aScope]
		ifFalse: [orelse evaluate: aScope].
%
category: 'other'
method: IfAst
initialize
	"If(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	orelse := SuiteAst parent: self.
	self readPosition.
%
