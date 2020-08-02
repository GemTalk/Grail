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
children

	^super children
		add: test;
		add: body;
		add: orelse;
		yourself
%
category: 'other'
method: IfAst
evaluate: aScope

	(test evaluate: aScope)
		ifTrue: [body do: [:each | each evaluate: aScope]]
		ifFalse: [orelse do: [:each | each evaluate: aScope]].
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
