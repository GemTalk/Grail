Extension { #name : 'NotImplementedType' }

{ #category : 'Grail-Singleton' }
NotImplementedType class >> __new__ [
	"The selector the generic instantiation path reaches for ``cls()''; see
	``new'' beside it."

	^ self instance

]

{ #category : 'Grail-Singleton' }
NotImplementedType class >> clearInstance [
	"Clear the singleton instance (testing only)."
	instance := nil

]

{ #category : 'Grail-Singleton' }
NotImplementedType class >> instance [
	"The singleton ``NotImplemented'', allocated on first access.  The nil test is
	internal bookkeeping for ''not yet allocated'', not the Python None value."

	instance == nil ifTrue: [
		instance := self @env0:basicNew].
	^ instance

]

{ #category : 'Grail-Singleton' }
NotImplementedType class >> new [
	"``type(NotImplemented)()'' answers the singleton in CPython rather than
	raising or making a second one.  A second instance of a singleton type is
	worse than an error: every ``is NotImplemented'' test in the operator layer
	would silently stop matching it."

	^ self instance

]

{ #category : 'Grail-Special Methods' }
NotImplementedType >> ___isTruthy___ [
	"The internal truth test, which must raise for the same reason __bool__ does.
	Routed through __bool__ rather than answering a Boolean, so there is one
	place that decides -- the env-0 ``ifTrue:'' sites that used to receive a
	truthy Symbol now get a catchable Python exception instead."

	^ self __bool__

]

{ #category : 'Grail-Convenience Methods - Attribute' }
NotImplementedType >> ___pyAttrStore___: aName put: aValue [
	"``NotImplemented.x = 1'' raises AttributeError in CPython: the singleton types
	carry no instance dictionary, so there is nowhere for the attribute to go.

	Grail ACCEPTED it.  NotImplemented is an ordinary GemStone object and the generic
	store in object>>___pyAttrStore___:put: writes a dynamic instVar on
	anything that will take one, so a mistyped assignment succeeded silently
	and was then visible to every later read in the session -- ``NotImplemented.x''
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
NotImplementedType >> __bool__ [
	"CPython raises here, and the raise is the POINT.  ``NotImplemented'' means
	``I decline to answer'', so using it as a truth value is always a bug in the
	caller -- most often ``if a.__eq__(b):'', which reads as an equality test and
	is not one.  CPython made this a TypeError in 3.12 after two releases of
	DeprecationWarning.

	Grail's old Symbol sentinel was truthy, so the same mistake took the wrong
	branch in silence."

	^ TypeError ___signal___:
		'NotImplemented should not be used in a boolean context'

]

{ #category : 'Grail-Special Methods' }
NotImplementedType >> __eq__: other [
	"Identity only, and no punting: answering NotImplemented from
	NotImplemented's own __eq__ would ask the operator layer to reflect onto a
	value that is itself the decline marker.  CPython compares it by identity
	through object.__eq__ and answers False for anything else."

	^ other == self

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> __ge__: other [
	TypeError ___signal___: ('''>='' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> __gt__: other [
	TypeError ___signal___: ('''>'' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Special Methods' }
NotImplementedType >> __hash__ [
	"Implementation-defined and constant within a process; any fixed value serves.
	Distinct from None's 0 and ellipsis's 269 so a dict keyed by all three does
	not collide on every lookup."
	^ 271

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> __le__: other [
	TypeError ___signal___: ('''<='' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> __lt__: other [
	TypeError ___signal___: ('''<'' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Special Methods' }
NotImplementedType >> __ne__: other [
	^ (other == self) not

]

{ #category : 'Grail-Special Methods' }
NotImplementedType >> __reduce__ [
	"CPython answers the STRING 'NotImplemented' -- the name pickle resolves out
	of builtins, which is how a pickled singleton comes back as the same object.
	copy.copy / copy.deepcopy go through the same protocol."
	^ 'NotImplemented'

]

{ #category : 'Grail-String Representation' }
NotImplementedType >> __repr__ [
	^ 'NotImplemented'

]

{ #category : 'Grail-String Representation' }
NotImplementedType >> __str__ [
	"CPython has no NotImplementedType __str__, so str() falls through to
	__repr__.  Spelled out rather than relying on object >> __str__ routing back."
	^ 'NotImplemented'

]
