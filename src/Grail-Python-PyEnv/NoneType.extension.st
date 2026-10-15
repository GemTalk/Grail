Extension { #name : 'NoneType' }

{ #category : 'Grail-Singleton' }
NoneType class >> __new__ [
	"The selector the generic instantiation path actually reaches for ``cls()'';
	see ``new'' beside it.  Without it that path allocates a FRESH instance,
	which is worse than an error -- a second None answers the same __repr__, so
	nothing but ``is'' can see the difference and every ``x is None'' test in the
	program silently stops matching it."

	^ self instance

]

{ #category : 'Grail-Singleton' }
NoneType class >> clearInstance [
	"Clear the singleton instance (useful for testing only)."
	instance := nil

]

{ #category : 'Grail-Singleton' }
NoneType class >> instance [
	"Return the singleton ``None`` instance, allocating it on first access.
	The check uses Smalltalk ``nil`` to mean ''not yet allocated''; this is
	an internal bookkeeping use of nil, not the Python None value."

	instance == nil ifTrue: [
		instance := self @env0:basicNew.
	].
	^ instance

]

{ #category : 'Grail-Singleton' }
NoneType class >> new [
	"``type(None)()'' answers None in CPython rather than raising -- the type is
	documented as having exactly one instance, and calling it hands that one
	back.  It is the ROUND TRIP that needs this: ``tp = type(x); tp()'' is how
	generic code reconstructs a value it was given, and NoneType was the only one
	of the three singleton types that refused.  ellipsis and NotImplementedType
	have answered their instance since they were written; this one raised
	``cannot create 'NoneType' instances'', which is CPython's wording for a type
	that cannot be instantiated AT ALL and so read as deliberate.  test_builtin
	test_construct_singletons.

	Arity is unaffected: ``type(None)(1, 2)'' still raises TypeError, because the
	generic call path checks the argument count before it reaches here."

	^ self instance

]

{ #category : 'Grail-Convenience Methods - Attribute' }
NoneType >> ___pyAttrStore___: aName put: aValue [
	"``None.x = 1'' raises AttributeError in CPython: the singleton types
	carry no instance dictionary, so there is nowhere for the attribute to go.

	Grail ACCEPTED it.  None is an ordinary GemStone object and the generic
	store in object>>___pyAttrStore___:put: writes a dynamic instVar on
	anything that will take one, so a mistyped assignment succeeded silently
	and was then visible to every later read in the session -- ``None.x''
	answered 1 instead of raising.  Nothing is committed, so the damage stops
	at the session boundary, but within a session it is a wrong answer rather
	than an error.

	Overridden HERE rather than guarded in the generic store because this is a
	property of the TYPE, and the type is the thing that knows it.
	test_builtin test_singleton_attribute_access."

	"@env0: because ___signalMissing___:on: is compiled in env 0 and this
	method is in the file's env-1 region -- an unqualified send lands in
	env 1 and misses, turning the refusal into an uncatchable MNU."
	"GRAIL'S OWN BOOKKEEPING IS NOT A PYTHON ATTRIBUTE, and it lands here.
	ClassDefAst emits a closure-cell store ``<cls> ___pyAttrStore___:
	#'___cell_<name>___' put: [...]'' for every enclosing local a class's
	methods capture, and the receiver is whatever the class name holds at
	that moment -- which is None for a classdef whose name is not yet bound
	to a class (DunderClassInjectedCellTestCase, all five of its tests).
	Refusing those broke the closure-cell machinery outright.

	The ``___'' prefix is the whole of Grail's internal attribute namespace
	(___cell_x___, ___cellSetter_x___, ___qualname___, ...), so this lets the
	implementation through while still refusing everything a Python program
	would actually write.  The divergence it leaves is that ``None.___x___ =
	1'' is accepted where CPython refuses -- a name no program writes, traded
	for not having to teach every internal store about singleton receivers."
	(aName @env0:asString @env0:size @env0:>= 3
		@env0:and: [(aName @env0:asString @env0:copyFrom: 1 to: 3) @env0:= '___'])
		ifTrue: [^ super ___pyAttrStore___: aName put: aValue].
	^ AttributeError @env0:___signalNoDict___: aName on: self

]

{ #category : 'Grail-Special Methods' }
NoneType >> __bool__ [
	^ false

]

{ #category : 'Grail-Protocol Refusal' }
NoneType >> __contains__: item [
	<grailProtocolRefusal>
	"``x in None`` raises catchable TypeError (CPython)."

	TypeError ___signal___: 'argument of type ''NoneType'' is not iterable'

]

{ #category : 'Grail-Special Methods' }
NoneType >> __eq__: other [
	"None equals only itself.  Anything else answers NotImplemented rather
	than false, so the operator layer can still try the REFLECTED __eq__ --
	CPython's ``None == ALWAYS_EQ'' is True (test_compare.test_issue_1393's
	sibling case).  ___cmpEq___ -> ___eqValue___ falls back to identity when
	the operand has no __eq__ of its own, so ``None == 1'' stays False."

	(other == self) ifTrue: [^ true].
	^ NotImplemented

]

{ #category : 'Grail-Python protocol' }
NoneType >> __ge__: other [
	TypeError ___signal___: ('''>='' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Protocol Refusal' }
NoneType >> __getitem__: idx [
	<grailProtocolRefusal>
	"None[i] raises catchable TypeError (CPython)."

	TypeError ___signal___: '''NoneType'' object is not subscriptable'

]

{ #category : 'Grail-Python protocol' }
NoneType >> __gt__: other [
	TypeError ___signal___: ('''>'' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Special Methods' }
NoneType >> __hash__ [
	"Python's hash(None) is implementation-defined and constant within a
	process. Any fixed value is acceptable; 0 is the simplest choice."
	^ 0

]

{ #category : 'Grail-Protocol Refusal' }
NoneType >> __iter__ [
	<grailProtocolRefusal>
	"Iterating None raises catchable TypeError (CPython).  Without a
	real method the send died as an UNCATCHABLE env-1 MNU -- Object's
	DNU deliberately does not intercept the probe selectors
	__iter__/__len__/__getitem__, but a real method on NoneType alone
	is safe (operator.countOf(None, None) in test_operator)."

	TypeError ___signal___: '''NoneType'' object is not iterable'

]

{ #category : 'Grail-Python protocol' }
NoneType >> __le__: other [
	TypeError ___signal___: ('''<='' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Protocol Refusal' }
NoneType >> __len__ [
	<grailProtocolRefusal>
	"len(None) raises catchable TypeError (CPython)."

	TypeError ___signal___: 'object of type ''NoneType'' has no len()'

]

{ #category : 'Grail-Python protocol' }
NoneType >> __lt__: other [
	"Ordering None raises catchable TypeError (CPython) -- an env-1
	MNU killed test_tuple's whole run."

	TypeError ___signal___: ('''<'' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Special Methods' }
NoneType >> __ne__: other [
	"Mirror __eq__: punt to the reflected side instead of deciding by
	identity (see the comment there)."

	(other == self) ifTrue: [^ false].
	^ NotImplemented

]

{ #category : 'Grail-String Representation' }
NoneType >> __repr__ [
	^ 'None'

]

{ #category : 'Grail-Special Methods' }
NoneType >> __str__ [
	^ 'None'

]

{ #category : 'Grail-Special Methods' }
NoneType >> < other [
	"Sort blocks send env-1 #< directly (not the dunder)."

	^ self __lt__: other

]

{ #category : 'Grail-Python protocol' }
NoneType >> <= other [
	^ self __le__: other

]

{ #category : 'Grail-Python protocol' }
NoneType >> > other [
	^ self __gt__: other

]

{ #category : 'Grail-Python protocol' }
NoneType >> >= other [
	^ self __ge__: other

]
