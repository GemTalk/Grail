! ===============================================================================
! Boolean Methods (Python 'bool' type)
! ===============================================================================
! This file contains method implementations for the Boolean class when used
! as the Python 'bool' type. In Python, bool is a subclass of int with only
! two instances: True and False.
!
! In GemStone, Boolean is a separate class with singleton instances true and false.
! We map Python's True to true and False to false, and implement Python's bool
! methods in environment 1.
!
! Key differences from Python:
! - In Python: bool is a subclass of int, True and False are instances of bool
! - In GemStone: Boolean is separate from Integer, true and false are singletons
! - We make Boolean behave like int for arithmetic (true=1, false=0)
! ===============================================================================

! ------------------- Remove existing Python methods from bool
expectvalue /Metaclass3
doit
bool removeAllMethods: 1.
bool class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Arithmetic Operators'
method: bool
* aNumber
	"Multiply bool (as integer) by aNumber."

	^ self asInteger * aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
+ aNumber
	"Add bool (as integer) to aNumber."

	^ self asInteger + aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
- aNumber
	"Subtract aNumber from bool (as integer)."

	^ self asInteger - aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
/ aNumber
	"Divide bool (as integer) by aNumber."

	^ self asInteger / aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
// aNumber
	"Integer division of bool (as integer) by aNumber."

	^ self asInteger // aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
< aNumber
	"Less than comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger < otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
<= aNumber
	"Less than or equal comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger <= otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
= anObject
	"Equality comparison. Handle bool specially, otherwise compare as integer."

	| otherInt |
	otherInt := anObject class == bool
		ifTrue: [anObject ifTrue: [1] ifFalse: [0]]
		ifFalse: [anObject].
	^ self asInteger = otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
> aNumber
	"Greater than comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger > otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
>= aNumber
	"Greater than or equal comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger >= otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
\\ aNumber
	"Modulo of bool (as integer) by aNumber."

	^ self asInteger \\ aNumber
%

category: 'Grail-Arithmetic Support'
method: bool
_coerce: aNumber
	"Coerce aNumber to be compatible with bool (as integer).
	Convert aNumber to Integer since bool behaves like Integer for arithmetic."

	^ aNumber asInteger
%

category: 'Grail-Arithmetic Support'
method: bool
_generality
	"Return generality for bool in numeric hierarchy.
	bool has the LOWEST generality (10) so it gets coerced to other numeric types.
	This is lower than SmallInteger (20) and Integer (40)."

	^ 10
%

category: 'Grail-Arithmetic'
method: bool
abs
	"Return absolute value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Conversion'
method: bool
asFixedPoint: scale
	"Convert bool to FixedPoint."

	^ self asInteger asFixedPoint: scale
%

category: 'Grail-Conversion'
method: bool
asFloat
	"Convert bool to Float (true=1.0, false=0.0)."

	^ self ifTrue: [1.0] ifFalse: [0.0]
%

category: 'Grail-Conversion'
method: bool
asFraction
	"Convert bool to Fraction (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Conversion'
method: bool
asInteger
	"Convert bool to int (true=1, false=0)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Conversion'
method: bool
asScaledDecimal: scale
	"Convert bool to ScaledDecimal."

	^ self asInteger asScaledDecimal: scale
%

category: 'Grail-Conversion'
method: bool
ceiling
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Testing'
method: bool
even
	"Return true if even (true=1 is odd, false=0 is even)."

	^ self not
%

category: 'Grail-Conversion'
method: bool
floor
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Arithmetic Support'
method: bool
isNumber
	"Return true - bool participates in arithmetic as a number.
	Note: We override isNumber (not _isNumber which is an optimized selector)."

	^ true
%

category: 'Grail-Arithmetic Operators'
method: bool
max: aNumber
	"Return maximum of bool (as integer) and aNumber."

	^ self asInteger max: aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
