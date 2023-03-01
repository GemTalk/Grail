! ------------------- Remove existing behavior from int
removeAllMethods int
removeAllClassMethods int
! ------------------- Class methods for int
set compile_env: 0
category: 'Python'
classmethod: int
__call__: aPythonObject
	^(self __new__: aPythonObject) __init__; yourself
%
category: 'Python'
classmethod: int
__new__: aPythonObject

	| instance |
	(aPythonObject isKindOf: int) ifTrue: [instance := aPythonObject. ^instance].
	(aPythonObject isKindOf: float) ifTrue: [instance := self basicNew ___value: aPythonObject ___value asInteger. ^instance].
	(aPythonObject isKindOf: str) ifTrue: [
		| value |
		value := [ 
			Integer fromString: aPythonObject ___value 
		] on: ImproperOperation do: [:ex |
			ValueError signal: 'int() arg is a malformed string'.
		].
		instance := self basicNew ___value: value. 
		^instance
	]. 
 	TypeError signal: 'TypeError: can''t convert ' , aPythonObject class name , ' to int'.
	^instance
%
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
category: 'Python-int'
method: int
___addInt: anInteger

	^int ___value: anInteger + value .
%
category: 'Python-int'
method: int
 ___pow: anObject

	^anObject ___powInt: value.
%
category: 'Python-int'
method: int
___powFloat: aFloat

	^float ___value: (aFloat raisedTo: value)
%
category: 'Python-int'
method: int
___powInt: anInteger

	| return |

	return := float ___value: (anInteger raisedTo: value).

	return = return __ceil__ ifTrue:[ return := int ___value: (return ___value)].
	
	^return
%
category: 'Python-int'
method: int
___powReal: aFloatReal imag: aFloatImag
		
	| radius radians result|


	radius := ((aFloatReal raisedTo: 2) + (aFloatImag raisedTo: 2)) sqrt.
	aFloatReal asFloat == 0.0
		ifTrue: [
			radians := (Float pi) / 2.
			aFloatImag < 0 ifTrue:[radians := radians + Float pi / 2].
		] ifFalse: [
			radians := ( aFloatImag / aFloatReal ) arcTan .
		].
			

	aFloatReal < 0
		ifTrue:[
			radians := radians + Float pi
		].

	result := complex
		___real: ((radius raisedTo: value) * ( (value * radians) cos))
		imaginary: ((radius raisedTo: value) * ( (value * radians) sin)).
	^result
%
category: 'Python-int'
method: int
__abs__

	^int ___value: value abs
%
category: 'Python-int'
method: int
__add__: anObject

	^anObject ___addInt: value.
