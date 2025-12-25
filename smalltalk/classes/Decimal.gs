! ===============================================================================
! ScaledDecimal (Python 'decimal.Decimal' type mapping)
! ===============================================================================
! This file adds Python methods to GemStone's ScaledDecimal class.
! ScaledDecimal provides exact decimal arithmetic.
! ===============================================================================

! ------------------- Remove existing Python methods from Decimal
expectvalue /Metaclass3
doit
Decimal removeAllMethods: 2.
Decimal class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Class methods for Decimal (as Decimal)

category: 'Python-Instance Creation'
classmethod: Decimal
__new__: cls _: value
	"Create a new Decimal (Decimal) from a value"
	
	| valueClass |
	"Check the type of value"
	valueClass := value ___class___.
	
	"If it's already a Decimal, return it"
	(value perform: #_isScaledDecimal env: 0) ifTrue: [
		^ value
	].
	
	"If it's a string, parse it"
	(value ___isKindOf___: String) ifTrue: [
		^ Decimal perform: #_fromString:decimalPoint: env: 0 withArguments: {value. nil}
	].
	
	"If it's a number, convert it with default scale of 28"
	^ Decimal perform: #for:scale: env: 0 withArguments: {value. 28}
%

! ------------------- Instance methods for Decimal (as Decimal)

category: 'Python-String Representation'
method: Decimal
__str__
	"Return string representation"
	^ self ___asString___
%

category: 'Python-String Representation'
method: Decimal
__repr__
	"Return string representation"
	| strVal |
	strVal := self ___asString___.
	^ ('Decimal(''' ___concat___: strVal) ___concat___: ''')'
%

category: 'Python-Arithmetic'
method: Decimal
__add__: other
	"Add two decimals"
	^ self ___plus___: other
%

category: 'Python-Arithmetic'
method: Decimal
__sub__: other
	"Subtract two decimals"
	^ self ___minus___: (other)
%

category: 'Python-Arithmetic'
method: Decimal
__mul__: other
	"Multiply two decimals"
	^ self ___times___: other
%

category: 'Python-Arithmetic'
method: Decimal
__truediv__: other
	"Divide two decimals"
	^ self ___divide___: other
%

category: 'Python-Arithmetic'
method: Decimal
__floordiv__: other
	"Floor division"
	^ self ___divideInteger___: other
%

category: 'Python-Arithmetic'
method: Decimal
__mod__: other
	"Modulo"
	^ self ___modulo___: other
%

category: 'Python-Arithmetic'
method: Decimal
__neg__
	"Negate"
	^ self ___negated___
%

category: 'Python-Arithmetic'
method: Decimal
__pos__
	"Unary plus"
	^ self
%

category: 'Python-Arithmetic'
method: Decimal
__abs__
	"Absolute value"
	^ self ___abs___
%

category: 'Python-Comparison'
method: Decimal
__eq__: other
	"Test equality"
	^ self ___eq___: other
%

category: 'Python-Comparison'
method: Decimal
__ne__: other
	"Test inequality"
	^ (self ___eq___: other) ___not___
%

category: 'Python-Comparison'
method: Decimal
__lt__: other
	"Test less than"
	^ self ___lt___: other
%

category: 'Python-Comparison'
method: Decimal
__le__: other
	"Test less than or equal"
	^ self ___le___: other
%

category: 'Python-Comparison'
method: Decimal
__gt__: other
	"Test greater than"
	^ self ___gt___: other
%

category: 'Python-Comparison'
method: Decimal
__ge__: other
	"Test greater than or equal"
	^ self ___ge___: other
%

category: 'Python-Conversion'
method: Decimal
__int__
	"Convert to integer"
	^ self ___truncated___
%

category: 'Python-Conversion'
method: Decimal
__float__
	"Convert to float"
	^ self ___asFloat___
%

category: 'Python-Hash'
method: Decimal
__hash__
	"Return hash value"
	^ self ___hash___
%

set compile_env: 0

