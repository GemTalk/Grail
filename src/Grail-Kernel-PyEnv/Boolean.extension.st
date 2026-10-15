Extension { #name : 'Boolean' }

{ #category : 'Grail-Initialization' }
Boolean class >> ___checkedBool___: result [
	"What __bool__ answered, as CPython requires it: a REAL bool, not merely
	something truthy -- returning self, a str or an int is a TypeError
	(test_bool.py test_convert_to_bool).  Grail previously handed the raw
	value back, so ``bool(x)'' could answer a non-bool and every ``if x:''
	downstream of ___isTruthy___ then hit a Smalltalk must-be-boolean error
	instead of a catchable Python one."

	(result isKindOf: bool) ifFalse: [
		TypeError ___signal___: '__bool__ should return bool, returned '
			@env0:, (result @env0:class @env1:__name__) @env0:asString].
	^ result

]

{ #category : 'Grail-Initialization' }
Boolean class >> ___checkedLen___: result [
	"What __len__ answered, as a truth value.  CPython: a negative __len__ is
	a ValueError, not a truthy length (test_bool.py test_convert_to_bool's
	Eggs).  Guarded on int so a __len__ returning a non-integer keeps
	Grail's existing lenient behaviour rather than dying in an uncatchable
	comparison -- builtins>>len: does not validate either, and test_sane_len
	only requires the two to agree when BOTH raise."

	((result isKindOf: int) and: [result @env0:< 0]) ifTrue: [
		ValueError ___signal___: '__len__() should return >= 0'].
	^ result @env0:~= 0

]

{ #category : 'Grail-Initialization' }
Boolean class >> ___defaultTruthOf___: obj [
	"The built-in types' truth when neither __bool__ nor __len__ answered."

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

]

{ #category : 'Grail-Initialization' }
Boolean class >> ___truthIsDecidedBy___: obj class: cls [
	"Whether cls's method chain alone settles ``bool(obj)'': no __bool__ or
	__len__ can reach obj except as a compiled env-1 method of that exact
	name.  Each condition below is a way the doesNotUnderstand path could
	still answer one of the two sends, and sends the test down the old
	send-and-catch route instead.

	* a CLASS receiver: its __bool__ is the metaclass's, reached by the
	  handler's metaclass branch, not by the Smalltalk chain;
	* a doesNotUnderstand handler other than object's or PythonInstance's:
	  str subclasses, CPython proxies, modules and wrappers forward misses;
	* the varargs spelling ``___bool__:kw:'' (a def with defaults), which
	  the handler calls for the bare send;
	* a class-side method (@classmethod, a metaclass def), which the
	  handler forwards to;
	* a dunder held as a CLASS ATTRIBUTE -- a callable the handler calls
	  (#1218) or the ``None'' blocker -- when object >>
	  ___typeDunderMayHold___: cannot rule it out.

	An instance attribute named __bool__ no longer counts, as in CPython,
	which looks the slot up on the type."

	| handler |
	(obj @env0:isKindOf: Behavior) ifTrue: [^ false].
	handler := cls @env0:whichClassIncludesSelector: #'doesNotUnderstand:args:envId:'
		environmentId: 0.
	(handler == object or: [handler == PythonInstance]) ifFalse: [^ false].
	#( #( #'__bool__' #'___bool__:kw:' ) #( #'__len__' #'___len__:kw:' ) ) @env0:do: [:pair |
		| base |
		base := pair @env0:at: 1.
		(cls @env0:whichClassIncludesSelector: (pair @env0:at: 2) environmentId: 1) == nil
			ifFalse: [^ false].
		(cls @env0:class @env0:whichClassIncludesSelector: base environmentId: 1) == nil
			ifFalse: [^ false].
		(cls @env0:class @env0:whichClassIncludesSelector: (pair @env0:at: 2) environmentId: 1) == nil
			ifFalse: [^ false].
		(handler == PythonInstance and: [obj ___typeDunderMayHold___: base])
			ifTrue: [^ false]].
	^ true

]

{ #category : 'Grail-Initialization' }
Boolean class >> ___truthOf___: obj [
	"Python truth-value testing for an arbitrary object: the shared body
	of ``bool(x)`` and object>>___isTruthy___, so ``if x:'' and
	``bool(x)'' can never disagree.  Follows CPython's protocol order —
	__bool__, then __len__, then the built-in type defaults.

	ASK THE CLASS BEFORE SENDING (#1438).  The protocol used to be probed by
	sending __bool__ and then __len__ and catching the MessageNotUnderstood,
	and an env-1 miss runs Grail's doesNotUnderstand handler: about 2 us per
	miss on an instance, so ``if obj:'' cost 1.6 us for a str or a list and
	7-13 us for an instance with neither method, where CPython reads a slot.
	When the class chain answers the question exactly (___truthIsDecidedBy___:
	class:), the compiled method is sent directly or the built-in default is
	used, and nothing is caught.  The send-and-catch below remains for what a
	chain lookup cannot see: a class, another doesNotUnderstand handler (a
	CPython proxy, str subclasses), the varargs spelling, a class-side
	method, and a dunder held as a class attribute."

	| result cls |
	"None is falsy. Smalltalk nil (undefined) is treated the same here for
	bridge robustness."
	(obj == nil or: [obj == None]) ifTrue: [ ^ false ].

	"If already a bool, return it"
	(obj isKindOf: bool) ifTrue: [
		^ obj
	].

	cls := obj @env0:class.
	(self ___truthIsDecidedBy___: obj class: cls) ifTrue: [
		(cls @env0:whichClassIncludesSelector: #'__bool__' environmentId: 1) == nil
			ifFalse: [^ self ___checkedBool___: obj __bool__].
		(cls @env0:whichClassIncludesSelector: #'__len__' environmentId: 1) == nil
			ifFalse: [^ self ___checkedLen___: obj __len__].
		^ self ___defaultTruthOf___: obj].

	"Try to call __bool__ on the object via env-1 dispatch.  env-0
	``respondsTo:`` only inspects env-0 method dictionaries; Python's
	``__bool__`` is compiled in env 1 on user classes (e.g. Grail's
	collections.deque), so the check used to miss and fall through to
	the unconditional ``true`` below — leaving every empty user
	container truthy."
	result := [obj __bool__]
		@env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noBool__].
	result == #__noBool__ ifFalse: [^ self ___checkedBool___: result].

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
	result == #__noLen__ ifFalse: [^ self ___checkedLen___: result].
	^ self ___defaultTruthOf___: obj

]

{ #category : 'Grail-Python protocol' }
Boolean class >> __getitem__: index [
	^ TypeError ___signal___: 'type ''bool'' is not subscriptable'

]

{ #category : 'Grail-Initialization' }
Boolean class >> __new__ [
	"Create a bool instance with default value False.
	In Python: bool() or bool.__new__(bool)"

	^ false

]

{ #category : 'Grail-Initialization' }
Boolean class >> __new__: obj [
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

]

{ #category : 'Grail-Initialization' }
Boolean class >> __new__: cls _: obj [
	"``bool.__new__(bool, x)`` — the 2-positional allocation form (see
	__new__: for why arity alone cannot tell it from a call).  Anything
	else is ``bool(a, b)``, which CPython rejects: bool takes at most
	one argument.  Without this the send died as an uncatchable
	MessageNotUnderstood on ``Boolean class>>__new__:_:''
	(test_bool.py test_convert)."

	cls == bool ifFalse: [
		TypeError ___signal___: 'bool expected at most 1 argument, got 2'].
	^ self ___truthOf___: obj

]

{ #category : 'Grail-Initialization' }
Boolean class >> __new__: obj _: second _: third [
	"``bool(a, b, c)`` — 3 positionals reach the arity-named selector
	the generic class-call dispatch builds, which would otherwise be an
	uncatchable MessageNotUnderstood on the kernel Boolean metaclass.
	Raise CPython's catchable TypeError instead (same guard as
	Int.gs>>__new__:_:_:)."

	TypeError ___signal___: 'bool expected at most 1 argument, got 3'

]

{ #category : 'Grail-Class Methods' }
Boolean class >> _from_bytes: positional kw: kwargs [
	"``bool.from_bytes(b, signed=True)'' and the other keyword spellings,
	narrowed as the positional forms are."

	^ (int _from_bytes: positional kw: kwargs) @env0:~= 0

]

{ #category : 'Grail-Initialization' }
Boolean class >> _new: positional kw: kwargs [
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

]

{ #category : 'Grail-Class Methods' }
Boolean class >> from_bytes: theBytes [
	"``bool.from_bytes(b)'' — see the two-argument form; byteorder defaults
	to 'big' as int's does."

	^ (int from_bytes: theBytes) @env0:~= 0

]

{ #category : 'Grail-Class Methods' }
Boolean class >> from_bytes: theBytes _: byteorder [
	"``bool.from_bytes(b, byteorder)'' — bool inherits int's
	classmethod, and because the constructor is bool the int result
	comes back narrowed to True/False (test_bool.py test_from_bytes)."

	^ (int from_bytes: theBytes _: byteorder) @env0:~= 0

]

{ #category : 'Grail-Class Methods' }
Boolean class >> from_bytes: theBytes _: byteorder _: signed [
	"3-arg ``bool.from_bytes(b, byteorder, signed)'' — see the 2-arg form."

	^ (int from_bytes: theBytes _: byteorder _: signed) @env0:~= 0

]

{ #category : 'Grail-Callable' }
Boolean class >> value: positional value: kwargs [
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

]

{ #category : 'Grail-Logical Operators' }
Boolean >> ___and___: aBlock [
	"Short-circuit logical AND. If self is false, return false.
	Otherwise, evaluate the block and return its value."

	^ self ifTrue: [aBlock value] ifFalse: [false]

]

{ #category : 'Grail-Bridge' }
Boolean >> ___isTruthy___ [
	"Boolean is already a Smalltalk Boolean."

	^ self

]

{ #category : 'Grail-Logical Operators' }
Boolean >> ___or___: aBlock [
	"Short-circuit logical OR. If self is true, return true.
	Otherwise, evaluate the block and return its value."

	^ self ifTrue: [true] ifFalse: [aBlock value]

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __abs__ [
	"Absolute value of bool (as int)."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __add__: other [
	"Add bool (as int) to other."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__radd__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:+ other

]

{ #category : 'Grail-Bitwise' }
Boolean >> __and__: other [
	"Bitwise AND.  ``bool & bool`` returns a BOOL in CPython (bool is
	an int subclass whose __and__ narrows the result); mixing with an
	int degrades to int semantics.  A Boolean argument must be coerced
	before bitAnd: — GemStone's integer primitive retry would
	otherwise forward #bitAnd: to the Boolean argument and DNU
	(twilio.request_validator's ``result &= c1 == c2``)."

	(other isKindOf: Boolean) ifTrue: [
		^ self @env0:and: [other]
	].
	^ (self ifTrue: [1] ifFalse: [0]) ___pyBitAnd___: other

]

{ #category : 'Grail-Conversion' }
Boolean >> __bool__ [
	"Return self (already a bool)."

	^ self

]

{ #category : 'Grail-Documentation' }
Boolean >> __doc__ [
	"Return documentation string for bool type."

	^ 'bool(x) -> bool

Returns True when the argument x is true, False otherwise.
The builtins True and False are the only two instances of the class bool.
The class bool is a subclass of the class int, and cannot be subclassed.' @env0:asUnicodeString

]

{ #category : 'Grail-Comparison' }
Boolean >> __eq__: other [
	"Equality comparison. True==1 and False==0 in Python."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	^ selfInt @env0:= otherInt

]

{ #category : 'Grail-Conversion' }
Boolean >> __float__ [
	"Convert bool to float (True=1.0, False=0.0)."

	^ self ifTrue: [1.0] ifFalse: [0.0]

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __floordiv__: other [
	"Floor division of bool (as int) by other."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rfloordiv__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'].
	"As int, not the kernel's integer //: that answered an int for a float
	divisor (``True // 2.0'' is 0.0) and raised the kernel's UNCATCHABLE
	ZeroDivide for ``True // 0''."
	^ (self ifTrue: [1] ifFalse: [0]) __floordiv__: other

]

{ #category : 'Grail-Comparison' }
Boolean >> __ge__: other [
	"Greater than or equal comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
	^ selfInt @env0:>= otherInt

]

{ #category : 'Grail-Comparison' }
Boolean >> __gt__: other [
	"Greater than comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
	^ selfInt @env0:> otherInt

]

{ #category : 'Grail-Hashing' }
Boolean >> __hash__ [
	"Python hash(True) == hash(1) == 1 and hash(False) == hash(0) == 0 (bool is
	an int subclass in CPython).  Grail's bool maps to the kernel Boolean, which
	does NOT inherit int>>__hash__, so without this override hash(True) falls to
	object>>__hash__ (Smalltalk identity hash) and True fails to hash-collapse
	with 1 / 1.0 in a set or dict keyed by Python __hash__."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Conversion' }
Boolean >> __index__ [
	"Return int value (used for indexing). True=1, False=0."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Conversion' }
Boolean >> __int__ [
	"Convert bool to int (True=1, False=0)."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Bitwise' }
Boolean >> __invert__ [
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

]

{ #category : 'Grail-Comparison' }
Boolean >> __le__: other [
	"Less than or equal comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
	^ selfInt @env0:<= otherInt

]

{ #category : 'Grail-Comparison' }
Boolean >> __lt__: other [
	"Less than comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	((otherInt isKindOf: Number) or: [otherInt isKindOf: Boolean])
		ifFalse: [^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
	^ selfInt @env0:< otherInt

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __mod__: other [
	"Modulo of bool (as int) by other."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rmod__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'].
	"As int, for the reasons __floordiv__: gives (``True % False'' raised the
	kernel's uncatchable ZeroDivide)."
	^ (self ifTrue: [1] ifFalse: [0]) __mod__: other

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __mul__: other [
	"Multiply bool (as int) by other."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rmul__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:* other

]

{ #category : 'Grail-Comparison' }
Boolean >> __ne__: other [
	"Inequality comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	^ selfInt @env0:~= otherInt

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __neg__ [
	"Negate bool (as int)."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:negated

]

{ #category : 'Grail-Bitwise' }
Boolean >> __or__: other [
	"Bitwise OR.  bool | bool stays bool (see __and__: for the
	coercion rationale); bool | int degrades to int semantics."

	(other isKindOf: Boolean) ifTrue: [
		^ self @env0:or: [other]
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitOr: other

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __pos__ [
	"Unary plus of bool (as int)."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __pow__: other [
	"Raise bool (as int) to power of other."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rpow__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '**' reflected: #'__rpow__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:raisedTo: other

]

{ #category : 'Grail-String Representation' }
Boolean >> __repr__ [
	"Return the official string representation of the bool."

	^ (self ifTrue: ['True'] ifFalse: ['False']) @env0:asUnicodeString

]

{ #category : 'Grail-String Representation' }
Boolean >> __str__ [
	"Return the informal string representation of the bool."

	^ (self ifTrue: ['True'] ifFalse: ['False']) @env0:asUnicodeString

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __sub__: other [
	"Subtract other from bool (as int)."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rsub__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:- (other)

]

{ #category : 'Grail-Arithmetic' }
Boolean >> __truediv__: other [
	"True division of bool (as int) by other."

	"A Python subclass of int or float may claim the operation first
	(object >> ___numericReflectedFirst___:selector:)."
	(other @env0:isSpecial) ifFalse: [ | pri |
		pri := self ___numericReflectedFirst___: other selector: #'__rtruediv__:'.
		pri == nil ifFalse: [^ pri]].
	((other isKindOf: Number) or: [other isKindOf: Boolean]) ifFalse: [
		^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'].
	"int's true division, not the kernel's ``/'': that answered an exact
	Smalltalk Fraction for ``True / 2'', where Python's ``/'' is a float."
	^ (self ifTrue: [1] ifFalse: [0]) __truediv__: other

]

{ #category : 'Grail-Bitwise' }
Boolean >> __xor__: other [
	"Bitwise XOR.  bool ^ bool stays bool (see __and__: for the
	coercion rationale); bool ^ int degrades to int semantics."

	(other isKindOf: Boolean) ifTrue: [
		^ self @env0:xor: other
	].
	^ (self ifTrue: [1] ifFalse: [0]) ___pyBitXor___: other

]

{ #category : 'Grail-Number Methods' }
Boolean >> _to_bytes: positional kw: kwargs [
	"bool inherits int.to_bytes (keyword form)."

	^ (self ifTrue: [1] ifFalse: [0]) _to_bytes: positional kw: kwargs

]

{ #category : 'Grail-Integer Methods' }
Boolean >> as_integer_ratio [
	"bool inherits int's as_integer_ratio: (value, 1)."

	^ (self ifTrue: [1] ifFalse: [0]) as_integer_ratio

]

{ #category : 'Grail-Integer Methods' }
Boolean >> bit_length [
	"Number of bits needed to represent the value: True->1, False->0."

	^ (self ifTrue: [1] ifFalse: [0]) bit_length

]

{ #category : 'Grail-Integer Methods' }
Boolean >> conjugate [
	"Conjugate of a real number is itself, as an int (see ``real'')."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Properties' }
Boolean >> denominator [
	"bool inherits int's Rational interface: denominator is always 1."

	^ 1

]

{ #category : 'Grail-Properties' }
Boolean >> imag [
	"Imaginary part of a real number is 0 (see ``real'')."

	^ 0

]

{ #category : 'Grail-Properties' }
Boolean >> numerator [
	"bool inherits int's Rational interface: numerator is 1/0."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Properties' }
Boolean >> real [
	"CPython's bool is an int subclass, so it carries int's numeric-tower
	properties.  ``type(True.real) is int'' (test_bool.py
	test_real_and_imag), so answer the plain Integer, not self."

	^ self ifTrue: [1] ifFalse: [0]

]

{ #category : 'Grail-Integer Methods' }
Boolean >> to_bytes [
	"bool inherits int.to_bytes; ``True.to_bytes()'' is b'\\x01'."

	^ (self ifTrue: [1] ifFalse: [0]) to_bytes

]

{ #category : 'Grail-Number Methods' }
Boolean >> to_bytes: length [
	"bool inherits int.to_bytes (1-arg form)."

	^ (self ifTrue: [1] ifFalse: [0]) to_bytes: length

]

{ #category : 'Grail-Number Methods' }
Boolean >> to_bytes: length _: byteorder [
	"bool inherits int.to_bytes (2-arg form)."

	^ (self ifTrue: [1] ifFalse: [0]) to_bytes: length _: byteorder

]
