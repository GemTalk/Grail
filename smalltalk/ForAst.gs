! ------------------- Remove existing behavior from ForAst
removeAllMethods ForAst
removeAllClassMethods ForAst
! ------------------- Class methods for ForAst
! ------------------- Instance methods for ForAst
set compile_env: 0
category: 'other'
method: ForAst
evaluate: aScope

	| expression iterator |
	expression := iter evaluate: aScope.
	iterator := expression __iter__ value.
	[
		| each |
		[
			each := iterator __next__ value.
			true.
		] whileTrue: [
			[
				target setTo: each scope: aScope.
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
	"For(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)"

	target := self expression.
	self commaSpace. 
	iter := self expression. 
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace. 
	orelse := SuiteAst parent: self.
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
