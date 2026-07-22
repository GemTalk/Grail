! ------------------- Superclass check
run
Set ifNil: [self error: 'Set is not defined.'].
%

! ===============================================================================
! frozenset class (Python 'frozenset' type - immutable hashable set)
! ===============================================================================
! Implemented as a sibling of `set`, both subclasses of GemStone's Set. All
! class-side constructors send immediateInvariant before returning so the
! result is fully immutable (Set is only invariant after commit otherwise).
!
! Shared read-only and "returns a new collection" methods live on Set itself
! (see SetProtocol.gs); this file only adds frozenset-specific overrides
! (__hash__, __repr__) and freezing constructors.
! ===============================================================================

! ------- frozenset class definition
expectvalue /Class
doit
Set subclass: 'frozenset'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
frozenset comment:
'Python frozenset type - immutable, hashable, unordered collection of unique
elements. A sibling of `set` (both subclasses of GemStone Set); neither
inherits from the other, matching Python.

Class-side constructors freeze instances via immediateInvariant before
returning. Use `frozenset withAll: aCollection` to build from an iterable.
'
%

expectvalue /Class
doit
frozenset category: 'Grail-Collections-Unordered'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
frozenset removeAllMethods: 1.
frozenset class removeAllMethods: 1.
%

! ===============================================================================
! Class-side instance creation (env:0 Smalltalk)
! Each constructor freezes the result before returning.
! ===============================================================================

set compile_env: 0

category: 'Grail-instance creation'
classmethod: frozenset
new
	"Return an empty, frozen frozenset."

	^ self ___frozenInstance: super new
%

category: 'Grail-instance creation'
classmethod: frozenset
___frozenInstance: inst
	"Freeze EXACT frozensets (immutable, so element storage never changes);
	leave SUBCLASS instances mutable so they can carry instance attributes --
	a frozenset subclass has a __dict__ in CPython, and test_keywords_in_subclass's
	subclass_with_new sets ``self.newarg''.  Python exposes no element mutation
	on either (no add/remove), so subclass elements stay effectively immutable."

	self == frozenset ifTrue: [^ inst immediateInvariant].
	^ inst
%

category: 'Grail-instance creation'
classmethod: frozenset
withAll: aCollection
	"Build a frozenset containing every element of aCollection (no duplicates),
	then freeze it (exact frozensets only -- see ___frozenInstance:)."

	| inst |
	inst := super new.
	aCollection do: [:each | inst add: each].
	^ self ___frozenInstance: inst
%

! ===============================================================================
! Python-level methods (env:1)
! ===============================================================================

set compile_env: 1

category: 'Grail-Initialization'
method: frozenset
___init__: positional kw: keywords
	"Varargs frozenset.__init__(*args, **kw).  frozenset takes NO keyword
	arguments (test_new_or_init: frozenset().__init__(a=1)).  frozenset is
	immutable, so a positional iterable was already consumed by __new__ --
	there is nothing to populate here (a no-op apart from the kwarg check).
	A subclass WITH its own __init__ dispatches to that and never reaches here."

	(keywords @env0:notNil @env0:and: [keywords @env0:notEmpty]) ifTrue: [
		TypeError ___signal___: (self @env0:class @env0:name @env0:asString
			@env0:, '() takes no keyword arguments')].
	^ None
%

category: 'Grail-Hashing'
method: frozenset
__hash__
	"Return a hash value. frozenset is hashable because it's immutable."

	| hash |
	hash := 0.
	self @env0:do: [:each |
		hash := hash @env0:bitXor: each __hash__
	].
	^ hash
%

category: 'Grail-String Representation'
method: frozenset
__repr__
	"Return 'frozenset({a, b, c})' or 'frozenset()' for the empty set."

	| stream first size |
	size := self @env0:size.
	(size @env0:= 0) ifTrue: [^ 'frozenset()'].

	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: 'frozenset({'.

	first := true.
	self @env0:do: [:each |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: each __repr__.
		first := false
	].

	stream @env0:nextPutAll: '})'.
	^ stream @env0:contents
%

set compile_env: 0
