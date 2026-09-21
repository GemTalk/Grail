! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- NoneType class (Python 'NoneType' type)
!
! Singleton class whose sole instance is bound to `None` in the Python
! dictionary. Distinct from Smalltalk `nil`: in Grail, `nil` represents an
! undefined / unbound value, while `None` is the explicit Python value
! returned by e.g. functions with no `return`, or used as a sentinel.

expectvalue /Class
doit
object subclass: 'NoneType'
  instVarNames: #()
  classVars: #()
  classInstVars: #( instance )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
NoneType comment:
'Python ''NoneType'' — the type of the singleton ``None``.

There is exactly one instance, accessible via ``NoneType instance`` (the
class-side singleton accessor) or as the global ``None`` in the Python
dictionary. Constructing a fresh instance is forbidden.

`None` is conceptually distinct from Smalltalk ``nil``. ``nil`` represents
an undefined / unbound variable; ``None`` is an actual Python value with
its own type and identity. Code generated from a Python ``None`` literal
emits a reference to the global ``None``, not ``nil``.'
%

expectvalue /Class
doit
NoneType category: 'Grail-Singleton'
%

! ------------------- Remove existing methods from NoneType
expectvalue /Metaclass3
doit
NoneType removeAllMethods: 1.
NoneType class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Singleton'
classmethod: NoneType
___instance___
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance
%

category: 'Grail-Singleton'
classmethod: NoneType
new
	"Block env-0 ``NoneType new`` so it cannot bypass the env-1 method that
	raises TypeError. Allocation of the sole instance still goes through
	``basicNew`` from inside ``instance``."
	^ self @env1:new
%

category: 'Grail-Python protocol'
method: NoneType
< other
	"Smalltalk sort blocks send env-0 #< directly; route to the
	catchable TypeError instead of an uncatchable MNU."
	^ self @env1:__lt__: other
%

category: 'Grail-Python protocol'
method: NoneType
<= other
	^ self @env1:__le__: other
%

category: 'Grail-Python protocol'
method: NoneType
> other
	^ self @env1:__gt__: other
%

category: 'Grail-Python protocol'
method: NoneType
>= other
	^ self @env1:__ge__: other
%

set compile_env: 1

category: 'Grail-Singleton'
classmethod: NoneType
clearInstance
	"Clear the singleton instance (useful for testing only)."
	instance := nil
%

category: 'Grail-Singleton'
classmethod: NoneType
instance
	"Return the singleton ``None`` instance, allocating it on first access.
	The check uses Smalltalk ``nil`` to mean ''not yet allocated''; this is
	an internal bookkeeping use of nil, not the Python None value."

	instance == nil ifTrue: [
		instance := self @env0:basicNew.
	].
	^ instance
%

category: 'Grail-Convenience Methods - Attribute'
method: NoneType
___pyAttrStore___: aName put: aValue
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
%

category: 'Grail-Singleton'
classmethod: NoneType
new
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
%

category: 'Grail-Singleton'
classmethod: NoneType
__new__
	"The selector the generic instantiation path actually reaches for ``cls()'';
	see ``new'' beside it.  Without it that path allocates a FRESH instance,
	which is worse than an error -- a second None answers the same __repr__, so
	nothing but ``is'' can see the difference and every ``x is None'' test in the
	program silently stops matching it."

	^ self instance
%

category: 'Grail-Special Methods'
method: NoneType
__bool__
	^ false
%

category: 'Grail-Special Methods'
method: NoneType
__eq__: other
	"None equals only itself.  Anything else answers NotImplemented rather
	than false, so the operator layer can still try the REFLECTED __eq__ --
	CPython's ``None == ALWAYS_EQ'' is True (test_compare.test_issue_1393's
	sibling case).  ___cmpEq___ -> ___eqValue___ falls back to identity when
	the operand has no __eq__ of its own, so ``None == 1'' stays False."

	(other == self) ifTrue: [^ true].
	^ NotImplemented
%

category: 'Grail-Special Methods'
method: NoneType
__ne__: other
	"Mirror __eq__: punt to the reflected side instead of deciding by
	identity (see the comment there)."

	(other == self) ifTrue: [^ false].
	^ NotImplemented
%

category: 'Grail-Special Methods'
method: NoneType
__hash__
	"Python's hash(None) is implementation-defined and constant within a
	process. Any fixed value is acceptable; 0 is the simplest choice."
	^ 0
%

category: 'Grail-Special Methods'
method: NoneType
< other
	"Sort blocks send env-1 #< directly (not the dunder)."

	^ self __lt__: other
%

category: 'Grail-Python protocol'
method: NoneType
<= other
	^ self __le__: other
%

category: 'Grail-Python protocol'
method: NoneType
> other
	^ self __gt__: other
%

category: 'Grail-Python protocol'
method: NoneType
>= other
	^ self __ge__: other
%

category: 'Grail-Python protocol'
method: NoneType
__lt__: other
	"Ordering None raises catchable TypeError (CPython) -- an env-1
	MNU killed test_tuple's whole run."

	TypeError ___signal___: ('''<'' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NoneType
__le__: other
	TypeError ___signal___: ('''<='' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NoneType
__gt__: other
	TypeError ___signal___: ('''>'' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NoneType
__ge__: other
	TypeError ___signal___: ('''>='' not supported between instances of ''NoneType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NoneType
__iter__
	"Iterating None raises catchable TypeError (CPython).  Without a
	real method the send died as an UNCATCHABLE env-1 MNU -- Object's
	DNU deliberately does not intercept the probe selectors
	__iter__/__len__/__getitem__, but a real method on NoneType alone
	is safe (operator.countOf(None, None) in test_operator)."

	TypeError ___signal___: '''NoneType'' object is not iterable'
%

category: 'Grail-Python protocol'
method: NoneType
__len__
	"len(None) raises catchable TypeError (CPython)."

	TypeError ___signal___: 'object of type ''NoneType'' has no len()'
%

category: 'Grail-Python protocol'
method: NoneType
__getitem__: idx
	"None[i] raises catchable TypeError (CPython)."

	TypeError ___signal___: '''NoneType'' object is not subscriptable'
%

category: 'Grail-Python protocol'
method: NoneType
__contains__: item
	"``x in None`` raises catchable TypeError (CPython)."

	TypeError ___signal___: 'argument of type ''NoneType'' is not iterable'
%

category: 'Grail-String Representation'
method: NoneType
__repr__
	^ 'None'
%

category: 'Grail-Special Methods'
method: NoneType
__str__
	^ 'None'
%

set compile_env: 0

category: 'Grail-Printing'
method: NoneType
printOn: aStream
	"Smalltalk-side debugging output."
	aStream nextPutAll: 'None'
%

! ------- Bind the global ``None`` to the singleton. The forward reference
! in install.gs put nil in this slot; replacing it now makes ``None``
! resolve to the singleton in any class file compiled later.
run
(System myUserProfile symbolList objectNamed: #'Python')
	at: #'None' put: (NoneType ___instance___).
Transcript show: 'Bound Python ''None'' to the NoneType singleton'.
%
