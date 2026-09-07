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
	"Add two decimals.

	Guarded like every other arithmetic dunder here -- an unguarded
	env-0 send to a non-Number operand escapes as an uncatchable
	Smalltalk MessageNotUnderstood from #_generality.  __mul__: in
	this file carries the full rationale and the measurements."
	(other isKindOf: Number) ifTrue: [^ self @env0:+ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self @env0:+ (other __index__)].
	^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'
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
	"Floor division.

	Guarded like every other arithmetic dunder here -- an unguarded
	env-0 send to a non-Number operand escapes as an uncatchable
	Smalltalk MessageNotUnderstood from #_generality.  __mul__: in
	this file carries the full rationale and the measurements."
	(other isKindOf: Number) ifTrue: [^ self @env0:// other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self @env0:// (other __index__)].
	^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'
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
	"Modulo.

	Guarded like every other arithmetic dunder here -- an unguarded
	env-0 send to a non-Number operand escapes as an uncatchable
	Smalltalk MessageNotUnderstood from #_generality.  __mul__: in
	this file carries the full rationale and the measurements."
	(other isKindOf: Number) ifTrue: [^ self @env0:\\ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self @env0:\\ (other __index__)].
	^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'
%

category: 'Grail-Arithmetic'
method: Decimal
__mul__: other
	"Multiply two decimals.

	Guarded exactly like int>>__mul__: (Int.gs) and float>>__mul__:
	(Float.gs).  An unguarded ``^ self @env0:* other'' hands a
	non-Number operand straight to GemStone's Number generality
	coercion, which sends the env-0 selector #_generality to that
	operand.  A PythonInstance answers DNU only in env 1, so the miss
	escaped as an UNCATCHABLE Smalltalk MessageNotUnderstood that no
	Python ``except'' could see.  Measured on this image before the
	guard:
	  10.5s2 __mul__: <a pure-Python decimal.Decimal>
	    -> a Decimal does not understand #_generality
	  10.5s2 __mul__: 'abc'
	    -> a Unicode7 does not understand #_generality
	and the same for __add__:, __sub__:, __truediv__: and
	__floordiv__:.  Mixing the two Decimal implementations is the real
	trigger: a ScaledDecimal out of Smalltalk or persisted state
	against a decimal.Decimal from the Python module.

	Falling through to ___binOpFallback___ tries the operand's
	reflected dunder first (so a decimal.Decimal's __rmul__ gets its
	chance) and otherwise raises a catchable Python TypeError."
	(other isKindOf: Number) ifTrue: [^ self @env0:* other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self @env0:* (other __index__)].
	^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'
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
	"Subtract two decimals.

	Guarded like every other arithmetic dunder here -- an unguarded
	env-0 send to a non-Number operand escapes as an uncatchable
	Smalltalk MessageNotUnderstood from #_generality.  __mul__: in
	this file carries the full rationale and the measurements."
	(other isKindOf: Number) ifTrue: [^ self @env0:- other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self @env0:- (other __index__)].
	^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'
%

category: 'Grail-Arithmetic'
method: Decimal
__truediv__: other
	"Divide two decimals.

	Guarded like every other arithmetic dunder here -- an unguarded
	env-0 send to a non-Number operand escapes as an uncatchable
	Smalltalk MessageNotUnderstood from #_generality.  __mul__: in
	this file carries the full rationale and the measurements."
	(other isKindOf: Number) ifTrue: [^ self @env0:/ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ self @env0:/ (other __index__)].
	^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'
%

set compile_env: 0
