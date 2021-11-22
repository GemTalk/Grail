! ------------------- Remove existing behavior from int
removeAllMethods int
removeAllClassMethods int
! ------------------- Class methods for int
set compile_env: 0
category: 'Smalltalk'
classmethod: int
___assertMagnitudeAsFirstAgumentOn: args
	( ( args first isKindOf: (Globals at: #'Magnitude') ) or: [ args first isKindOf: Magnitude ] )
		ifFalse: [ TypeError signal: self name, '() first argument must be a string or a number, not ''', args first class name,'''' ].
%
category: 'Smalltalk'
classmethod: int
___assertMagnitudeAsSecondAgumentOn: args
	( ( args second isKindOf: (Globals at: #'Magnitude') ) or: [ args second isKindOf: Magnitude ] )
		ifFalse: [ TypeError signal: self name, '() second argument must be a number, not ''', args second class name,'''' ].
%
! ------------------- Instance methods for int
set compile_env: 0
category: 'Python'
method: int
__abs__
	^ self class ___new__init__: value abs
%
category: 'Python'
method: int
__and__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: (value bitAnd: val) _: 10
%
category: 'Python'
method: int
__ceil__
	^ self
%
category: 'Python'
method: int
__divmod__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ tuple  ___new__init__: { value // val. value \\ val }
%
category: 'Python'
method: int
__float__
	^ float ___new__init__: value
%
category: 'Python'
method: int
__floor__
	^ self
%
category: 'Python'
method: int
__gt__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ value > val
%
category: 'Python'
method: int
__index__
	^ self
%
category: 'Python'
method: int
__int__
	^ self
%
category: 'Python'
method: int
__invert__
	^ self class ___new__init__: ( value negated - 1 )
%
category: 'Python'
method: int
__lshift__: anIndex
	| val |
	val := ( anIndex isKindOf: Number )
	   ifTrue: [ anIndex ]
		ifFalse: [ anIndex ___value ].
	^ self class ___new__init__: (value bitShift: val)
%
category: 'Python'
method: int
__mod__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: ( value rem: val )
%
category: 'Python'
method: int
__mul__: anObject

	^(anObject isKindOf: float) ifTrue: [
		float ___new__init__: value * anObject ___value
	] ifFalse: [
		int ___new__init__: value * anObject ___value
	].
%
category: 'Python'
method: int
__neg__
	^ self class ___new__init__: value negated
%
category: 'Python'
method: int
__or__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: (value bitOr: val) _: 10
%
category: 'Python'
method: int
__pos__
	^ self __abs__
%
category: 'Python'
method: int
__pow__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: (value raisedTo: val)
%
category: 'Python'
method: int
__repr__
	^ value printString
%
category: 'Python'
method: int
__rlshift__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rlshift__: ( self class ___new__init__: any ) ].
	^ any __lshift__: self
%
category: 'Python'
method: int
__ror__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __ror__: ( self class ___new__init__: any ) ].
	^ any __or__: self
%
category: 'Python'
method: int
__round__
	^ self
%
category: 'Python'
method: int
__rrshift__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rrshift__: ( self class ___new__init__: any ) ].
	^ any __rshift__: self
%
category: 'Python'
method: int
__rshift__: anIndex
	| val |
	val := ( anIndex isKindOf: Number )
	   ifTrue: [ anIndex ]
		ifFalse: [ anIndex ___value ].
	^ self class ___new__init__: (value bitShift: val negated)
%
category: 'Python'
method: int
__rtruediv__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rtruediv__: ( self class ___new__init__: any ) ].
	^ any __truediv__: self
%
category: 'Python'
method: int
__rxor__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rxor__: ( self class ___new__init__: any ) ].
	^ any __xor__: self
%
category: 'Python'
method: int
__sub__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: value - val
%
category: 'Python'
method: int
__truediv__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ float ___new__init__: ( value / val )
%
category: 'Python'
method: int
__trunc__
	^ self
%
category: 'Python'
method: int
__xor__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: ( value bitXor: val )
%
category: 'Python'
method: int
as_integer_ratio
	| val |

	val := value asFraction.
   ^ tuple ___new__init__: { val numerator. val denominator }
%
category: 'Python'
method: int
bit_length
	^ self class ___new__init__: (value highBit ifNil: [0])
%
category: 'Python'
method: int
conjugate
	^ self
%
category: 'Python'
method: int
denominator
	^ self class ___new__init__: 1
%
category: 'Python'
method: int
imag
	^ self class ___new__init__: 0
%
category: 'Python'
method: int
numerator
	^ self
%
category: 'Python'
method: int
real
	^ self
%
set compile_env: 0
category: 'Smalltalk'
method: int
___initArgs: args

	args isEmpty ifTrue: [ ^ self ___initialize: 0 _: 10].

	( ( args first isKindOf: String ) or: [ args first  isKindOf: str ] )
		ifTrue: [ ^ self ___parse: args first ].

	self class ___assertMagnitudeAsFirstAgumentOn: args.
	( args size = 1 )
		ifTrue: [ ^ self ___initialize: args first _: 10].

	self class ___assertMagnitudeAsSecondAgumentOn: args.
   ^  self ___initialize: args first _: args second.
%
category: 'Smalltalk'
method: int
___initialize: val _: base

 	( val isKindOf: self class )
		ifTrue: [ ^ self ___initialize: val asInteger _: 10 ].
	value := val asInteger.
%
category: 'Smalltalk'
method: int
___parse: stringArg

	| int stream |
	stream := ReadStream on: stringArg.
	[
		int := Integer fromStream: stream.
	] on: Error do: [:ex | ].
	stream atEnd ifTrue: [
		^self ___initialize: int _: 10
	].
	ValueError signal: self class name, '() arg is a malformed string'
%
category: 'Smalltalk'
method: int
printOn: aStream

	aStream 
		nextPutAll: 'int(';
		print: value;
		nextPut: $).
%
