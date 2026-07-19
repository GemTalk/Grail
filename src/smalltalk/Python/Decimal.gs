! ===============================================================================
! ScaledDecimal (Python 'decimal.Decimal' type mapping)
! ===============================================================================
! This file adds Python methods to GemStone's ScaledDecimal class.
! ScaledDecimal provides exact decimal arithmetic.
! ===============================================================================

! ------------------- Remove existing Python methods from Decimal
expectvalue /Metaclass3
doit
Decimal removeAllMethods: 1.
Decimal class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: Decimal
__new__: value
	"Create a new Decimal from a value. Receiver is the class.
	In Python: Decimal(value)."

	"If it's already a Decimal, return it"
	(value _isScaledDecimal) ifTrue: [
		^ value
	].

	"If it's a string, parse it"
	(value isKindOf: String) ifTrue: [
		^ self @env0:_fromString: value decimalPoint: nil
	].

	"If it's a number, convert it with default scale of 28"
	^ self @env0:for: value scale: 28
%

category: 'Grail-Arithmetic'
method: Decimal
__abs__
	"Absolute value"
	^ self @env0:abs
%

category: 'Grail-Arithmetic'
method: Decimal
__add__: other
	"Add two decimals"
	^ self @env0:+ other
%

category: 'Grail-Comparison'
method: Decimal
__eq__: other
	"Test equality"
	^ self @env0:= other
%

category: 'Grail-Conversion'
method: Decimal
__float__
	"Convert to float"
	^ self @env0:asFloat
%

category: 'Grail-Arithmetic'
method: Decimal
__floordiv__: other
	"Floor division"
	^ self @env0:// other
%

category: 'Grail-Comparison'
method: Decimal
__ge__: other
	"Test greater than or equal"
	^ self @env0:>= other
%

category: 'Grail-Comparison'
method: Decimal
__gt__: other
	"Test greater than"
	^ self @env0:> other
%

category: 'Grail-Hash'
method: Decimal
__hash__
	"Return hash value"
	^ self @env0:hash
%

category: 'Grail-Conversion'
method: Decimal
__int__
	"Convert to integer"
	^ self @env0:truncated
%

category: 'Grail-Comparison'
method: Decimal
__le__: other
	"Test less than or equal"
	^ self @env0:<= other
%

category: 'Grail-Comparison'
method: Decimal
__lt__: other
	"Test less than"
	^ self @env0:< other
%

category: 'Grail-Arithmetic'
method: Decimal
__mod__: other
	"Modulo"
	^ self @env0:\\ other
%

category: 'Grail-Arithmetic'
method: Decimal
__mul__: other
	"Multiply two decimals"
	^ self @env0:* other
%

category: 'Grail-Comparison'
method: Decimal
__ne__: other
	"Test inequality"
	^ (self @env0:= other) @env0:not
%

category: 'Grail-Arithmetic'
method: Decimal
__neg__
	"Negate"
	^ self @env0:negated
%

category: 'Grail-Arithmetic'
method: Decimal
__pos__
	"Unary plus"
	^ self
%

category: 'Grail-String Representation'
method: Decimal
__repr__
	"Return string representation"
	| strVal |
	strVal := self @env0:asString.
	^ ('Decimal(''' @env0:, strVal) @env0:, ''')'
%

category: 'Grail-String Representation'
method: Decimal
__str__
	"Return string representation"
	^ self @env0:asString
%

category: 'Grail-Arithmetic'
method: Decimal
__sub__: other
	"Subtract two decimals"
	^ self @env0:- (other)
%

category: 'Grail-Arithmetic'
method: Decimal
__truediv__: other
	"Divide two decimals"
	^ self @env0:/ other
%

set compile_env: 0