min: aNumber
	"Return minimum of bool (as integer) and aNumber."

	^ self asInteger min: aNumber
%

category: 'Grail-Arithmetic'
method: bool
negated
	"Return negation (true=-1, false=0)."

	^ self asInteger negated
%

category: 'Grail-Testing'
method: bool
negative
	"Return false - booleans as integers are never negative."

	^ false
%

category: 'Grail-Testing'
method: bool
odd
	"Return true if odd (true=1 is odd, false=0 is even)."

	^ self
%

category: 'Grail-Testing'
method: bool
positive
	"Return true if self is true or false (equivalent to >= 0)."

	^ true
%

category: 'Grail-Arithmetic Operators'
method: bool
raisedTo: aNumber
	"Raise bool (as integer) to the power of aNumber."

	^ self asInteger raisedTo: aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
raisedToInteger: aNumber
	"Raise bool (as integer) to the power of aNumber (integer)."

	^ self asInteger raisedToInteger: aNumber
%

category: 'Grail-Arithmetic'
method: bool
reciprocal
	"Return reciprocal (true=1, false=error)."

	^ self asInteger reciprocal
%

category: 'Grail-Conversion'
method: bool
rounded
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Arithmetic'
method: bool
sign
	"Return sign (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Testing'
method: bool
strictlyPositive
	"Return true if self is true (equivalent to > 0)."

	^ self
%

category: 'Grail-Conversion'
method: bool
truncated
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Arithmetic Operators'
method: bool
~= anObject
	"Inequality comparison. Handle bool specially, otherwise compare as integer."

	| otherInt |
	otherInt := anObject class == bool
		ifTrue: [anObject ifTrue: [1] ifFalse: [0]]
		ifFalse: [anObject].
	^ self asInteger ~= otherInt
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: bool
__new__
	"Create a bool instance with default value False.
	In Python: bool() or bool.__new__(bool)"

	^ false
%

category: 'Grail-Initialization'
classmethod: bool
_new: positional kw: kwargs
	"Kwargs constructor entry: the generic class-call
	(Object class>>value:value:) forwards every keyword call here.
	CPython's bool() takes its value POSITIONALLY ONLY, so ANY keyword
	is a TypeError (test_bool.py test_keyword_args).  Without this the
	send died as a raw, UNCATCHABLE MessageNotUnderstood on
	``Boolean class>>_new:kw:'' — the kernel Boolean metaclass chain
	has no env-1 DNU backstop, exactly as Int.gs>>_new:kw: notes."

	(kwargs @env0:notNil and: [kwargs @env0:isEmpty @env0:not]) ifTrue: [
		TypeError ___signal___: 'bool() takes no keyword arguments'].
	(positional @env0:size @env0:> 1) ifTrue: [
		TypeError ___signal___: 'bool expected at most 1 argument, got '
			@env0:, positional @env0:size @env0:printString].
	positional @env0:isEmpty ifTrue: [^ false].
	^ self ___truthOf___: (positional @env0:at: 1)
%

category: 'Grail-Initialization'
classmethod: bool
__new__: obj
	"CPython's allocation form ``bool.__new__(bool)`` — every Python
	__new__ takes the target class as its first positional, so this
	answers False, NOT the truthiness of the bool class object
	(test_bool.py test_bool_new).  Same convention as Int.gs>>__new__:_:.

	Grail names constructor selectors by POSITIONAL ARITY, so plain
	``bool(x)`` would otherwise be this identical one-argument send and
	the two readings would collide.  They no longer meet here: a literal
	call site is routed to ___truthOf___: by
	CallAst>>bareCallClassNewSelector, and the indirect ``f = bool; f(x)''
	form by Boolean class>>value:value:.  Anything still reaching this
	method with a non-class argument is an explicit
	``bool.__new__(cls, value)''-shaped call whose cls was omitted, so
	fall back to truth testing rather than failing."

	obj == bool ifTrue: [^ false].
	^ self ___truthOf___: obj
