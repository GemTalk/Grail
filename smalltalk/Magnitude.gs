! ------------------- Remove existing behavior from Magnitude
removeAllMethods Magnitude
removeAllClassMethods Magnitude
! ------------------- Class methods for Magnitude
set compile_env: 0
! ------------------- Instance methods for Magnitude
set compile_env: 0
category: 'Python'
method: Magnitude
__add__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ self class ___new__init__: value + val
%
category: 'Python'
method: Magnitude
__bool__
	^ value ~= 0
%
category: 'Python'
method: Magnitude
__eq__: anObject	

	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].
	^ value = val
%
category: 'Python'
method: Magnitude
__floordiv__: anObject
	| val |
	val := ( anObject isKindOf: Number )
	   ifTrue: [ anObject ]
		ifFalse: [ anObject ___value ].

	^ int ___new__init__: ( value // val )
%
category: 'Python'
method: Magnitude
__ge__: anObject
	^ ( self __eq__: anObject ) or: [ self __gt__: anObject ]
%
category: 'Python'
method: Magnitude
__le__: anObject
	^ ( self __gt__: anObject ) not
%
category: 'Python'
method: Magnitude
__lt__: anObject
	^ ( self __ge__: anObject ) not
%
category: 'Python'
method: Magnitude
__ne__: other
	^ ( self __eq__: other ) not
%
category: 'Python'
method: Magnitude
__radd__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __radd__: ( self class ___new__init__: any ) ].
	^ any __add__: self
%
category: 'Python'
method: Magnitude
__rand__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rand__: ( self class ___new__init__: any ) ].
	^ any __and__: self
%
category: 'Python'
method: Magnitude
__rdivmod__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rdivmod__: ( self class ___new__init__: any ) ].
	^ any __divmod__: self
%
category: 'Python'
method: Magnitude
__rfloordiv__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rfloordiv__: ( self class ___new__init__: any ) ].
	^ any __floordiv__: self
%
category: 'Python'
method: Magnitude
__rmod__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rmod__: ( self class ___new__init__: any ) ].
	^ any __mod__: self
%
category: 'Python'
method: Magnitude
__rmul__: any

	| other |
	other := (any isKindOf: Magnitude) ifTrue: [
		any
	] ifFalse: [
		self class ___new__init__: any
	].
	^other __mul__: self
%
category: 'Python'
method: Magnitude
__rpow__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rpow__: ( self class ___new__init__: any ) ].
	^ any __pow__: self
%
category: 'Python'
method: Magnitude
__rsub__: any
	( any isKindOf: Magnitude )
		ifFalse: [ ^ self __rsub__: ( self class ___new__init__: any ) ].
	^ any __sub__: self
%
set compile_env: 0
category: 'Smalltalk'
method: Magnitude
___value
	^ value
%
