Extension { #name : 'AbstractPyFloat' }

{ #category : 'Grail-Instantiation' }
AbstractPyFloat class >> ___hasUserInit___ [
	"True if this class defines its OWN Python __init__ (any arity),
	walking up to (but not including) AbstractPyFloat or kernel Object
	itself.  See AbstractPyInt's twin for why both exclusions are
	needed (AbstractPyFloat doesn't descend from Grail's ``object''
	root, and every class ultimately inherits kernel Object's own
	no-op env-1 __init__)."

	| owner builtins |
	builtins := { AbstractPyFloat. Object }.
	#( #'___init__:kw:' #'__init__:' #'__init__:_:' #'__init__' ) @env0:do: [:sel |
		owner := self @env0:whichClassIncludesSelector: sel environmentId: 1.
		(owner @env0:notNil and: [(builtins @env0:includes: owner) @env0:not]) ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-Class Methods' }
AbstractPyFloat class >> from_number [
	^ float from_number

]

{ #category : 'Grail-Class Methods' }
AbstractPyFloat class >> from_number: obj [
	"Delegate to float's strict numeric-only conversion, then construct
	THIS class (mirrors float class>>from_number:'s own routing)."

	^ self value: (Array @env0:with: (float ___fromNumberValue___: obj)) value: nil

]

{ #category : 'Grail-Class Methods' }
AbstractPyFloat class >> fromhex: hexString [
	"Delegate to float's parser, then construct THIS class (mirrors
	float class>>fromhex:'s own subclass routing -- see there)."

	^ self value: (Array @env0:with: (float ___parseHex___: hexString)) value: nil

]

{ #category : 'Grail-Attributes' }
AbstractPyFloat >> ___grailValueImplements___: aSym [
	"Whether the wrapped value's class implements aSym at ANY arity -- the
	probe AbstractPyInt >> ___grailValueImplements___: makes, for the reason it
	gives.  This one asked for the UNARY selector only, so every float method
	that takes an argument (``__truediv__'' is ``__truediv__:'') was missing
	from a float subclass, and from super() inside one (Super >>
	___superValueMethodFor___:)."

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
AbstractPyFloat >> ___new__: positional kw: keywords [
	"float-subclass constructor (self is the CLASS; see AbstractPyInt).
	MyFloat(2.5) / MyFloat('2.5') construct through float's conversion;
	a conversion failure leaves the value slot for __init__ (enum-style
	subclasses construct with non-numeric args) -- but only when the
	class actually HAS its own __init__ to fill it afterward: a plain
	``class subclass(float): pass'' has nothing to recover with, so a
	genuine conversion failure must propagate (test_float.py's
	test_keywords_in_subclass: ``subclass(x=0)'' must raise TypeError,
	not silently construct 0.0).  CPython's float() also takes NO
	keyword arguments at all, unlike int()'s 'base'."

	| inst v |
	(keywords @env0:notNil and: [keywords @env0:notEmpty]) ifTrue: [
		(self ___hasUserInit___) ifFalse: [
			TypeError ___signal___: 'float() takes no keyword arguments']].
	inst := self @env0:new.
	v := [positional @env0:size @env0:= 0
			ifTrue: [0.0]
			ifFalse: [float __new__: (positional @env0:at: 1)]]
		@env0:on: AbstractException
		do: [:ex | (self ___hasUserInit___) ifTrue: [ex @env0:return: nil] ifFalse: [ex @env0:pass]].
	v == nil ifFalse: [
		inst @env0:dynamicInstVarAt: #value put: v].
	^ inst

]

{ #category : 'Grail-Attributes' }
AbstractPyFloat >> ___pyAttrLoad___: aSym [
	"Let an ATTRIBUTE LOAD reach the wrapped value's method suite.

	``class F(float)'' cannot be a real subclass -- the kernel class is
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
			(self ___grailValueImplements___: aSym)
				ifTrue: [ex @env0:return: (BoundMethod receiver: self @env0:value selector: aSym)]
				ifFalse: [ex @env0:pass]]

]

{ #category : 'Grail-Introspection' }
AbstractPyFloat >> ___pyHiddenStateNames___ [
	"The dynamic instVars that are Grail's IMPLEMENTATION rather than Python
	attributes: a subclass instance of this root keeps its builtin value under
	#value.  The __dict__ view and __getstate__ leave them out -- otherwise
	``vars(MyInt(7))'' answered {'value': 7} and a pickle of it carried that as
	instance state, which CPython would read back as a real attribute."

	^ #( #value )

]

{ #category : 'Grail-Introspection' }
AbstractPyFloat >> __dict__ [
	"``obj.__dict__'' for a SUBCLASS instance (every instance of this root is
	one: an exact builtin value is a kernel object) -- the live dynamic-instVar
	view list and bytes publish, minus ___pyHiddenStateNames___.  test_pickle's
	newobj tests read it to compare a round-tripped object's attributes."

	^ PyInstanceDict @env0:on: self

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __eq__: other [
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __eq__: (other @env0:value)
	].
	^ self @env0:value __eq__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __float__ [
	^ self @env0:value

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __ge__: other [
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __ge__: (other @env0:value)
	].
	^ self @env0:value __ge__: other

]

{ #category : 'Grail-Pickle' }
AbstractPyFloat >> __getnewargs__ [
	"CPython's float.__getnewargs__: the argument tuple that rebuilds this
	value through __new__.

	The underlying float, matching CPython's float.__getnewargs__().

	It exists for PICKLING an immutable builtin's subclass.  Such a subclass
	carries its value in the CONSTRUCTOR, not in instance state, so
	object.__reduce_ex__'s new-style reduction has to hand the value back as a
	__new__ argument -- ``float.__new__(MySub)'' alone rebuilds an empty one and
	the value is gone.  Grail's pickle used to reduce any float subclass to a
	plain float, losing the class outright."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: { self @env0:value }

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __gt__: other [
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __gt__: (other @env0:value)
	].
	^ self @env0:value __gt__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __hash__ [
	^ self @env0:value __hash__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __int__ [
	^ (self @env0:value) @env0:truncated

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __le__: other [
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __le__: (other @env0:value)
	].
	^ self @env0:value __le__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __lt__: other [
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __lt__: (other @env0:value)
	].
	^ self @env0:value __lt__: other

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __ne__: other [
	"Punts where __eq__: punts -- see Int.gs's twin __ne__: for why
	negating the singleton instead is an uncatchable error."

	| equal |

	equal := self __eq__: other.
	(equal @env0:== NotImplemented) ifTrue: [^ equal].
	^ equal @env0:not

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __repr__ [
	^ self @env0:value __repr__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyFloat >> __str__ [
	^ self @env0:value __str__

]