%
category: 'Python-int'
method: int
__and__: anObject

	[
		| other |
		other := anObject.
		(other isKindOf: ExecBlock) ifTrue: [
			other := other value. "Evaluate the block"
		].

		^int ___value: (value bitAnd: other ___value)
	]
	on: MessageNotUnderstood
	do: [ TypeError signal: 'TypeError: unsupported operand type(s) for +: ''int'' and ''', anObject class asString,'''' ].
%
category: 'Python-int'
method: int
__bool__

	^bool ___value: value ~= 0
%
category: 'Python-int'
method: int
__ceil__
	^self
%
category: 'Python-int'
method: int
__divmod__: anObject

	^[tuple  ___value: { value // anObject ___value. value \\ anObject ___value }]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
__float__

	^float ___value: value
%
category: 'Python-int'
method: int
__floor__
	^self
%
category: 'Python-int'
method: int
__floordiv__: anObject

	^[int ___value: value // anObject ___value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
__getnewargs__

	self error: #pyTodo
%
category: 'Python-int'
method: int
__index__
	^self
%
category: 'Python-int'
method: int
__int__
	^self
%
category: 'Python-int'
method: int
__invert__

	^int ___value: (value negated - 1)
%
category: 'Python-int'
method: int
__lshift__: anIndex
	(anIndex ___value) < 0 ifTrue:[ValueError signal: 'ValueError: negative shift count'].
	^int ___value: (value bitShift: anIndex ___value)
%
category: 'Python-int'
method: int
__mod__: anObject

	^int ___value: (value rem: anObject ___value)
%
category: 'Python-int'
method: int
__mul__: anObject

	^[
		|temp|
		anObject class == int
			ifTrue:[
				temp := int ___value: value * anObject ___value
			]
			ifFalse:[
				temp := anObject __mul__: self
			].
		temp
	]
	on: MessageNotUnderstood
	do: [ TypeError signal: 'TypeError: unsupported operand type(s) for *: ''int'' and ''', anObject class asString,'''' ].
%
category: 'Python-int'
method: int
__neg__

	^int ___value: value negated
%
category: 'Python-int'
method: int
__or__: anObject

	^int ___value: (value bitOr: anObject ___value)
%
category: 'Python-int'
method: int
__pos__
	^self __abs__
%
category: 'Python-int'
method: int
__pow__: anObject

	^int ___value: (value raisedTo: anObject ___value)
%
category: 'Python-int'
method: int
__radd__: any

	^any __add__: self
%
category: 'Python-int'
method: int
__rand__: any

	^any __and__: self
%
category: 'Python-int'
method: int
__rdivmod__: any

	^any __divmod__: self
%
category: 'Python-int'
method: int
__rfloordiv__: any

	^any __floordiv__: self
%
category: 'Python-int'
method: int
__rlshift__: any
	(self ___value) < 0 ifTrue:[ValueError signal: 'ValueError: negative shift count'].
	^any __lshift__: self
%
category: 'Python-int'
method: int
__rmod__: any

	^any __mod__: self
%
category: 'Python-int'
method: int
__rmul__: any

	^any __mul__: self
%
category: 'Python-int'
method: int
__ror__: any

	^any __or__: self
%
category: 'Python-int'
method: int
__round__
	^self
%
category: 'Python-int'
method: int
__rpow__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rpow__: (int ___value: any)].
	^any __pow__: self
%
category: 'Python-int'
method: int
__rrshift__: any
	(self ___value) < 0 ifTrue:[ValueError signal: 'ValueError: negative shift count'].
	(any isKindOf: Magnitude)
		ifTrue: [^self __rrshift__: (int ___value: any)].
	^any __rshift__: self
%
category: 'Python-int'
method: int
__rshift__: anIndex
	(anIndex ___value) < 0 ifTrue:[ValueError signal: 'ValueError: negative shift count'].
	^int ___value: (value bitShift: anIndex ___value negated)
%
category: 'Python-int'
method: int
__rsub__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rsub__: (int ___value: any)].
	^any __sub__: self
%
category: 'Python-int'
method: int
__rtruediv__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rtruediv__: (int ___value: any)].
	^any __truediv__: self
%
category: 'Python-int'
method: int
__rxor__: any

	(any isKindOf: Magnitude)
		ifTrue: [^self __rxor__: (int ___value: any)].
	^any __xor__: self
%
category: 'Python-int'
method: int
__sub__: anObject

	^int ___value: value - anObject ___value
%
category: 'Python-int'
method: int
__truediv__: anObject

	^[float ___value: value / anObject ___value]
		on: ZeroDivide
		do: [ZeroDivisionError signal: 'ZeroDivisionError: division by zero']
%
category: 'Python-int'
method: int
__trunc__
	^self
%
category: 'Python-int'
method: int
__xor__: anObject

	^int ___value: (value bitXor: anObject ___value)
%
category: 'Python-int'
method: int
as_integer_ratio
	| val |

	val := value asFraction.
   ^tuple ___value: { val numerator. val denominator }
%
category: 'Python-int'
method: int
bit_length

	^int ___value: (value highBit ifNil: [0])
%
category: 'Python-int'
method: int
conjugate
	^self
%
category: 'Python-int'
method: int
denominator

	^int ___value: 1
%
category: 'Python-int'
method: int
from_bytes
	"https://docs.python.org/3/library/stdtypes.html#int.from_bytes"

	self error: #pyTodo
%
category: 'Python-int'
method: int
imag

	^int ___value: 0
%
category: 'Python-int'
method: int
numerator
	^self
%
category: 'Python-int'
method: int
real
	^self
%
category: 'Python-int'
method: int
to_bytes
	"https://docs.python.org/3/library/stdtypes.html#int.to_bytes"
	
	self error: #pyTodo
%
set compile_env: 0
category: 'Python-object'
method: int
__eq__: anObject

	^bool ___value: (self ___value == anObject ___value)
%
category: 'Python-object'
method: int
__ge__: anObject
 
	^bool ___value: value >= anObject ___value
%
category: 'Python-object'
method: int
__gt__: anObject

	^bool ___value: value > anObject ___value
%
category: 'Python-object'
method: int
__le__: anObject

	^bool ___value: value <= anObject ___value
%
category: 'Python-object'
method: int
__lt__: anObject

	^bool ___value: value < anObject ___value
%
category: 'Python-object'
method: int
__ne__: anObject

	^bool ___value: value ~= anObject ___value
%
category: 'Python-object'
method: int
__repr__

	^str ___value: value printString
%
set compile_env: 0
category: 'Smalltalk'
method: int
___parse: stringArg

	| integer stream |
	stream := ReadStream on: stringArg ___string.
	[
		integer := Integer fromStream: stream.
	] on: Error do: [:ex |].
	stream atEnd ifTrue: [
		^self ___value: integer
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
