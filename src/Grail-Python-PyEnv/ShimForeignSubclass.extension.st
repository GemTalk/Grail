Extension { #name : 'ShimForeignSubclass' }

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___grailDefinesBelowForeignBase___: aName [
	"Does a Python class between this one and the foreign base define aName
	in its own __dict__?"

	| c |
	c := self.
	[c @env0:notNil and: [c ~~ ShimForeignSubclass]] whileTrue: [
		((c ___pyAttrLoad___: #'__dict__') __contains__: aName) == true ifTrue: [^ true].
		c := c @env0:superclass].
	^ false

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___grailMetaclassCall___: positional kw: kwargs [
	"``cls(...)'' -- type_call for a class whose base is a C type: its __new__
	(a Python one, or the base's tp_new through ``base.__new__'', which
	allocates through the class's subtype mirror: CPythonShim>>
	PyType_AllocForeignSubclass:type:basicSize:), then a Python __init__ when
	a class below the base defines one and the result is an instance."

	| newFn obj base |
	"A C base with no tp_new cannot make instances, and no subtype of it can
	unless Python supplies a __new__: CPython's type_call refuses with the
	SUBTYPE's name, which it inherits a NULL tp_new along with."
	(self ___grailDefinesBelowForeignBase___: '__new__') ifFalse: [
		base := ShimForeignSubclass @env0:___foreignBaseOf: self.
		(base @env0:notNil and: [(CPythonShim @env0:current @env0:foreignTypeHasNew: base @env0:cPtr) not])
			ifTrue: [^ TypeError ___signal___:
				('cannot create ''' @env0:, (self ___pyAttrLoad___: #'__name__') @env0:asString @env0:, ''' instances')]].
	newFn := self ___pyAttrLoad___: #'__new__'.
	obj := newFn value: ((Array @env0:with: self) @env0:, positional) value: kwargs.
	((obj @env0:isKindOf: self) and: [self ___grailDefinesBelowForeignBase___: '__init__'])
		ifTrue: [(obj ___pyAttrLoad___: #'__init__') value: positional value: kwargs].
	^ obj

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___pyAttrLoad___: aSym [
	"A class attribute the Python classes do not define is the foreign base's:
	``memmap.sum'', and the ``__array_finalize__'' numpy reads off the TYPE and
	compares with ndarray's own.  ``__new__'' too, unless a Python class below
	the base defines it: object's would make an instance with no body."

	| found v noFallback |
	noFallback := ShimForeignSubclass @env0:___grailNoFallbackFor: self name: aSym.
	(aSym == #'__new__' and: [noFallback not]) ifTrue: [
		(self ___grailDefinesBelowForeignBase___: '__new__') ifFalse: [
			^ self @env0:___grailForeignBaseProxy___ ___pyAttrLoad___: aSym]].
	found := true.
	v := [super ___pyAttrLoad___: aSym]
		@env0:on: AttributeError do: [:ex | found := false. ex @env0:return: nil].
	found ifTrue: [^ v].
	noFallback ifTrue: [^ super ___pyAttrLoad___: aSym].
	^ self @env0:___grailForeignBaseProxy___ ___pyAttrLoad___: aSym

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> __base__ [
	"See __bases__."

	((ShimForeignSubclass @env0:___foreignBases) @env0:includesKey: self) ifTrue: [
		^ ShimForeignSubclass @env0:___foreignBaseOf: self].
	^ super __base__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> __bases__ [
	"The foreign type for a class built directly on it, as CPython has it."

	| base |
	base := ShimForeignSubclass @env0:___foreignBaseOf: self.
	((ShimForeignSubclass @env0:___foreignBases) @env0:includesKey: self) ifTrue: [
		^ self ___grailAsTuple___: (Array @env0:with: base)].
	^ super __bases__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> __mro__ [
	"The Smalltalk chain with this class in it replaced by the foreign type,
	so ``class Sub(Box)'' reads (Sub, Box, object) as in CPython (the foreign
	type's own C bases are not walked)."

	| base out |
	base := ShimForeignSubclass @env0:___foreignBaseOf: self.
	base @env0:isNil ifTrue: [^ super __mro__].
	out := Array @env0:new.
	(super __mro__) @env0:do: [:c |
		out @env0:add: (c == ShimForeignSubclass ifTrue: [base] ifFalse: [c])].
	^ self ___grailAsTuple___: out

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> ___pyAttrForeignBaseLoad___: aSym [
	"What the Python classes and the instance do not define is the base type's,
	read off the body -- ndarray's ``shape'', ``sum'', ``T'' on a memmap --
	before __getattr__ and the AttributeError (object>>___pyAttrLoad___:).
	CPython's order differs only for a base DATA descriptor shadowed by an
	instance attribute of the same name."

	| found v |
	grailForeignBody @env0:isNil ifTrue: [^ nil].
	(ShimForeignSubclass @env0:___grailNoFallbackFor: self name: aSym) ifTrue: [^ nil].
	found := true.
	v := [self @env0:___grailBodyProxy___ ___pyAttrLoad___: aSym]
		@env0:on: AttributeError do: [:ex | found := false. ex @env0:return: nil].
	found ifFalse: [^ nil].
	^ aSym @env0:-> v

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> ___pyAttrStore___: aName put: aValue [
	"A DATA descriptor of the C base -- ndarray's ``shape'' (numpy's matrix
	sets ``self.shape'' in __array_finalize__), ``dtype'' -- is the base's to
	set, through the body; every other name is this half's own attribute, as
	it would be the instance dict's in CPython.  The base's descriptor names
	are fetched once per type (CPythonShim>>foreignDataDescriptorNames:), so an
	ordinary store needs no call into C."

	| shim body |
	body := grailForeignBody.
	body @env0:notNil ifTrue: [
		shim := CPythonShim @env0:current.
		((shim @env0:foreignDataDescriptorNames: (body @env0:int64At: 8))
				@env0:includes: aName @env0:asSymbol)
			ifTrue: [
				(shim @env0:foreignSetAttr: body @env0:memoryAddress
					name: aName @env0:asString value: aValue) == true ifTrue: [^ aValue]]].
	^ super ___pyAttrStore___: aName put: aValue

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __abs__ [
	^ self @env0:___grailBodyProxy___ __abs__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __add__: other [
	^ self @env0:___grailBodyProxy___ __add__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __and__: other [
	^ self @env0:___grailBodyProxy___ __and__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __bool__ [
	^ self @env0:___grailBodyProxy___ __bool__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __contains__: value [
	^ self @env0:___grailBodyProxy___ __contains__: value

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __delitem__: key [
	^ self @env0:___grailBodyProxy___ __delitem__: key

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __divmod__: other [
	^ self @env0:___grailBodyProxy___ __divmod__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __eq__: other [
	^ self @env0:___grailBodyProxy___ __eq__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __float__ [
	^ self @env0:___grailBodyProxy___ __float__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __floordiv__: other [
	^ self @env0:___grailBodyProxy___ __floordiv__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ge__: other [
	^ self @env0:___grailBodyProxy___ __ge__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __getitem__: key [
	^ self @env0:___grailBodyProxy___ __getitem__: key

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __gt__: other [
	^ self @env0:___grailBodyProxy___ __gt__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __hash__ [
	^ self @env0:___grailBodyProxy___ __hash__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __iadd__: other [
	^ self @env0:___grailBodyProxy___ __iadd__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __iand__: other [
	^ self @env0:___grailBodyProxy___ __iand__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ifloordiv__: other [
	^ self @env0:___grailBodyProxy___ __ifloordiv__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ilshift__: other [
	^ self @env0:___grailBodyProxy___ __ilshift__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __imatmul__: other [
	^ self @env0:___grailBodyProxy___ __imatmul__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __imod__: other [
	^ self @env0:___grailBodyProxy___ __imod__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __imul__: other [
	^ self @env0:___grailBodyProxy___ __imul__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __index__ [
	^ self @env0:___grailBodyProxy___ __index__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __int__ [
	^ self @env0:___grailBodyProxy___ __int__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __invert__ [
	^ self @env0:___grailBodyProxy___ __invert__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ior__: other [
	^ self @env0:___grailBodyProxy___ __ior__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ipow__: other [
	^ self @env0:___grailBodyProxy___ __ipow__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __irshift__: other [
	^ self @env0:___grailBodyProxy___ __irshift__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __isub__: other [
	^ self @env0:___grailBodyProxy___ __isub__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __iter__ [
	^ self @env0:___grailBodyProxy___ __iter__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __itruediv__: other [
	^ self @env0:___grailBodyProxy___ __itruediv__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ixor__: other [
	^ self @env0:___grailBodyProxy___ __ixor__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __le__: other [
	^ self @env0:___grailBodyProxy___ __le__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __len__ [
	^ self @env0:___grailBodyProxy___ __len__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __lshift__: other [
	^ self @env0:___grailBodyProxy___ __lshift__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __lt__: other [
	^ self @env0:___grailBodyProxy___ __lt__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __matmul__: other [
	^ self @env0:___grailBodyProxy___ __matmul__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __mod__: other [
	^ self @env0:___grailBodyProxy___ __mod__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __mul__: other [
	^ self @env0:___grailBodyProxy___ __mul__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ne__: other [
	^ self @env0:___grailBodyProxy___ __ne__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __neg__ [
	^ self @env0:___grailBodyProxy___ __neg__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __next__ [
	^ self @env0:___grailBodyProxy___ __next__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __or__: other [
	^ self @env0:___grailBodyProxy___ __or__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __pos__ [
	^ self @env0:___grailBodyProxy___ __pos__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __pow__: other [
	^ self @env0:___grailBodyProxy___ __pow__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __pow__: other _: modulus [
	^ self @env0:___grailBodyProxy___ __pow__: other _: modulus

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __radd__: other [
	^ self @env0:___grailBodyProxy___ __radd__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rand__: other [
	^ self @env0:___grailBodyProxy___ __rand__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rdivmod__: other [
	^ self @env0:___grailBodyProxy___ __rdivmod__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __repr__ [
	^ self @env0:___grailBodyProxy___ __repr__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rfloordiv__: other [
	^ self @env0:___grailBodyProxy___ __rfloordiv__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rlshift__: other [
	^ self @env0:___grailBodyProxy___ __rlshift__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rmatmul__: other [
	^ self @env0:___grailBodyProxy___ __rmatmul__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rmod__: other [
	^ self @env0:___grailBodyProxy___ __rmod__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rmul__: other [
	^ self @env0:___grailBodyProxy___ __rmul__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __ror__: other [
	^ self @env0:___grailBodyProxy___ __ror__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rpow__: other [
	^ self @env0:___grailBodyProxy___ __rpow__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rrshift__: other [
	^ self @env0:___grailBodyProxy___ __rrshift__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rshift__: other [
	^ self @env0:___grailBodyProxy___ __rshift__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rsub__: other [
	^ self @env0:___grailBodyProxy___ __rsub__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rtruediv__: other [
	^ self @env0:___grailBodyProxy___ __rtruediv__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __rxor__: other [
	^ self @env0:___grailBodyProxy___ __rxor__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __setitem__: key _: value [
	^ self @env0:___grailBodyProxy___ __setitem__: key _: value

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __str__ [
	^ self @env0:___grailBodyProxy___ __str__

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __sub__: other [
	^ self @env0:___grailBodyProxy___ __sub__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __truediv__: other [
	^ self @env0:___grailBodyProxy___ __truediv__: other

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> __xor__: other [
	^ self @env0:___grailBodyProxy___ __xor__: other

]
