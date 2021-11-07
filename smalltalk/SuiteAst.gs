! ------------------- Remove existing behavior from SuiteAst
removeAllMethods SuiteAst
removeAllClassMethods SuiteAst
! ------------------- Class methods for SuiteAst
! ------------------- Instance methods for SuiteAst
set compile_env: 0
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
