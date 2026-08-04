! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- slice class (Python 'slice' type)
expectvalue /Class
doit
object subclass: 'slice'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
slice comment:
'Python ``slice`` type.

``slice(stop)``                  -> start=None, stop=stop, step=None
``slice(start, stop)``           -> step=None
``slice(start, stop, step)``     -> all explicit

Any of the three fields may be ``None`` (Python None), meaning
"default for direction".  Used by Python sequence subscript
expressions (`xs[a:b:c]` evaluates to a slice instance) and by
``isinstance(x, slice)`` checks in user code that overrides
``__getitem__`` to handle slices directly.

Instance variables:
  start - the start index (int or None)
  stop  - the stop index (int or None)
  step  - the step value (int or None, must be non-zero if int)
'
%

expectvalue /Class
doit
slice category: 'Numbers'
%

! ------------------- Remove existing Python methods from slice
expectvalue /Metaclass3
doit
slice removeAllMethods.
slice class removeAllMethods.
slice removeAllMethods: 1.
slice class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction
! ===============================================================================

category: 'Instance Creation'
classmethod: slice
___newStart: aStart stop: aStop step: aStep
	"env-0 entry point used by codegen for SliceAst when we eventually
	emit slice instances for receivers that override __getitem__.
	Phase B+1: stores start/stop/step into dynamic-instVar storage so
	``slice(1,10,2).start'' Python attribute reads find the values
	directly via the ___pyAttrLoad___ dynamic probe."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #start put: aStart.
	inst dynamicInstVarAt: #stop put: aStop.
	inst dynamicInstVarAt: #step put: aStep.
	^ inst
%

set compile_env: 1

category: 'Python-Initialization'
classmethod: slice
__new__
	"slice() with no arguments is a TypeError -- CPython requires at least the
	stop argument (slice expected at least 1 argument, got 0).  Without this
	0-arg entry the generic instantiation path built a slice with nil
	start/stop/step (test_slice test_constructor)."

	^ TypeError ___signal___: 'slice expected at least 1 argument, got 0'
%

category: 'Python-Initialization'
classmethod: slice
__new__: stop
	"slice(stop)  -> slice(None, stop, None)"

	^ slice @env0:___newStart: None stop: stop step: None
%

category: 'Python-Initialization'
classmethod: slice
__new__: start _: stop
	"slice(start, stop)  -> slice(start, stop, None)"

	^ slice @env0:___newStart: start stop: stop step: None
%

category: 'Python-Initialization'
classmethod: slice
__new__: start _: stop _: step
	"slice(start, stop, step)"

	^ slice @env0:___newStart: start stop: stop step: step
%

set compile_env: 1

! ===============================================================================
! Instance methods - accessors (env-1 so Python attribute syntax works)
! ===============================================================================

category: 'Python-Attribute Access'
method: slice
start
	^ self @env0:dynamicInstVarAt: #start
%

category: 'Python-Attribute Access'
method: slice
stop
	^ self @env0:dynamicInstVarAt: #stop
%

category: 'Python-Attribute Access'
method: slice
step
	^ self @env0:dynamicInstVarAt: #step
%

! ===============================================================================
! Instance methods - Python protocol
! ===============================================================================

category: 'Python-Conversion'
method: slice
__repr__
	"Mirror CPython's slice repr: slice(<start>, <stop>, <step>)."

	| sep |
	sep := ', '.
	^ ('slice(' @env0:,
		(self start __repr__) @env0:, sep @env0:,
		(self stop __repr__) @env0:, sep @env0:,
		(self step __repr__)) @env0:, ')'
%

category: 'Python-Conversion'
method: slice
__str__
	^ self __repr__
%

category: 'Python-Comparison'
method: slice
__eq__: other
	"Two slices are equal iff their (start, stop, step) tuples are
	equal under Python equality rules.

	The components must be compared with ___pyRichEqBool___ -- CPython's
	PyObject_RichCompareBool(x, y, Py_EQ), identity short-circuit included --
	not with ``=''.  This method compiles in env 1, so a bare ``self start =
	other start'' was an ENV-1 ``='' send to whatever the component is, and
	SmallInteger has no env-1 ``='': every slice comparison died with the
	UNCATCHABLE ``env-1 #'=' not understood by SmallInteger''.  It took out
	test_slice's test_cmp, test_deepcopy and test_setslice_without_getslice
	outright, and it is why slice equality could not be relied on at all.

	Using the rich comparison also makes non-int components (slice('a','b','c'))
	and custom __eq__ behave as Python requires, which a Smalltalk ``='' would
	not have done even in env 0."

	(other isKindOf: slice) ifFalse: [^ false].
	^ ((self start ___pyRichEqBool___: other start)
		and: [self stop ___pyRichEqBool___: other stop])
		and: [self step ___pyRichEqBool___: other step]
