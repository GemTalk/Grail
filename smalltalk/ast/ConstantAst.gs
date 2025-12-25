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
		value := self string.
		^self finalize].
	char == $b ifTrue: [
		value := self string asByteArray.
		^self finalize].
	[char asString asInteger.
		value := self number. "constant is a number"
		^self finalize]
		on: ImproperOperation
		do: [].
	next := stream peekN: 4.
	next = 'None' ifTrue: [
		value := nil.
		stream next: 4.
		^self finalize].
	next = 'True' ifTrue: [
		value := true.
		stream next: 4.
		^self finalize].
	next := stream peekN: 5.
	next = 'False' ifTrue: [
		value := false.
		stream next: 5.
		^self finalize].
	self error: 'Constant type not yet supported'.
%
category: 'other'
method: ConstantAst
number

	| stream string x |
	stream := self stream.
	string := stream upTo: $,.
	stream skip: -1.
	^(string notEmpty and: [string last == $j]) ifTrue: [
		complex ___new___: 0 _: (string copyFrom: 1 to: string size - 1) asNumber.
	] ifFalse: [
		string asNumber.
	]
%
category: 'other'
method: ConstantAst
printSmalltalkOn: aStream

	value == true ifTrue: [
		aStream nextPutAll: 'true'.
		^self.
	].
	value == false ifTrue: [
		aStream nextPutAll: 'false'.
		^self.
	].
	value == nil ifTrue: [
		aStream nextPutAll: 'nil'.
		^self.
	].
	(value isKindOf: String) ifTrue: [
		aStream nextPutAll: value printString.
		^self.
	].
	(value isKindOf: ByteArray) ifTrue: [
		aStream nextPutAll: value printString.
		^self.
	].
	aStream nextPutAll: value.
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
