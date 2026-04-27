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
frozenset category: 'Collections-Unordered'
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

category: 'instance creation'
classmethod: frozenset
new
	"Return an empty, frozen frozenset."

	^ super new immediateInvariant
%

category: 'instance creation'
classmethod: frozenset
withAll: aCollection
	"Build a frozenset containing every element of aCollection (no duplicates),
	then freeze it."

	| inst |
	inst := super new.
	aCollection do: [:each | inst add: each].
	^ inst immediateInvariant
%

! ===============================================================================
! Python-level methods (env:1)
! ===============================================================================

set compile_env: 1

category: 'Python-Hashing'
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

category: 'Python-String Representation'
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