%

category: 'Python-Comparison'
method: slice
__hash__
	"CPython made slices hashable in 3.12 (gh-101264); before that slice set
	__hash__ = None.  Grail defined __eq__ without __hash__, so slices kept
	object's IDENTITY hash -- two equal slices hashed differently, and
	test_slice's test_hash saw exactly that:

	    self.assertEqual(hash(slice(5)), slice(5).__hash__())

	compares two SEPARATE slice objects, so it read as ``8915172 != 8915169'',
	a pair of consecutive identity hashes.

	Combines the three components' own Python hashes.  Sending __hash__ to each
	component is what propagates CPython's TypeError for an unhashable member
	(``hash(slice(1, 2, []))'' -- list.__hash__ raises), rather than needing a
	separate check; None and ints hash fine, so the common slices are cheap.

	The VALUE is not CPython's.  CPython mixes with the xxHash-derived constants
	it uses for tuples, and its slice hash is not even the hash of the
	equivalent tuple.  Nothing depends on the exact number: unlike complex,
	which must satisfy hash(complex(5)) == hash(5), a slice only ever compares
	equal to another slice, so there is no cross-type hash agreement to
	preserve -- only self-consistency with __eq__, which this has."

	| h |
	h := self start __hash__.
	h := (h @env0:* 1000003) @env0:bitXor: (self stop __hash__).
	h := (h @env0:* 1000003) @env0:bitXor: (self step __hash__).
	^ h @env0:bitAnd: 16r3FFFFFFF
%

category: 'Python-Methods'
method: slice
indices: length
	"slice.indices(length) -> (start, stop, step).
	Normalizes self against a sequence of the given length, returning a
	3-tuple that can drive a plain `for i in range(...)` loop.  Matches
	CPython's PySlice_GetIndicesEx semantics including negative-index
	wrap and bounds clamping."

	| st lo hi rawStart rawStop len |
	"start / stop / step may be any __index__ object (gh-91153 uses one whose
	__index__ mutates the sequence).  Coerce them here so the comparisons
	below see integers instead of dying on an uncatchable env-0 ``#< not
	understood'' DNU."
	"A subscript-created slice carries Smalltalk nil (not Python None) for an
	omitted bound (range>>__getitem__: now routes such slices here); treat nil
	as None so ``r[2:8]'' -- step omitted -- normalizes instead of trying to
	coerce nil to an integer."
	st := (self step @env0:isNil or: [self step @env0:= None]) ifTrue: [1] ifFalse: [bytes ___coerceIndex___: self step].
	(st @env0:= 0) ifTrue: [
		ValueError ___signal___: 'slice step cannot be zero'
	].
	"length is coerced through __index__ too (a float length is a TypeError, a
	custom __index__ object is honored) and must be non-negative -- CPython's
	PySlice_GetIndicesEx raises ValueError for a negative length (test_slice
	test_indices)."
	len := bytes ___coerceIndex___: length.
	(len @env0:< 0) ifTrue: [
		ValueError ___signal___: 'length should not be negative'
	].
	rawStart := (self start @env0:isNil or: [self start @env0:= None]) ifTrue: [None] ifFalse: [bytes ___coerceIndex___: self start].
	rawStop := (self stop @env0:isNil or: [self stop @env0:= None]) ifTrue: [None] ifFalse: [bytes ___coerceIndex___: self stop].
	lo := rawStart @env0:= None
		ifTrue: [st @env0:> 0 ifTrue: [0] ifFalse: [len @env0:- 1]]
		ifFalse: [rawStart @env0:< 0
			ifTrue: [(len @env0:+ rawStart) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [rawStart @env0:min:
				(st @env0:> 0 ifTrue: [len] ifFalse: [len @env0:- 1])]].
	hi := rawStop @env0:= None
		ifTrue: [st @env0:> 0 ifTrue: [len] ifFalse: [-1]]
		ifFalse: [rawStop @env0:< 0
			ifTrue: [(len @env0:+ rawStop) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [rawStop @env0:min:
				(st @env0:> 0 ifTrue: [len] ifFalse: [len @env0:- 1])]].
	^ tuple @env0:with: lo with: hi with: st
%

set compile_env: 0
