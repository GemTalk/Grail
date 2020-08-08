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

	| expression iterator |
	expression := iter evaluate: aScope.
	iterator := expression
		call: #'__iter__' 
		withArguments: #() 
		keywords: SymbolDictionary new
		scope: aScope.
	[
		| each |
		[
			each := iterator
				call: #'__next__' 
				withArguments: #() 
				keywords: SymbolDictionary new
				scope: aScope.
			true.
		] whileTrue: [
			[
				target setTo: each in: aScope.
				body evaluate: aScope.
			] on: ContinueNotification do: [:ex |
				ex return.
			].
		].
	] on: BreakNotification , StopIteration do: [:ex |
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
