! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined.'].
%

! ------- AbstractPyStr class definition
expectvalue /Class
doit
Object subclass: 'AbstractPyStr'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
AbstractPyStr comment:
'Reusable base for Python objects that ARE a string by value but also
carry extra attributes -- ``enum.StrEnum`` members, and ``class X(str)``
subclasses generally.  The str analog of AbstractPyInt.

# Why not a CharacterCollection subclass
Grail maps Python ``str`` to Smalltalk ``Unicode7``; String / Unicode7 /
Symbol are all BYTE-format, so a subclass cannot carry the per-instance
attributes an enum member needs (``_name_`` / ``_value_``).  (A plain
``cls basicNew`` on such a byte subclass yields an EMPTY string whose
dynamic-instVar ``#value`` is ignored by every string operation -- the
old ``class SE(str, Enum)`` bug where ``str(SE.A)`` was ''''.)

# How it behaves like a str
The wrapped string lives in dynamic instVar ``#value`` (a real
Unicode7).  Every env-1 message this class does not define explicitly is
forwarded to ``#value`` by the ``doesNotUnderstand:args:envId:`` hook --
giving the entire ``str`` method surface (upper/split/startswith/
__len__/__getitem__/__add__/__iter__/...) for free, each returning a
plain ``str`` exactly as a CPython str-subclass method does.  The
comparison dunders, __hash__, __str__, __repr__, __format__ and
___isTruthy___ are defined explicitly because ``object`` stubs them and
would otherwise intercept dispatch before the DNU forwarder.  Arguments
that are themselves AbstractPyStr are unwrapped to their value first.

``isinstance(x, str)`` / ``issubclass(cls, str)`` recognize this class
(builtins ___isInstanceSingle___ / ___isSubclassSingle___), and
Class>>___subclass___ substitutes it for the sealed byte-format string
kernels so ``class MyStr(str)`` and ``class C(StrEnum)`` allocate here.'
%

expectvalue /Class
doit
AbstractPyStr category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
expectvalue /Metaclass3
doit
AbstractPyStr removeAllMethods: 0.
AbstractPyStr removeAllMethods: 1.
AbstractPyStr class removeAllMethods: 0.
AbstractPyStr class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- Instantiation

category: 'Grail-Instantiation'
classmethod: AbstractPyStr
new
	"ClassDefAst-emitted code sends ``self new'' then __init__; plain
	pointer allocation is fine (Object new works, but mirror
	AbstractPyInt's explicit override for clarity)."

	^ self basicNew
%

! ------------------- Accessors

category: 'Grail-Testing'
method: AbstractPyStr
___isPyStr___
	"True: a boxed Python str is still a str -- see object >> ___isPyStr___
	for why callers should ask this rather than isKindOf: CharacterCollection."

	^ true
%

category: 'Grail-Accessors'
method: AbstractPyStr
___pyCodePoints___
	"The wrapped value's code points -- see object >> ___pyCodePoints___.

	Delegated rather than restated: whatever ___strValue___ answers is a real
	CharacterCollection, which knows its own code points."

	^ self ___strValue___ ___pyCodePoints___
%

category: 'Grail-Accessors'
method: AbstractPyStr
___pyPlainStr___
	"The wrapped Unicode7 -- a boxed str is always backed by a real
	CharacterCollection, so a caller may hand it to a kernel primitive.
	See object >> ___pyPlainStr___."

	^ self ___strValue___
%

category: 'Grail-Accessors'
method: AbstractPyStr
encodeAsUTF8
	"Delegate to the wrapped CharacterCollection.

	The C shim's get_ucs4_for_string sends this to fetch a string's bytes,
	and it sends it in ENVIRONMENT 0 -- which the doesNotUnderstand: hook
	below deliberately does not forward (it handles env 1 only).  So a boxed
	str reached C as an object with no readable content.  Now that a StrEnum
	member passes PyUnicode_Check, as it does in CPython, it also has to be
	able to answer its bytes.

	PyStrSurrogate overrides this: it has no wrapped CharacterCollection,
	and no strict UTF-8 encoding exists for the code points it holds."

	^ self ___pyPlainStr___ encodeAsUTF8
%

category: 'Grail-Accessors'
method: AbstractPyStr
value
	"The wrapped string (a Unicode7).  Enum members store their value
	here via the member builder; str subclasses via ___new__."

	^ self dynamicInstVarAt: #value
%

category: 'Grail-Accessors'
method: AbstractPyStr
___strValue___
	"The wrapped value coerced to a real string for delegation.  An
	unset slot (nil -- a half-built member or a nameless composite)
	reads as the empty string; a non-string value is stringified."

	| v |
	v := self dynamicInstVarAt: #value.
	v == nil ifTrue: [^ Unicode7 new].
	(v isKindOf: CharacterCollection) ifTrue: [^ v].
	(v isKindOf: AbstractPyStr) ifTrue: [^ v ___strValue___].
	^ v asString
%

! ------------------- Smalltalk equality (dict/set keys)
!
! A boxed string used as a KeyValueDictionary / set key must compare and
! hash like its value, so ``{member: 1}['plainstr']'' hits and a member
! matches its string value (CPython StrEnum semantics).  KVD keying uses
! Smalltalk = / hash, which Object roots at identity -- override both.

category: 'Grail-Comparison'
method: AbstractPyStr
= other
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other ___strValue___] ifFalse: [other].
	^ self ___strValue___ = ov
%

category: 'Grail-Comparison'
method: AbstractPyStr
hash
	^ self ___strValue___ hash
%

! ------------------- env-1 message forwarding

set compile_env: 0

category: 'Grail-Python Protocol'
method: AbstractPyStr
doesNotUnderstand: aSelector args: anArray envId: envId
	"Forward unknown env-1 messages (upper, split:, startswith:, __len__,
	__getitem__:, __add__:, __iter__, ...) to the wrapped string, so the
	whole str surface works and returns plain strings -- exactly a
	CPython str-subclass method.  AbstractPyStr arguments unwrap to their
	value first (e.g. ``a + b`` where both are members)."

	| unwrapped |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	unwrapped := anArray collect: [:a |
		(a isKindOf: AbstractPyStr) ifTrue: [a ___strValue___] ifFalse: [a]].
	^ self ___strValue___ perform: aSelector env: 1 withArguments: unwrapped
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
cantPerform: aSymbol withArguments: anArray env: envId
	"Mirror DNU for explicit perform:env: calls."

	^ self doesNotUnderstand: aSymbol args: anArray envId: envId
%

set compile_env: 1

! ------------------- Constructor (str allocator protocol)
!
! ClassDefAst>>emitInstantiationMethodFor: sends ``self __new__:
! positional[1]'' for str subclasses (firstBaseIsStr), mirroring
! CharacterCollection>>__new__: -- so the boxed base must answer those
! class-side selectors and stash the content in #value.

category: 'Grail-Instantiation'
classmethod: AbstractPyStr
__new__
	"str() with no argument -> an empty boxed string."

	| inst |
	inst := self @env0:basicNew.
	inst @env0:dynamicInstVarAt: #value put: Unicode7 @env0:new.
	^ inst
%

category: 'Grail-Instantiation'
classmethod: AbstractPyStr
__new__: source
	"``class MyStr(str): pass`` then ``MyStr(x)`` -> a boxed string whose
	#value is ``str(x)'' (an already-string source is stored directly;
	anything else is stringified via __str__)."

	| inst |
	inst := self @env0:basicNew.
	inst @env0:dynamicInstVarAt: #value put: (source __str__).
	^ inst
%

! ------------------- Python protocol (env 1)
!
! object stubs the comparison dunders, __hash__, __str__, __repr__,
! __format__ and ___isTruthy___; they would intercept the DNU forwarder,
! so delegate to the wrapped value explicitly.

category: 'Grail-Python Protocol'
method: AbstractPyStr
__eq__: other
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __eq__: ov
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__ne__: other
	| r |
	r := self __eq__: other.
	r == true ifTrue: [^ false].
	r == false ifTrue: [^ true].
	^ r
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__lt__: other
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __lt__: ov
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__le__: other
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __le__: ov
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__gt__: other
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __gt__: ov
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__ge__: other
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __ge__: ov
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__hash__
	"Hash by value so a wrapper and its plain string collide -- a member
	used as a dict key matches its string value (CPython)."

	^ self @env0:___strValue___ __hash__
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__str__
	"str(x) is the wrapped string.  For a StrEnum member this is exactly
	the ReprEnum contract (str == value); subclasses that need a
	different repr override __repr__, not this."

	^ self @env0:___strValue___
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__repr__
	"Default repr is the string's repr (``'hello'``).  Enum subclasses
	override with the ``<Cls.NAME: 'value'>`` form."

	^ self @env0:___strValue___ __repr__
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__format__: aSpec
	^ self @env0:___strValue___ __format__: aSpec
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
___isTruthy___
	"Non-empty string is truthy; empty is falsy (Python)."

	^ self @env0:___strValue___ @env0:isEmpty @env0:not
%

category: 'Grail-Python Protocol'
method: AbstractPyStr
__getattr__: name
	"Attribute access that misses the boxed class chain (a string METHOD:
	member.upper, member.startswith, ...) forwards to the wrapped value,
	yielding the str method bound to it.  ``member.upper()'' then calls
	it and returns a plain str -- the DNU forwarder only catches direct
	sends, but ``obj.method()'' compiles as attribute-load-then-call."

	^ self @env0:___strValue___ ___pyAttrLoad___: name @env0:asSymbol
%

set compile_env: 1
category: 'Grail-Pickle'
method: AbstractPyStr
__getnewargs__
	"CPython's str.__getnewargs__: the argument tuple that rebuilds this
	value through __new__.

	The wrapped string as a plain str, matching CPython's
	str.__getnewargs__().

	It exists for PICKLING an immutable builtin's subclass.  Such a subclass
	carries its value in the CONSTRUCTOR, not in instance state, so
	object.__reduce_ex__'s new-style reduction has to hand the value back as a
	__new__ argument -- ``str.__new__(MySub)'' alone rebuilds an empty one and
	the value is gone.  Grail's pickle used to reduce any str subclass to a
	plain str, losing the class outright."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: { self ___strValue___ }
%

set compile_env: 0