%

category: 'Grail-Initialization'
classmethod: bool
__new__: cls _: obj
	"``bool.__new__(bool, x)`` — the 2-positional allocation form (see
	__new__: for why arity alone cannot tell it from a call).  Anything
	else is ``bool(a, b)``, which CPython rejects: bool takes at most
	one argument.  Without this the send died as an uncatchable
	MessageNotUnderstood on ``Boolean class>>__new__:_:''
	(test_bool.py test_convert)."

	cls == bool ifFalse: [
		TypeError ___signal___: 'bool expected at most 1 argument, got 2'].
	^ self ___truthOf___: obj
%

category: 'Grail-Initialization'
classmethod: bool
__new__: obj _: second _: third
	"``bool(a, b, c)`` — 3 positionals reach the arity-named selector
	the generic class-call dispatch builds, which would otherwise be an
	uncatchable MessageNotUnderstood on the kernel Boolean metaclass.
	Raise CPython's catchable TypeError instead (same guard as
	Int.gs>>__new__:_:_:)."

	TypeError ___signal___: 'bool expected at most 1 argument, got 3'
%

category: 'Grail-Callable'
classmethod: bool
value: positional value: kwargs
	"Indirect callable form ``f = bool; f(x)'' / ``map(bool, xs)''.
	Overridden so a 1-positional call means TRUTH TESTING even when the
	argument is a class object (``bool(dict)'' is True), rather than
	colliding with the ``bool.__new__(bool)'' allocation reading of
	__new__: -- the same split CallAst>>bareCallClassNewSelector makes
	for a literal ``bool(x)'' call site.  Every other arity and the
	kwargs form defer to the generic Object class implementation."

	((kwargs == nil or: [kwargs @env0:isEmpty])
		and: [positional @env0:size @env0:= 1]) ifTrue: [
		^ self ___truthOf___: (positional @env0:at: 1)].
	^ super value: positional value: kwargs
%

