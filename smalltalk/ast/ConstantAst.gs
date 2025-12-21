! ------------------- Remove existing behavior from ConstantAst
removeallmethods ConstantAst
removeallclassmethods ConstantAst
! ------------------- Class methods for ConstantAst
category: 'other'
classmethod: ConstantAst
parent: aNode

	^self basicNew
		initialize: aNode;
		yourself
%
! ------------------- Instance methods for ConstantAst
category: 'other'
method: ConstantAst
finalize

	| stream |
	stream := self stream.
	self commaSpace.
	kind := self optionalString. "https://bugs.python.org/issue36280"
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
		value := 'str ___value: ', self string printString. "constant is a string"
		^self finalize].
	char == $b ifTrue: [
		value := 'bytes ___fromAsciiString: ', self string printString."constant is a string"
		^self finalize].
	[char asString asInteger.
		value := self number. "constant is a number"
		^self finalize]
		on: ImproperOperation
		do: [].
	next := stream peekN: 4.
	next = 'None' ifTrue: [value := 'None'. "constant is None"
		stream next: 4.
		^self finalize].
	next = 'True' ifTrue: [value := 'True'. "constant is True"
		stream next: 4.
		^self finalize].
	next := stream peekN: 5.
	next = 'False' ifTrue: [value := 'False'. "constant is False"
		stream next: 5.
		^self finalize].
%
category: 'other'
method: ConstantAst
number

	| stream string x |
	stream := self stream.
	string := stream upTo: $,.
	stream skip: -1.
	^(string notEmpty and: [string last == $j]) ifTrue: [
		'complex ___real: 0 imaginary: ' , (string copyFrom: 1 to: string size - 1) asNumber printString.
	] ifFalse: [
		x := string asNumber.
		(x isKindOf: Integer)
			ifTrue: ['int ___value: ', x printString]
			ifFalse: ['float ___value: ' , x printString].
	]
%
category: 'other'
method: ConstantAst
printSmalltalkOn: aStream

%
category: 'other'
method: ConstantAst
set: container to: anObject scope: aScope

	container
		set: value
		to: anObject.
%
category: 'other'
method: ConstantAst
value

	^value
%
