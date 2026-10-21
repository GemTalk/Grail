Extension { #name : 'AbstractPyInt' }

{ #category : 'Grail-Instantiation' }
AbstractPyInt class >> ___hasUserInit___ [
	"True if this class defines its OWN Python __init__ (any arity),
	walking up to (but not including) AbstractPyInt or kernel Object
	itself.  Mirrors object class>>___hasUserInit___, but AbstractPyInt
	does not descend from Grail's ``object'' root (it's a Number
	sibling -- see the class comment), so it cannot inherit that
	version; needed so ___new__:kw:'s conversion-failure swallow only
	fires for classes that truly have an __init__ left to fill the
	#value slot.  Every class -- AbstractPyInt included -- ultimately
	inherits kernel Object's own env-1 ``__init__'' (a no-op returning
	None), so that has to be excluded too, or whichClassIncludesSelector:
	always finds SOME owner and every subclass looks user-init'd."

	| owner builtins |
	builtins := { AbstractPyInt. Object }.
	#( #'___init__:kw:' #'__init__:' #'__init__:_:' #'__init__' ) @env0:do: [:sel |
		owner := self @env0:whichClassIncludesSelector: sel environmentId: 1.
		(owner @env0:notNil and: [(builtins @env0:includes: owner) @env0:not]) ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-Attributes' }
AbstractPyInt >> ___grailValueImplements___: aSym [
	"Whether the wrapped value's class implements aSym at ANY arity.

	The probe used to ask for the UNARY selector only, which is every method
	that takes no arguments and none of the ones that do: ``to_bytes'' is
	filed as ``to_bytes:_:'' and ``to_bytes:_:_:'', so
	``F(42).to_bytes(2, 'little')'' raised AttributeError for a method sitting
	right there, while ``F(42).bit_length()'' -- unary -- forwarded fine.  A
	suite half of which forwards is worse than one that does not, because the
	half that works hides the half that does not.

	The four fixed arities plus the varargs form are the shapes Grail compiles
	a Python method into; the same family module attribute resolution walks."

	| cls nm |
	cls := self @env0:value @env0:class.
	nm := aSym @env0:asString.
	(cls @env0:whichClassIncludesSelector: aSym environmentId: 1) @env0:notNil
		ifTrue: [^ true].
	#(':' ':_:' ':_:_:' ':_:_:_:') @env0:do: [:suffix |
		(cls @env0:whichClassIncludesSelector: (nm @env0:, suffix) @env0:asSymbol
			environmentId: 1) @env0:notNil ifTrue: [^ true]].
	^ (cls @env0:whichClassIncludesSelector: ('_' @env0:, nm @env0:, ':kw:') @env0:asSymbol
		environmentId: 1) @env0:notNil

]