category: 'Grail-Initialization'
classmethod: bool
___truthOf___: obj
	"Python truth-value testing for an arbitrary object: the shared body
	of ``bool(x)`` and object>>___isTruthy___, so ``if x:'' and
	``bool(x)'' can never disagree.  Follows CPython's protocol order —
	__bool__, then __len__, then the built-in type defaults."

	| result |
	"None is falsy. Smalltalk nil (undefined) is treated the same here for
	bridge robustness."
	(obj == nil or: [obj == None]) ifTrue: [ ^ false ].

	"If already a bool, return it"
	(obj isKindOf: bool) ifTrue: [
		^ obj
	].

	"Try to call __bool__ on the object via env-1 dispatch.  env-0
	``respondsTo:`` only inspects env-0 method dictionaries; Python's
	``__bool__`` is compiled in env 1 on user classes (e.g. Grail's
	collections.deque), so the check used to miss and fall through to
	the unconditional ``true`` below — leaving every empty user
	container truthy."
	result := [obj __bool__]
		@env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noBool__].
	result == #__noBool__ ifFalse: [
		"CPython requires __bool__ to return a REAL bool, not merely
		something truthy: returning self, a str or an int is a TypeError
		(test_bool.py test_convert_to_bool).  Grail previously handed the
		raw value back, so ``bool(x)'' could answer a non-bool and every
		``if x:'' downstream of ___isTruthy___ then hit a Smalltalk
		must-be-boolean error instead of a catchable Python one."
		(result isKindOf: bool) ifFalse: [
			TypeError ___signal___: '__bool__ should return bool, returned '
				@env0:, (result @env0:class @env1:__name__) @env0:asString].
		^ result].

	"CPython sentinel: ``__bool__ = None'' in a class body BLOCKS the
	protocol — the object is not interpretable as a boolean even when it
	defines a working __len__ (test_bool.py test_blocked).  A class-attr
	None is invisible to normal dispatch (the send above just missed), so
	probe ___classAttrDunder___, mirroring the ``__iter__ = None'' guard
	in builtins>>iter: and the ``__contains__ = None'' one in
	object>>___containsItem___:.  Gated on PythonInstance: kernel-backed
	receivers never carry such an attribute, which keeps the very hot
	``if x:'' path for ints/strs/lists off the class-attr lookup."
	(obj @env0:isKindOf: PythonInstance) ifTrue: [
		((obj ___classAttrDunder___: #'__bool__') == None
			or: [(obj ___classAttrDunder___: #'__len__') == None]) ifTrue: [
			TypeError ___signal___: '''' @env0:,
				(obj @env0:class @env1:__name__) @env0:asString @env0:,
				''' object cannot be interpreted as a boolean']].

	"Try __len__ next: ``bool(x)`` defers to ``len(x) != 0`` when
	__bool__ is absent — matches CPython's PEP-3119 fallback."
	result := [obj __len__]
		@env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noLen__].
	result == #__noLen__ ifFalse: [
		"CPython: a negative __len__ is a ValueError, not a truthy length
		(test_bool.py test_convert_to_bool's Eggs).  Guarded on int so a
		__len__ returning a non-integer keeps Grail's existing lenient
		behaviour rather than dying in an uncatchable comparison —
		builtins>>len: does not validate either, and test_sane_len only
		requires the two to agree when BOTH raise."
		((result isKindOf: int) and: [result @env0:< 0]) ifTrue: [
			ValueError ___signal___: '__len__() should return >= 0'].
		^ result @env0:~= 0].

	"For integers, 0 is False, everything else is True"
	(obj isKindOf: int) ifTrue: [
		^ obj @env0:~= 0
	].

	"For floats, 0.0 is False, everything else is True"
	(obj isKindOf: Float) ifTrue: [
		^ obj @env0:~= 0.0
	].

	"For strings, empty string is False"
	(obj isKindOf: Unicode7) ifTrue: [
		^ (obj @env0:size) @env0:> 0
	].

	"For collections, empty is False"
	(obj isKindOf: Collection) ifTrue: [
		^ (obj @env0:size) @env0:> 0
	].

	"Default: everything else is True"
	^ true
%

category: 'Grail-Logical Operators'
method: bool
___and___: aBlock
	"Short-circuit logical AND. If self is false, return false.
	Otherwise, evaluate the block and return its value."

	^ self ifTrue: [aBlock value] ifFalse: [false]
%

category: 'Grail-Logical Operators'
method: bool
___or___: aBlock
	"Short-circuit logical OR. If self is true, return true.
	Otherwise, evaluate the block and return its value."

	^ self ifTrue: [true] ifFalse: [aBlock value]
%

category: 'Grail-Arithmetic'
method: bool
__abs__
	"Absolute value of bool (as int)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Arithmetic'
method: bool
__add__: other
	"Add bool (as int) to other."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:+ other
%

category: 'Grail-Bitwise'
method: bool
__and__: other
	"Bitwise AND.  ``bool & bool`` returns a BOOL in CPython (bool is
	an int subclass whose __and__ narrows the result); mixing with an
	int degrades to int semantics.  A Boolean argument must be coerced
	before bitAnd: — GemStone's integer primitive retry would
	otherwise forward #bitAnd: to the Boolean argument and DNU
	(twilio.request_validator's ``result &= c1 == c2``)."

	(other isKindOf: Boolean) ifTrue: [
		^ self @env0:and: [other]
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitAnd: other
%

category: 'Grail-Conversion'
method: bool
__bool__
	"Return self (already a bool)."

	^ self
%

category: 'Grail-Bridge'
method: bool
___isTruthy___
	"Boolean is already a Smalltalk Boolean."

	^ self
%

category: 'Grail-Documentation'
method: bool
__doc__
	"Return documentation string for bool type."

	^ 'bool(x) -> bool

Returns True when the argument x is true, False otherwise.
The builtins True and False are the only two instances of the class bool.
The class bool is a subclass of the class int, and cannot be subclassed.' @env0:asUnicodeString
%

category: 'Grail-Comparison'
method: bool
__eq__: other
	"Equality comparison. True==1 and False==0 in Python."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	^ selfInt @env0:= otherInt
%

category: 'Grail-Hashing'
method: bool
__hash__
	"Python hash(True) == hash(1) == 1 and hash(False) == hash(0) == 0 (bool is
	an int subclass in CPython).  Grail's bool maps to the kernel Boolean, which
	does NOT inherit int>>__hash__, so without this override hash(True) falls to
	object>>__hash__ (Smalltalk identity hash) and True fails to hash-collapse
	with 1 / 1.0 in a set or dict keyed by Python __hash__."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Conversion'
method: bool
__float__
	"Convert bool to float (True=1.0, False=0.0)."

	^ self ifTrue: [1.0] ifFalse: [0.0]
%

category: 'Grail-Arithmetic'
method: bool
__floordiv__: other
	"Floor division of bool (as int) by other."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:// other
%

category: 'Grail-Comparison'
method: bool
__ge__: other
	"Greater than or equal comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
	^ selfInt @env0:>= otherInt
%

category: 'Grail-Comparison'
method: bool
__gt__: other
	"Greater than comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
	^ selfInt @env0:> otherInt
%

category: 'Grail-Conversion'
method: bool
__index__
	"Return int value (used for indexing). True=1, False=0."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Conversion'
method: bool
__int__
	"Convert bool to int (True=1, False=0)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Bitwise'
method: bool
__invert__
	"Bitwise NOT of bool (as int).

	DEPRECATED in CPython (gh-103487): ``~True'' is -2, the bitwise
	inversion of the underlying int, which is almost never what the
	author meant by negating a bool.  Warn, then return the int —
	same shape as Int.gs>>___coerceIntResult___'s deprecation
	(test_bool.py test_math wraps each ``~'' in assertWarns)."

	| warningsMod |
	warningsMod := (importlib @env1:modules) @env0:at: #warnings ifAbsent: [nil].
	warningsMod ifNotNil: [
		warningsMod warn: ('Bitwise inversion ''~'' on bool is deprecated. '
			@env0:, 'This returns the bitwise inversion of the underlying int '
			@env0:, 'object and is usually not what you expect from negating '
			@env0:, 'a bool. Use the ''not'' operator for boolean negation or '
			@env0:, '~int(x) if you really want the bitwise inversion of the '
			@env0:, 'underlying int.')
			_: DeprecationWarning].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitInvert
%

category: 'Grail-Properties'
method: bool
real
	"CPython's bool is an int subclass, so it carries int's numeric-tower
	properties.  ``type(True.real) is int'' (test_bool.py
	test_real_and_imag), so answer the plain Integer, not self."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Properties'
method: bool
imag
	"Imaginary part of a real number is 0 (see ``real'')."

	^ 0
%

category: 'Grail-Properties'
method: bool
numerator
	"bool inherits int's Rational interface: numerator is 1/0."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Properties'
method: bool
denominator
	"bool inherits int's Rational interface: denominator is always 1."

	^ 1
%

! ___pythonValueAttrs___ MUST be compiled in env 0: object>>___pyAttrLoad___
! consults it through an ENV-0 ``respondsTo:'', which never sees an env-1
! method (same requirement called out in Bytes.gs and LruCacheWrapper.gs).
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: bool
___pythonValueAttrs___
	"Unary methods exposed to Python as VALUE attributes rather than
	bound methods — bool inherits int's numerator/denominator/real/imag
	properties (see Int.gs>>___pythonValueAttrs___, which this mirrors:
	a BoundMethod here would poison ``True.real + 1'')."

	^ IdentitySet new
		add: #numerator;
		add: #denominator;
		add: #real;
		add: #imag;
		yourself
%

set compile_env: 1

category: 'Grail-Integer Methods'
method: bool
bit_length
	"Number of bits needed to represent the value: True->1, False->0."

	^ (self ifTrue: [1] ifFalse: [0]) bit_length
%

category: 'Grail-Integer Methods'
method: bool
conjugate
	"Conjugate of a real number is itself, as an int (see ``real'')."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Integer Methods'
method: bool
as_integer_ratio
	"bool inherits int's as_integer_ratio: (value, 1)."

	^ (self ifTrue: [1] ifFalse: [0]) as_integer_ratio
%

category: 'Grail-Integer Methods'
method: bool
to_bytes: length _: byteorder
	"bool inherits int.to_bytes (2-arg form)."

	^ (self ifTrue: [1] ifFalse: [0]) to_bytes: length _: byteorder
%

category: 'Grail-Class Methods'
classmethod: bool
from_bytes: theBytes _: byteorder
	"``bool.from_bytes(b, byteorder)'' — bool inherits int's
	classmethod, and because the constructor is bool the int result
	comes back narrowed to True/False (test_bool.py test_from_bytes)."

	^ (int from_bytes: theBytes _: byteorder) @env0:~= 0
%

category: 'Grail-Class Methods'
classmethod: bool
from_bytes: theBytes _: byteorder _: signed
	"3-arg ``bool.from_bytes(b, byteorder, signed)'' — see the 2-arg form."

	^ (int from_bytes: theBytes _: byteorder _: signed) @env0:~= 0
%

category: 'Grail-Comparison'
method: bool
__le__: other
	"Less than or equal comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
	^ selfInt @env0:<= otherInt
%

category: 'Grail-Comparison'
method: bool
__lt__: other
	"Less than comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
	^ selfInt @env0:< otherInt
%

category: 'Grail-Arithmetic'
method: bool
__mod__: other
	"Modulo of bool (as int) by other."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:\\ other
%

category: 'Grail-Arithmetic'
method: bool
__mul__: other
	"Multiply bool (as int) by other."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:* other
%

category: 'Grail-Comparison'
method: bool
__ne__: other
	"Inequality comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	^ selfInt @env0:~= otherInt
%

category: 'Grail-Arithmetic'
method: bool
__neg__
	"Negate bool (as int)."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:negated
%

category: 'Grail-Bitwise'
method: bool
__or__: other
	"Bitwise OR.  bool | bool stays bool (see __and__: for the
	coercion rationale); bool | int degrades to int semantics."

	(other isKindOf: Boolean) ifTrue: [
		^ self @env0:or: [other]
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitOr: other
%

category: 'Grail-Arithmetic'
method: bool
__pos__
	"Unary plus of bool (as int)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Arithmetic'
method: bool
__pow__: other
	"Raise bool (as int) to power of other."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:raisedTo: other
%

category: 'Grail-String Representation'
method: bool
__repr__
	"Return the official string representation of the bool."

	^ (self ifTrue: ['True'] ifFalse: ['False']) @env0:asUnicodeString
%

category: 'Grail-String Representation'
method: bool
__str__
	"Return the informal string representation of the bool."

	^ (self ifTrue: ['True'] ifFalse: ['False']) @env0:asUnicodeString
%

category: 'Grail-Arithmetic'
method: bool
__sub__: other
	"Subtract other from bool (as int)."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:- (other)
%

category: 'Grail-Arithmetic'
method: bool
__truediv__: other
	"True division of bool (as int) by other."

	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:/ other
%

category: 'Grail-Bitwise'
method: bool
__xor__: other
	"Bitwise XOR.  bool ^ bool stays bool (see __and__: for the
	coercion rationale); bool ^ int degrades to int semantics."

	(other isKindOf: Boolean) ifTrue: [
		^ self @env0:xor: other
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitXor: other
%

set compile_env: 0
