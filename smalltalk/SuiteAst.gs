! ------------------- Remove existing behavior from SuiteAst
removeallmethods SuiteAst
removeallclassmethods SuiteAst
! ------------------- Class methods for SuiteAst
! ------------------- Instance methods for SuiteAst
category: 'other'
method: SuiteAst
body

	^body
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
		stream skipSeparators; peekFor: $]
	] whileFalse: [
		node := StatementAst statementFrom: self.
		body add: node.
		(stream peekFor: $,) ifFalse: [self error].
	].
%
category: 'other'
method: SuiteAst
printSmalltalkOn: aStream
	
	body size == 1 ifTrue: [
		 (body at: 1) printSmalltalkOn: aStream.
	] ifFalse: [
		body do: [:each |
			each printSmalltalkOn: aStream.
			aStream nextPut: $.; lf; yourself.
		].
		aStream position: aStream position - 1.

		aStream lf.
	].
%
