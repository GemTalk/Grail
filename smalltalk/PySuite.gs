! ------------------- Remove existing behavior from PySuite
expectvalue /Metaclass3       
doit
PySuite removeAllMethods.
PySuite class removeAllMethods.
%
! ------------------- Class methods for PySuite
! ------------------- Instance methods for PySuite
set compile_env: 0
category: 'other'
method: PySuite
children

	^super children
		addAll: body;
		yourself
%
category: 'other'
method: PySuite
evaluate

	| result |
	body do: [:each | result := each evaluate].
	^result
%
category: 'other'
method: PySuite
initialize

	| stream node |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	body := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		node := PyStatement statementFrom: self.
		body add: node.
		(stream peekFor: $,) ifTrue: [stream peekFor: Character space].
	].
%
