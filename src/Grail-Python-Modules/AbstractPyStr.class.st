"Reusable base for Python objects that ARE a string by value but also
carry extra attributes -- ``enum.StrEnum`` members, and ``class X(str)``
subclasses generally.  The str analog of AbstractPyInt.

# Why not a CharacterCollection subclass
Grail maps Python ``str`` to Smalltalk ``Unicode7``; String / Unicode7 /
Symbol are all BYTE-format, so a subclass cannot carry the per-instance
attributes an enum member needs (``_name_`` / ``_value_``).  (A plain
``cls basicNew`` on such a byte subclass yields an EMPTY string whose
dynamic-instVar ``#value`` is ignored by every string operation -- the
old ``class SE(str, Enum)`` bug where ``str(SE.A)`` was ''.)

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
kernels so ``class MyStr(str)`` and ``class C(StrEnum)`` allocate here."
Class {
	#name : 'AbstractPyStr',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Comparison' }
AbstractPyStr class >> ___builtinValueClass___ [
	"The kernel class the builtin's own VALUES belong to (a str is a String, Symbol, Unicode7/16/32 or multi-byte string), which
	this class -- the root of every Python subclass of the builtin -- does not
	inherit from.  Object >> ___reflectedFirst___ asks it, so that ``0 ==
	C3(11)'' for ``class C3(int)'' sees C3 as a proper subclass of int and tries
	C3's reflected method first, as CPython does (#1495)."

	^ CharacterCollection

]

{ #category : 'Grail-Introspection' }
AbstractPyStr class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Instantiation' }
AbstractPyStr class >> new [
	"ClassDefAst-emitted code sends ``self new'' then __init__; plain
	pointer allocation is fine (Object new works, but mirror
	AbstractPyInt's explicit override for clarity)."

	^ self basicNew

]

{ #category : 'Grail-Testing' }
AbstractPyStr >> ___isPyStr___ [
	"True: a boxed Python str is still a str -- see object >> ___isPyStr___
	for why callers should ask this rather than isKindOf: CharacterCollection."

	^ true

]

{ #category : 'Grail-Accessors' }
AbstractPyStr >> ___pyCodePoints___ [
	"The wrapped value's code points -- see object >> ___pyCodePoints___.

	Delegated rather than restated: whatever ___strValue___ answers is a real
	CharacterCollection, which knows its own code points."

	^ self ___strValue___ ___pyCodePoints___

]

{ #category : 'Grail-Accessors' }
AbstractPyStr >> ___pyPlainStr___ [
	"The wrapped Unicode7 -- a boxed str is always backed by a real
	CharacterCollection, so a caller may hand it to a kernel primitive.
	See object >> ___pyPlainStr___."

	^ self ___strValue___

]

{ #category : 'Grail-Testing' }
AbstractPyStr >> ___reprResult___ [
	"A str subclass is a valid __repr__ result -- see object >> ___reprResult___."

	^ self

]

{ #category : 'Grail-Testing' }
AbstractPyStr >> ___strResult___ [
	"A str subclass is a valid __str__ result -- see object >> ___strResult___."

	^ self

]

{ #category : 'Grail-Accessors' }
AbstractPyStr >> ___strValue___ [
	"The wrapped value coerced to a real string for delegation.  An
	unset slot (nil -- a half-built member or a nameless composite)
	reads as the empty string; a non-string value is stringified."

	| v |
	v := self dynamicInstVarAt: #value.
	v == nil ifTrue: [^ Unicode7 new].
	(v isKindOf: CharacterCollection) ifTrue: [^ v].
	(v isKindOf: AbstractPyStr) ifTrue: [^ v ___strValue___].
	^ v asString

]

{ #category : 'Grail-Comparison' }
AbstractPyStr >> = other [
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other ___strValue___] ifFalse: [other].
	^ self ___strValue___ = ov

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> cantPerform: aSymbol withArguments: anArray env: envId [
	"Mirror DNU for explicit perform:env: calls."

	^ self doesNotUnderstand: aSymbol args: anArray envId: envId

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> doesNotUnderstand: aSelector args: anArray envId: envId [
	"Forward unknown env-1 messages (upper, split:, startswith:, __len__,
	__getitem__:, __add__:, __iter__, ...) to the wrapped string, so the
	whole str surface works and returns plain strings -- exactly a
	CPython str-subclass method.  AbstractPyStr arguments unwrap to their
	value first (e.g. ``a + b`` where both are members)."

	| unwrapped |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	[:rec | rec == #'___noRecover___' ifFalse: [^ rec]] value: (self ___pyattrRecover___: aSelector args: anArray).
	unwrapped := anArray collect: [:a |
		(a isKindOf: AbstractPyStr) ifTrue: [a ___strValue___] ifFalse: [a]].
	^ self ___strValue___ perform: aSelector env: 1 withArguments: unwrapped

]

{ #category : 'Grail-Accessors' }
AbstractPyStr >> encodeAsUTF8 [
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

]

{ #category : 'Grail-Comparison' }
AbstractPyStr >> hash [
	^ self ___strValue___ hash

]

{ #category : 'Grail-Accessors' }
AbstractPyStr >> value [
	"The wrapped string (a Unicode7).  Enum members store their value
	here via the member builder; str subclasses via ___new__."

	^ self dynamicInstVarAt: #value

]
