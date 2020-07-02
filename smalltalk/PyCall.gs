! ------------------- Remove existing behavior from PyCall
expectvalue /Metaclass3       
doit
PyCall removeAllMethods.
PyCall class removeAllMethods.
%
! ------------------- Class methods for PyCall
! ------------------- Instance methods for PyCall
set compile_env: 0
category: 'Accessing'
method: PyCall
arguments
	^arguments
%
category: 'Accessing'
method: PyCall
functionName
	^function id
%
category: 'Accessing'
method: PyCall
keywords
	^keywords
%
set compile_env: 0
category: 'other'
method: PyCall
addMissingPositions

	function addMissingPositions.
	arguments do: [:each | each addMissingPositions].
%
category: 'other'
method: PyCall
evaluate
	"https://docs.python.org/3/reference/expressions.html#calls"
	"We should do an elaborate name lookup, but we'll just start with built-in functions"

	| myArguments myKeywords mySelector |
	mySelector := (self functionName , ':keywords:') asSymbol.
	myArguments := self arguments collect: [:each | each evaluate].
	myKeywords := Dictionary new.
	self keywords do: [:each | 
		myKeywords at: each name put: each value evaluate.
	].
	^function call: mySelector arguments: myArguments keywords: myKeywords.
%
category: 'other'
method: PyCall
initialize
	"Call(expr func, expr* args, keyword* keywords)"
	
	function := self expression.
	self commaSpace.
	arguments := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [PyKeyword parent: self].
	self readPosition.
%
