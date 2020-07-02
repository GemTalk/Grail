! ------------------- Remove existing behavior from PyGlobal
expectvalue /Metaclass3       
doit
PyGlobal removeAllMethods.
PyGlobal class removeAllMethods.
%
! ------------------- Class methods for PyGlobal
! ------------------- Instance methods for PyGlobal
set compile_env: 0
category: 'other'
method: PyGlobal
_names
	^ names
%
category: 'other'
method: PyGlobal
addMissingPositions
%
category: 'other'
method: PyGlobal
initialize
	"Global(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		self stream upTo: $'.].
	self readPosition.
%
