! ------------------- Remove existing behavior from WhileAst
expectvalue /Metaclass3       
doit
WhileAst removeAllMethods.
WhileAst class removeAllMethods.
%
! ------------------- Class methods for WhileAst
! ------------------- Instance methods for WhileAst
set compile_env: 0
category: 'other'
method: WhileAst
children

	^super children
		add: test;
		add: body;
		add: orelse;
		yourself
%
category: 'other'
method: WhileAst
evaluate: aScope
	[
		[
			test evaluate: aScope.
		] whileTrue: [
			[
				body do: [:each | each evaluate: aScope].
			] on: ContinueNotification do: [:ex |
				ex return.
			].
		].
	] on: BreakNotification do: [:ex | 
		ex return.
	].
	orelse do: [:each | each evaluate: aScope].
%
category: 'other'
method: WhileAst
initialize
	"While(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace.
	orelse := SuiteAst parent: self.
	self readPosition.
%
