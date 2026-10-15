Extension { #name : 'ellipsis' }

{ #category : 'Grail-Singleton' }
ellipsis class >> __new__ [
	"The selector the generic instantiation path actually reaches for ``cls()''.

	Without it the path allocated a FRESH instance, and because that instance
	answers the same __repr__ the difference was invisible to anything but ``is'':
	``type(...)()'' printed Ellipsis and was not Ellipsis.  A second instance of a
	singleton type is worse than an error -- it makes an identity test that reads
	as safe silently wrong."

	^ self instance

]

{ #category : 'Grail-Singleton' }
ellipsis class >> clearInstance [
	"Clear the singleton instance (testing only)."
	instance := nil

]

{ #category : 'Grail-Singleton' }
ellipsis class >> instance [
	"The singleton ``Ellipsis'', allocated on first access.  The nil test is
	internal bookkeeping for ''not yet allocated'', not the Python None value."

	instance == nil ifTrue: [
		instance := self @env0:basicNew].
	^ instance

]

{ #category : 'Grail-Singleton' }
ellipsis class >> new [
	"``type(...)()'' answers the singleton in CPython rather than raising, and
	rather than making a second one -- the type is documented as having exactly
	one instance, so a fresh allocation would break ``x is Ellipsis'' for it."

	^ self instance

]

{ #category : 'Grail-Convenience Methods - Attribute' }
ellipsis >> ___pyAttrStore___: aName put: aValue [
	"``Ellipsis.x = 1'' raises AttributeError in CPython: the singleton types
	carry no instance dictionary, so there is nowhere for the attribute to go.

	Grail ACCEPTED it.  Ellipsis is an ordinary GemStone object and the generic
	store in object>>___pyAttrStore___:put: writes a dynamic instVar on
	anything that will take one, so a mistyped assignment succeeded silently
	and was then visible to every later read in the session -- ``Ellipsis.x''
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
ellipsis >> __bool__ [
	"CPython: ``bool(...)'' is True.  Only None, False, zero and empty
	containers are falsy; a singleton with no contents is not one of them."
	^ true

]

{ #category : 'Grail-Special Methods' }
ellipsis >> __eq__: other [
	"Ellipsis equals only itself.  Anything else answers NotImplemented rather
	than false, so the operator layer can still try the REFLECTED __eq__ -- the
	same reason NoneType >> __eq__: punts, and what makes ``... == ALWAYS_EQ''
	True while ``... == '...''' stays False."

	(other == self) ifTrue: [^ true].
	^ NotImplemented

]

{ #category : 'Grail-Python protocol' }
ellipsis >> __ge__: other [
	TypeError ___signal___: ('''>='' not supported between instances of ''ellipsis'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Python protocol' }
ellipsis >> __gt__: other [
	TypeError ___signal___: ('''>'' not supported between instances of ''ellipsis'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Special Methods' }
ellipsis >> __hash__ [
	"Python's hash(...) is implementation-defined and constant within a process.
	Any fixed value serves; this one is not 0, so a dict keyed by both None and
	Ellipsis does not collide on every lookup."
	^ 269

]

{ #category : 'Grail-Python protocol' }
ellipsis >> __le__: other [
	TypeError ___signal___: ('''<='' not supported between instances of ''ellipsis'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Python protocol' }
ellipsis >> __lt__: other [
	"Ordering an ellipsis raises catchable TypeError, as in CPython.  The message
	names the type on both sides, which is what dir()'s failure looks like when a
	custom __dir__ mixes ``...'' in with strings."

	TypeError ___signal___: ('''<'' not supported between instances of ''ellipsis'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')

]

{ #category : 'Grail-Special Methods' }
ellipsis >> __ne__: other [
	"Mirror __eq__: punt to the reflected side rather than deciding by identity."

	(other == self) ifTrue: [^ false].
	^ NotImplemented

]

{ #category : 'Grail-Special Methods' }
ellipsis >> __reduce__ [
	"CPython answers the STRING 'Ellipsis' -- the name pickle then resolves out
	of the copyreg/builtins namespace, which is how a pickled ellipsis comes back
	as the same singleton rather than a fresh object.  copy.copy / copy.deepcopy
	go through the same protocol, so all three round-trip on this one method."
	^ 'Ellipsis'

]

{ #category : 'Grail-String Representation' }
ellipsis >> __repr__ [
	^ 'Ellipsis'

]

{ #category : 'Grail-String Representation' }
ellipsis >> __str__ [
	"CPython has no ellipsis __str__, so str() falls through to __repr__ and
	answers 'Ellipsis'.  Spelled out rather than inherited because object >>
	__str__ would otherwise have to be trusted to route back here."
	^ 'Ellipsis'

]