{ #category : 'Grail-Instantiation' }
AbstractPyInt >> ___new__: positional kw: keywords [
	"int-subclass constructor: ``self`` is the CLASS (object class>>
	___allocateInstance___ runs a class-body/inherited __new__
	non-virtually with the class as receiver), so ``class MyInt(int):
	pass`` constructs through int's conversion: MyInt(3), MyInt('7'),
	MyInt('101', 2).  A conversion failure leaves the value slot for
	__init__ to fill -- enum-style AbstractPyInt subclasses construct
	with non-numeric args and set #value themselves.  But that swallow
	is only sound when the class actually HAS its own __init__ to fill
	the slot afterward: a plain ``class IntSubclass(int): pass`` (no
	__init__) has nothing to recover with, so a genuine conversion
	failure (invalid literal, digit-limit ValueError, ...) must
	propagate exactly as it would for plain int() -- test_int.py's
	IntSubclassStrDigitLimitsTests otherwise never sees the ValueError
	its assertRaises blocks expect."

	| inst v |
	inst := self @env0:new.
	"Through int()'s own keyword-aware entry, so ``MyInt('FACE', base=16)''
	honours the base, as ``int('FACE', base=16)'' does: the positional-only
	spelling here dropped every keyword and then read 'FACE' in base 10."
	v := [int _new: positional kw: keywords]
		@env0:on: AbstractException
		do: [:ex | (self ___hasUserInit___) ifTrue: [ex @env0:return: nil] ifFalse: [ex @env0:pass]].
	v == nil ifFalse: [
		inst @env0:dynamicInstVarAt: #value put: v].
	^ inst

]

{ #category : 'Grail-Python Attribute Hook' }
AbstractPyInt >> ___pyAttrLoad___: aSym [
	"Let an ATTRIBUTE LOAD reach the wrapped value's method suite.

	``class F(int)'' cannot be a real subclass -- the kernel class is
	sealed -- so Class.gs substitutes this wrapper, which forwards unknown
	env-1 SENDS to the wrapped value via doesNotUnderstand:.  A LOAD had no
	such fallback and raised AttributeError first, so the send that would
	have forwarded cleanly never happened:

	    F(0.5).is_integer()   AttributeError: F object has no attribute ...

	even though every one of those methods exists on the wrapped value.
	Answer a BoundMethod on the WRAPPED VALUE, which is what actually
	implements these; binding it to self instead left BoundMethod unable
	to resolve an arity for a selector its receiver does not define.
	Safe for this method suite -- is_integer / as_integer_ratio / hex /
	bit_length and friends read the number, none of them answer self.

	Only reached after the normal lookup has failed, and only when the
	value really understands the selector -- a genuine miss still raises."

	^ [super ___pyAttrLoad___: aSym]
		@env0:on: AttributeError
		do: [:ex |
			((self ___grailValueImplements___: aSym)
				and: [(self @env0:value ___isProtocolFallback___: aSym) not])
				ifTrue: [ex @env0:return: (BoundMethod receiver: self @env0:value selector: aSym)]
				ifFalse: [ex @env0:pass]]

]

{ #category : 'Grail-Introspection' }
AbstractPyInt >> ___pyHiddenStateNames___ [
	"The dynamic instVars that are Grail's IMPLEMENTATION rather than Python
	attributes: a subclass instance of this root keeps its builtin value under
	#value.  The __dict__ view and __getstate__ leave them out -- otherwise
	``vars(MyInt(7))'' answered {'value': 7} and a pickle of it carried that as
	instance state, which CPython would read back as a real attribute."

	^ #( #value )

]

{ #category : 'Grail-Introspection' }
AbstractPyInt >> __dict__ [
	"``obj.__dict__'' for a SUBCLASS instance (every instance of this root is
	one: an exact builtin value is a kernel object) -- the live dynamic-instVar
	view list and bytes publish, minus ___pyHiddenStateNames___.  test_pickle's
	newobj tests read it to compare a round-tripped object's attributes."

	^ self ___grailInstanceDictView___

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __eq__: other [
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __eq__: (other @env0:value)
	].
	^ self @env0:value __eq__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __ge__: other [
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __ge__: (other @env0:value)
	].
	^ self @env0:value __ge__: other

]

{ #category : 'Grail-Pickle' }
AbstractPyInt >> __getnewargs__ [
	"CPython's int.__getnewargs__: the argument tuple that rebuilds this
	value through __new__.

	The underlying integer, unwrapped -- ``int.__getnewargs__()'' answers
	(int(self),) in CPython.

	It exists for PICKLING an immutable builtin's subclass.  Such a subclass
	carries its value in the CONSTRUCTOR, not in instance state, so
	object.__reduce_ex__'s new-style reduction has to hand the value back as a
	__new__ argument -- ``int.__new__(MySub)'' alone rebuilds an empty one and
	the value is gone.  Grail's pickle used to reduce any int subclass to a
	plain int, losing the class outright."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: { self @env0:value }

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __gt__: other [
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __gt__: (other @env0:value)
	].
	^ self @env0:value __gt__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __hash__ [
	"Hash by value so a wrapper and its int collide consistently with
	__eq__ in dict/set membership."

	^ self @env0:value __hash__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __index__ [
	"PEP 357 integer-conversion contract.  Always a SmallInteger."

	^ self @env0:value

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __int__ [
	^ self @env0:value

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __le__: other [
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __le__: (other @env0:value)
	].
	^ self @env0:value __le__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __lt__: other [
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __lt__: (other @env0:value)
	].
	^ self @env0:value __lt__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __ne__: other [
	"Punts where __eq__: punts -- see Int.gs's twin __ne__: for why
	negating the singleton instead is an uncatchable error."

	| equal |

	equal := self __eq__: other.
	(equal @env0:== NotImplemented) ifTrue: [^ equal].
	^ equal @env0:not

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __repr__ [
	"Default repr is the integer's repr; subclasses (NamedIntConstant,
	HTTPStatus) override to show the symbolic name."

	^ self @env0:value __repr__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> __str__ [
	"Mirror Python's int subclass: str() is the integer's string."

	^ self @env0:value __str__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> denominator [
	^ 1

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> imag [
	^ 0

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> numerator [
	"int's ``numerator'' property: the plain int value, as CPython answers it
	for a subclass's instance.  Listed in ___pythonValueAttrs___ below, so
	``x.numerator'' reads the value; without them it answered a bound method,
	and _pydecimal's comparison of a Decimal with an IntEnum member multiplied
	by it (``Decimal(1) < Color.RED'' raised TypeError)."

	^ self @env0:value

]

{ #category : 'Grail-Python Protocol' }
AbstractPyInt >> real [
	^ self @env0:value

]
