! ------------------- Remove existing behavior from SuiteAst
expectvalue /Metaclass3       
doit
SuiteAst removeAllMethods.
SuiteAst class removeAllMethods.
%
! ------------------- Class methods for SuiteAst
! ------------------- Instance methods for SuiteAst
set compile_env: 0
category: 'other'
method: SuiteAst
children

	^super children
		addAll: body;
		yourself
%
category: 'other'
method: SuiteAst
evaluate: aScope

	^[
		body do: [:each | each evaluate: aScope].
		nil.
	] on: ReturnNotification do: [:ex | 
		ex return: ex value.
	].
%
category: 'other'
method: SuiteAst
initialize

	| stream node |
	parent setBlock: self.
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	body := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		node := StatementAst statementFrom: self.
		body add: node.
		(stream peekFor: $,) ifTrue: [stream peekFor: Character space].
	].
%
