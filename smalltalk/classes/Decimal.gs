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
	valueClass := value perform: #class env: 0.
	
	"If it's already a Decimal, return it"
	(value perform: #_isScaledDecimal env: 0) ifTrue: [
		^ value
	].
	
	"If it's a string, parse it"
	(value perform: #isKindOf: env: 0 withArguments: {String}) ifTrue: [
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
	^ self perform: #asString env: 0
%

category: 'Python-String Representation'
method: Decimal
__repr__
	"Return string representation"
	| strVal |
	strVal := self perform: #asString env: 0.
	^ 'Decimal(''' perform: #, env: 0 withArguments: {
		strVal perform: #, env: 0 withArguments: {''''}
	}
%

category: 'Python-Arithmetic'
method: Decimal
__add__: other
	"Add two decimals"
	^ self perform: #+ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: Decimal
__sub__: other
	"Subtract two decimals"
	^ self perform: #- env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: Decimal
__mul__: other
	"Multiply two decimals"
	^ self perform: #* env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: Decimal
__truediv__: other
	"Divide two decimals"
	^ self perform: #/ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: Decimal
__floordiv__: other
	"Floor division"
	^ self perform: #// env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: Decimal
__mod__: other
	"Modulo"
	^ self perform: #\\ env: 0 withArguments: {other}
%

category: 'Python-Arithmetic'
method: Decimal
__neg__
	"Negate"
	^ self perform: #negated env: 0
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
	^ self perform: #abs env: 0
%

category: 'Python-Comparison'
method: Decimal
__eq__: other
	"Test equality"
	^ self perform: #= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: Decimal
__ne__: other
	"Test inequality"
	^ (self perform: #= env: 0 withArguments: {other}) perform: #not env: 0
%

category: 'Python-Comparison'
method: Decimal
__lt__: other
	"Test less than"
	^ self perform: #< env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: Decimal
__le__: other
	"Test less than or equal"
	^ self perform: #<= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: Decimal
__gt__: other
	"Test greater than"
	^ self perform: #> env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: Decimal
__ge__: other
	"Test greater than or equal"
	^ self perform: #>= env: 0 withArguments: {other}
%

category: 'Python-Conversion'
method: Decimal
__int__
	"Convert to integer"
	^ self perform: #truncated env: 0
%

category: 'Python-Conversion'
method: Decimal
__float__
	"Convert to float"
	^ self perform: #asFloat env: 0
%

category: 'Python-Hash'
method: Decimal
__hash__
	"Return hash value"
	^ self perform: #hash env: 0
%

set compile_env: 0

