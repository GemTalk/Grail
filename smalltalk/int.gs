! ------------------- Remove existing behavior from int
removeAllMethods int
removeAllClassMethods int
! ------------------- Class methods for int
set compile_env: 0
category: 'Smalltalk'
classmethod: int
___assertMagnitudeAsFirstAgumentOn: args
	((args first isKindOf: (Globals at: #'Magnitude')) or: [args first isKindOf: Magnitude])
		ifFalse: [TypeError signal: self name, '() first argument must be a string or a number, not ''', args first class name,''''].
%
category: 'Smalltalk'
classmethod: int
___assertMagnitudeAsSecondAgumentOn: args
	((args second isKindOf: (Globals at: #'Magnitude')) or: [args second isKindOf: Magnitude])
		ifFalse: [TypeError signal: self name, '() second argument must be a number, not ''', args second class name,''''].
%
category: 'Smalltalk'
classmethod: int
___value: aNumber

	(aNumber isKindOf: Number) ifFalse: [
		ValueError signal: 'int() arg is a malformed string'.
	].
	^self basicNew
		___value: aNumber asInteger;
		yourself
%
! ------------------- Instance methods for int
set compile_env: 0
category: 'Python'
method: int
__abs__

	^int ___value: value abs
%
category: 'Python'
method: int
__add__: anObject

	^int ___value: value + anObject ___value
%
category: 'Python'
method: int
__and__: anObject

	^int ___value: (value bitAnd: anObject ___value)
%
category: 'Python'
method: int
__bool__

	^bool ___value: value ~= 0
%
category: 'Python'
method: int
__ceil__
	^self
%
category: 'Python'
method: int
__divmod__: anObject

	^tuple  ___new__init__: { value // anObject ___value. value \\ anObject ___value }
%
category: 'Python'
method: int
__eq__: anObject

	^bool ___value: value = anObject ___value
%
category: 'Python'
method: int
__float__

	^float ___value: value
%
category: 'Python'
method: int
__floor__
	^self
%
category: 'Python'
method: int
__floordiv__: anObject

	^int ___value: value // anObject ___value
%
category: 'Python'
method: int
__ge__: anObject
 
	^bool ___value: value >= anObject ___value
%
category: 'Python'
method: int
__gt__: anObject

	^bool ___value: value > anObject ___value
%
category: 'Python'
method: int
__index__
	^self
%
category: 'Python'
method: int
__int__
	^self
%
category: 'Python'
method: int
__invert__

	^int ___value: (value negated - 1)
%
category: 'Python'
method: int
__le__: anObject

	^bool ___value: value <= anObject ___value
%
category: 'Python'
method: int
__lshift__: anIndex

	^int ___value: (value bitShift: anIndex ___value)
%
category: 'Python'
method: int
__lt__: anObject

	^bool ___value: value < anObject ___value
%
category: 'Python'
method: int
__mod__: anObject

	^int ___value: (value rem: anObject ___value)
%
category: 'Python'
method: int
__mul__: anObject

	^(anObject isKindOf: float) ifTrue: [
		float ___value: value * anObject ___value
	] ifFalse: [
		int ___value: value * anObject ___value
	].
%
category: 'Python'
method: int
__ne__: anObject

	^bool ___value: value ~= anObject ___value
%
category: 'Python'
method: int
__neg__

	^int ___value: value negated
%
category: 'Python'
method: int
__or__: anObject

	^int ___value: (value bitOr: anObject ___value)
%
category: 'Python'
method: int
__pos__
	^self __abs__
%
category: 'Python'
method: int
__pow__: anObject

	^int ___value: (value raisedTo: anObject ___value)
%
category: 'Python'
method: int
__radd__: any

	^any __add__: self
%
category: 'Python'
method: int
__rand__: any

	^any __and__: self
%
category: 'Python'
method: int
__rdivmod__: any

	^any __divmod__: self
%
category: 'Python'
method: int
__repr__
	^value printString
%
category: 'Python'
method: int
__rfloordiv__: any

	^any __floordiv__: self
%
category: 'Python'
method: int
__rlshift__: any

	^any __lshift__: self
%
category: 'Python'
method: int
__rmod__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rmod__: (self class ___new__init__: any)].
	^any __mod__: self
%
category: 'Python'
method: int
__rmul__: any

	^any __mul__: self
%
category: 'Python'
method: int
__ror__: any
	(any isKindOf: Magnitude)
		ifFalse: [^self __ror__: (self class ___new__init__: any)].
	^any __or__: self
%
category: 'Python'
method: int
__round__
	^self
%
category: 'Python'
method: int
__rpow__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rpow__: (int ___value: any)].
	^any __pow__: self
%
category: 'Python'
method: int
__rrshift__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rrshift__: (int ___value: any)].
	^any __rshift__: self
%
category: 'Python'
method: int
__rshift__: anIndex

	^int ___value: (value bitShift: anIndex ___value negated)
%
category: 'Python'
method: int
__rsub__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rsub__: (int ___value: any)].
	^any __sub__: self
%
category: 'Python'
method: int
__rtruediv__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rtruediv__: (int ___value: any)].
	^any __truediv__: self
%
category: 'Python'
method: int
__rxor__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rxor__: (int ___value: any)].
	^any __xor__: self
%
category: 'Python'
method: int
__sub__: anObject

	^int ___value: value - anObject ___value
%
category: 'Python'
method: int
__truediv__: anObject

	^float ___value: value / anObject ___value
%
category: 'Python'
method: int
__trunc__
	^self
%
category: 'Python'
method: int
__xor__: anObject

	^int ___value: (value bitXor: anObject ___value)
%
category: 'Python'
method: int
as_integer_ratio
	| val |

	val := value asFraction.
   ^tuple ___new__init__: { val numerator. val denominator }
%
category: 'Python'
method: int
bit_length

	^int ___value: (value highBit ifNil: [0])
%
category: 'Python'
method: int
conjugate
	^self
%
category: 'Python'
method: int
denominator

	^int ___value: 1
%
category: 'Python'
method: int
imag

	^int ___value: 0
%
category: 'Python'
method: int
is_integer

	^bool ___value: true
%
category: 'Python'
method: int
numerator
	^self
%
category: 'Python'
method: int
real
	^self
%
set compile_env: 0
category: 'Smalltalk'
method: int
___initArgs: args

	args isEmpty ifTrue: [^self ___initialize: 0 _: 10].

	((args first isKindOf: String) or: [args first  isKindOf: str])
		ifTrue: [^self ___parse: args first].

	self class ___assertMagnitudeAsFirstAgumentOn: args.
	(args size = 1)
		ifTrue: [^self ___initialize: args first _: 10].

	self class ___assertMagnitudeAsSecondAgumentOn: args.
   ^self ___initialize: args first _: args second.
%
category: 'Smalltalk'
method: int
___initialize: val _: base
	"https://docs.python.org/3/library/functions.html#int"

	(val isKindOf: int) ifTrue: [value := val ___value. ^self].
	(val isKindOf: float) ifTrue: [value := val ___value asInteger. ^self].
 	TypeError signal: 'TypeError: can''t convert ' , val class name , ' to int'.
%
category: 'Smalltalk'
method: int
___parse: stringArg

	| int stream |
	stream := ReadStream on: stringArg ___string.
	[
		int := Integer fromStream: stream.
	] on: Error do: [:ex |].
	stream atEnd ifTrue: [
		^self ___value: int
	].
	ValueError signal: self class name, '() arg is a malformed string'
%
category: 'Smalltalk'
method: int
___value

	^value
%
category: 'Smalltalk'
method: int
___value: anInteger

	value := anInteger
%
category: 'Smalltalk'
method: int
printOn: aStream

	aStream
		nextPutAll: 'int(';
		print: value;
		nextPut: $).
%
