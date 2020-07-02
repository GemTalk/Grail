! ------------------- Remove existing behavior from PyNonlocal
expectvalue /Metaclass3       
doit
PyNonlocal removeAllMethods.
PyNonlocal class removeAllMethods.
%
! ------------------- Class methods for PyNonlocal
! ------------------- Instance methods for PyNonlocal
set compile_env: 0
category: 'other'
method: PyNonlocal
_names
	^ names
%
category: 'other'
method: PyNonlocal
addMissingPositions
%
category: 'other'
method: PyNonlocal
initialize
	"Nonlocal(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		self stream upTo: $'.].
	self readPosition.
%
