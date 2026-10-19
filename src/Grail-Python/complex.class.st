"Python complex number type.

Represents complex numbers with real and imaginary parts.
Both parts are stored as Float values internally via dynamic
instance variables (#real, #imag), so ``cpx.real' from Python
returns the float value directly through ___pyAttrLoad___'s
dynamic-instVar probe (not a BoundMethod), and ``del cpx.real'
truly removes the binding.

"
Class {
	#name : 'complex',
	#superclass : 'object',
	#category : 'Grail-Numbers'
}

{ #category : 'Grail-Introspection' }
complex class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Arithmetic Support' }
complex >> _coerce: aNumber [
	"Coerce aNumber to complex.
	Convert aNumber to a complex number with zero imaginary part.

	An operand that is ALREADY complex is answered unchanged rather than put
	through the two-argument constructor: that is now Python's component form,
	which DeprecationWarns when handed a complex, and this is GemStone's
	internal generality coercion -- no Python call site, nothing to deprecate."

	^ (aNumber isKindOf: complex)
		ifTrue: [aNumber]
		ifFalse: [complex @env1:__new__: aNumber _: 0.0]

]

{ #category : 'Grail-Arithmetic Support' }
complex >> _generality [
	"Return generality for complex in numeric hierarchy.
	complex has the HIGHEST generality (90) so other types get coerced to complex.
	Hierarchy: bool(10) < SmallInt(20) < LargeInt(40) < Fraction(70) < Float(85) < complex(90)."

	^ 90

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> - aNumber [
	"Subtract aNumber from complex."

	^ self @env1:__sub__: aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> * aNumber [
	"Multiply complex by aNumber."

	^ self @env1:__mul__: aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> / aNumber [
	"Divide complex by aNumber."

	^ self @env1:__truediv__: aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> + aNumber [
	"Add aNumber to complex."

	^ self @env1:__add__: aNumber

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> = anObject [
	"Equality comparison -- the SMALLTALK one, which collections use and which
	must answer a Boolean.  __eq__ answers NotImplemented for a non-number, and
	handed back raw that was ``Expected NotImplemented to be a Boolean'', an
	uncatchable error: ``(2+3j,) == (K(),)'' compared elements with this, and so
	did a dict lookup whose hash met a complex key -- typing's typed cache ran
	into it at random, as Literal[3j + 2, ...] (test_typing LiteralTests).
	NotImplemented means not equal here, as it does at the end of Python's
	own comparison."

	| r |
	r := self @env1:__eq__: anObject.
	^ r == true

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> abs [
	"Return the magnitude of the complex number."

	^ self @env1:__abs__

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> hash [
	"Smalltalk hash, paired with ``=`` above.

	Overriding ``=`` without overriding ``hash`` breaks the collection
	invariant ``a = b implies a hash = b hash'': complex inherited Object's
	IDENTITY hash, so two separately-computed equal complex values hashed
	differently and dict -- backed by a GemStone KeyValueDictionary, which
	buckets on this selector -- could not find a key it already held.
	``d[3j] = 'a'; d[3j]'' raised, and ``{0j: 1j} == {0j: 1j}'' was False.
	It showed up as an intermittent failure in test.test_richcmp's
	DictTest.test_dicts, whose dicts are keyed by ``random.randrange(100)*1j''
	-- so whether it fired at all depended on the random draw.

	A ZERO imaginary part must answer the real part's OWN hash, unmasked,
	because __eq__ says ``complex(5) == 5'': an equal Number key has to land
	in the same bucket, and GemStone already agrees across numeric types
	(``5 hash = 5.0 hash'').  Only the genuinely-complex case is folded, where
	no cross-type equality can apply."

	| im |
	im := self @env0:dynamicInstVarAt: #imag.
	(im @env0:= 0) ifTrue: [^ (self @env0:dynamicInstVarAt: #real) @env0:hash].
	^ (((self @env0:dynamicInstVarAt: #real) @env0:hash)
		@env0:bitXor: (im @env0:hash) @env0:* 1000003) @env0:bitAnd: 16r3FFFFFFF

]

{ #category : 'Grail-Arithmetic Support' }
complex >> isNumber [
	"Return true - complex participates in arithmetic as a number."

	^ true

]

{ #category : 'Grail-Arithmetic Operators' }
complex >> negated [
	"Negate the complex number."

	^ self @env1:__neg__

]
