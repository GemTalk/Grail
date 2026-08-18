! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- NotImplementedType class (Python 'NotImplementedType' type)
!
! Singleton class whose sole instance is bound to `NotImplemented` in the Python
! dictionary.  A binary dunder that declines to handle its operand answers this,
! and the operator layer reflects to the other side.
!
! Grail modelled it as the SYMBOL #'___NotImplemented___'.  The identity test
! worked, and nothing else did:
!
!     type(NotImplemented)          Symbol   CPython: <class 'NotImplementedType'>
!     repr(NotImplemented)  "'___NotImplemented___'"   CPython: 'NotImplemented'
!     isinstance(NotImplemented, str)  True  CPython: False
!     bool(NotImplemented)          True     CPython: TypeError
!
! The last one is the dangerous line, and it had already drawn blood twice before
! this class existed.  A Symbol is TRUTHY, so a sentinel that reached a Boolean
! context took the wrong branch silently -- or, where a GemStone primitive wanted
! a real Boolean, died with an uncatchable ``Expected #'___NotImplemented___' to
! be a Boolean'' (see builtins.gs and list.gs, both of which carry a workaround
! for exactly that).  CPython raises TypeError precisely so the mistake cannot be
! silent, and this class does the same.

expectvalue /Class
doit
object subclass: 'NotImplementedType'
  instVarNames: #()
  classVars: #()
  classInstVars: #( instance )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
NotImplementedType comment:
'Python ''NotImplementedType'' — the type of the singleton ``NotImplemented``.

There is exactly one instance, reached via ``NotImplementedType instance'' (the
class-side singleton accessor) or as the global ``NotImplemented'' in the Python
dictionary.

Returned by a binary dunder that declines its operand, so the operator layer can
reflect to the other side and then raise TypeError.  It is NOT a Boolean and must
never be treated as one: ``__bool__'' raises, as in CPython.'
%

expectvalue /Class
doit
NotImplementedType category: 'Grail-Singleton'
%

! ------------------- Remove existing methods from NotImplementedType
expectvalue /Metaclass3
doit
NotImplementedType removeAllMethods: 1.
NotImplementedType class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Singleton'
classmethod: NotImplementedType
___instance___
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance
%

category: 'Grail-Python protocol'
method: NotImplementedType
< other
	"Smalltalk sort blocks send env-0 #< directly; route to the catchable
	TypeError instead of an uncatchable MNU.  Same reason NoneType carries these."
	^ self @env1:__lt__: other
%

category: 'Grail-Python protocol'
method: NotImplementedType
<= other
	^ self @env1:__le__: other
%

category: 'Grail-Python protocol'
method: NotImplementedType
> other
	^ self @env1:__gt__: other
%

category: 'Grail-Python protocol'
method: NotImplementedType
>= other
	^ self @env1:__ge__: other
%

category: 'Grail-Printing'
method: NotImplementedType
printOn: aStream
	"Smalltalk-side debugging output."
	aStream nextPutAll: 'NotImplemented'
%

set compile_env: 1

category: 'Grail-Singleton'
classmethod: NotImplementedType
instance
	"The singleton ``NotImplemented'', allocated on first access.  The nil test is
	internal bookkeeping for ''not yet allocated'', not the Python None value."

	instance == nil ifTrue: [
		instance := self @env0:basicNew].
	^ instance
%

category: 'Grail-Singleton'
classmethod: NotImplementedType
clearInstance
	"Clear the singleton instance (testing only)."
	instance := nil
%

category: 'Grail-Singleton'
classmethod: NotImplementedType
new
	"``type(NotImplemented)()'' answers the singleton in CPython rather than
	raising or making a second one.  A second instance of a singleton type is
	worse than an error: every ``is NotImplemented'' test in the operator layer
	would silently stop matching it."

	^ self instance
%

category: 'Grail-Singleton'
classmethod: NotImplementedType
__new__
	"The selector the generic instantiation path reaches for ``cls()''; see
	``new'' beside it."

	^ self instance
%

category: 'Grail-Special Methods'
method: NotImplementedType
__bool__
	"CPython raises here, and the raise is the POINT.  ``NotImplemented'' means
	``I decline to answer'', so using it as a truth value is always a bug in the
	caller -- most often ``if a.__eq__(b):'', which reads as an equality test and
	is not one.  CPython made this a TypeError in 3.12 after two releases of
	DeprecationWarning.

	Grail's old Symbol sentinel was truthy, so the same mistake took the wrong
	branch in silence."

	^ TypeError ___signal___:
		'NotImplemented should not be used in a boolean context'
%

category: 'Grail-Special Methods'
method: NotImplementedType
___isTruthy___
	"The internal truth test, which must raise for the same reason __bool__ does.
	Routed through __bool__ rather than answering a Boolean, so there is one
	place that decides -- the env-0 ``ifTrue:'' sites that used to receive a
	truthy Symbol now get a catchable Python exception instead."

	^ self __bool__
%

category: 'Grail-Special Methods'
method: NotImplementedType
__eq__: other
	"Identity only, and no punting: answering NotImplemented from
	NotImplemented's own __eq__ would ask the operator layer to reflect onto a
	value that is itself the decline marker.  CPython compares it by identity
	through object.__eq__ and answers False for anything else."

	^ other == self
%

category: 'Grail-Special Methods'
method: NotImplementedType
__ne__: other
	^ (other == self) not
%

category: 'Grail-Special Methods'
method: NotImplementedType
__hash__
	"Implementation-defined and constant within a process; any fixed value serves.
	Distinct from None's 0 and ellipsis's 269 so a dict keyed by all three does
	not collide on every lookup."
	^ 271
%

category: 'Grail-Special Methods'
method: NotImplementedType
__reduce__
	"CPython answers the STRING 'NotImplemented' -- the name pickle resolves out
	of builtins, which is how a pickled singleton comes back as the same object.
	copy.copy / copy.deepcopy go through the same protocol."
	^ 'NotImplemented'
%

category: 'Grail-String Representation'
method: NotImplementedType
__repr__
	^ 'NotImplemented'
%

category: 'Grail-String Representation'
method: NotImplementedType
__str__
	"CPython has no NotImplementedType __str__, so str() falls through to
	__repr__.  Spelled out rather than relying on object >> __str__ routing back."
	^ 'NotImplemented'
%

category: 'Grail-Python protocol'
method: NotImplementedType
__lt__: other
	TypeError ___signal___: ('''<'' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NotImplementedType
__le__: other
	TypeError ___signal___: ('''<='' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NotImplementedType
__gt__: other
	TypeError ___signal___: ('''>'' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

category: 'Grail-Python protocol'
method: NotImplementedType
__ge__: other
	TypeError ___signal___: ('''>='' not supported between instances of ''NotImplementedType'' and '''
		@env0:, (other @env0:class @env1:__name__) @env0:asString @env0:, '''')
%

! The binding below is a doit, not a method: run it in env 0.
set compile_env: 0

! ------- Bind the global ``NotImplemented'' to the singleton.  This file is filed
! BEFORE NoneType.gs -- earlier than any other Python class file -- because
! NoneType's own ``__eq__'' answers NotImplemented, as do the binary dunders in
! twenty-odd files after it.  The forward reference in install.gs put nil in this
! slot; replacing it now makes the bare identifier resolve everywhere below.
run
(System myUserProfile symbolList objectNamed: #'Python')
	at: #'NotImplemented' put: (NotImplementedType ___instance___).
Transcript show: 'Bound Python ''NotImplemented'' to the NotImplementedType singleton'.
%
