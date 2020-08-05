! ------------------- Remove existing behavior from ForAst
expectvalue /Metaclass3       
doit
ForAst removeAllMethods.
ForAst class removeAllMethods.
%
! ------------------- Class methods for ForAst
! ------------------- Instance methods for ForAst
set compile_env: 0
category: 'other'
method: ForAst
children

	^super children
		add: target;
		add: iter;
		add: body;
		add: orelse;
		yourself
%
category: 'other'
method: ForAst
evaluate: aScope

	[
		(iter evaluate: aScope) do: [:each | 
			[
				aScope set: target to: each.
				body evaluate: aScope.
			] on: ContinueNotification do: [:ex |
				ex return.
			].
		].
	] on: BreakNotification do: [:ex |
		ex return.
	].
	orelse evaluate: aScope.
%
category: 'other'
method: ForAst
initialize
	"For(expr target, expr iter, stmt* body, stmt* orelse)"

	target := self expression.
	self commaSpace. 
	iter := self expression. 
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace. 
	orelse := SuiteAst parent: self.
	self readPosition.
%
