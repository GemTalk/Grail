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

category: 'Grail-Singleton'
classmethod: NoneType
new
	"NoneType is a singleton; ``None`` is its only instance."
	TypeError ___signal___: 'cannot create ''NoneType'' instances'
%

category: 'Grail-Special Methods'
method: NoneType
__bool__
	^ false
%

category: 'Grail-Special Methods'
method: NoneType
__eq__: other
	^ other == self
%

category: 'Grail-Special Methods'
method: NoneType
__ne__: other
	^ other ~~ self
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
