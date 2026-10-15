Extension { #name : 'ShimForeignSubclass' }

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___grailMetaclassCall___: positional kw: kwargs [
	"``cls(...)'' -- refused, with CPython's message for a class it cannot
	instantiate and the reason.  This is the first thing every class's
	synthesized instantiation method asks, so the refusal comes before any
	__new__ runs: numpy's memmap.__new__ would otherwise call
	ndarray.__new__(memmap, ...), handing numpy a type it cannot allocate."

	| base |
	base := ShimForeignSubclass @env0:___foreignBaseOf: self.
	^ TypeError ___signal___: ((('cannot create ''' @env0:, self @env0:name @env0:asString)
		@env0:, ''' instances: Grail cannot yet make an instance of a Python subclass of the C extension type ''')
		@env0:, (base @env0:isNil ifTrue: ['?'] ifFalse: [base @env0:typeName]))
		@env0:, ''''

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
