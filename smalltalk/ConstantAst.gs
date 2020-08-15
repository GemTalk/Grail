! ------------------- Remove existing behavior from ConstantAst
expectvalue /Metaclass3       
doit
ConstantAst removeAllMethods.
ConstantAst class removeAllMethods.
%
! ------------------- Class methods for ConstantAst
set compile_env: 0
category: 'other'
classmethod: ConstantAst
parent: aNode

	^ self basicNew
		initialize: aNode;
		yourself
%
! ------------------- Instance methods for ConstantAst
set compile_env: 0
category: 'other'
method: ConstantAst
evaluate: aScope

	^ value
%
category: 'other'
method: ConstantAst
finalize

	| stream |
	stream := self stream.
	self commaSpace.
	kind := self optionalString.
	self readPosition.
%
category: 'other'
method: ConstantAst
initialize
	"Constant(constant value, string? kind)

	A constant value. The value attribute of the Constant literal contains the Python object it represents. 
	The values represented can be simple types such as a number, string or None, but also immutable container types (tuples and frozensets) if all of their elements are constant."

	| stream char next |
	stream := self stream.
	char := stream peek.
	(char == $' or: [char == $"]) ifTrue: [ 
		value := self string. "constant is a string"
		^ self finalize ].
	char == $b ifTrue: [ 
		value := bytes withAll: self string ___container. "constant is a string"
		^ self finalize ].
	[ char asString asInteger. 
		value := self number. "constant is a number"
		^ self finalize ]	
		on: ImproperOperation
		do: [ ]. 
	next := stream peekN: 4.
	next = 'None' ifTrue: [ value := None. "constant is None"
		stream next: 4.
		^ self finalize ]. 
	next = 'True' ifTrue: [ value := True. "constant is True"
		stream next: 4.
		^ self finalize ]. 
	next := stream peekN: 5.
	next = 'False' ifTrue: [ value := False. "constant is False"
		stream next: 5.
		^ self finalize ].
%
