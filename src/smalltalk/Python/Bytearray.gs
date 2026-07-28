! ------------------- Superclass check
run
bytes ifNil: [self error: 'bytes is not defined. Check file ordering.'].
%

! ===============================================================================
! Python Class Definitions - Other New Python Classes (as the install user)
! ===============================================================================
! Define new classes specific to Python that don't exist in GemStone.
! These are created as the install user.
! ===============================================================================

! ------- bytearray class (Python 'bytearray' type - mutable bytes)
expectvalue /Class
doit
bytes subclass: 'bytearray'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
bytearray comment:
'Python bytearray type - mutable sequence of bytes.

This is the mutable variant of bytes. It inherits all methods from ByteArray
(which implements Python''s bytes type) but allows mutation through __setitem__
and provides additional mutation methods like append, extend, insert, etc.

Unlike bytes (ByteArray), bytearray instances can be modified in place.
'
%

expectvalue /Class
doit
bytearray category: 'Grail-Collections-Ordered'
%

! ===============================================================================
! bytearray Methods (Python 'bytearray' type - mutable bytes)
! ===============================================================================
! This file contains Python method implementations for the bytearray class.
! bytearray is a mutable sequence of bytes (integers 0-255).
!
! bytearray inherits from bytes, which implements Python's bytes type.
! Most methods are inherited from bytes. This file only contains:
!   1. Overrides for methods that differ (e.g., __class__, __setitem__)
!   2. Additional mutation methods (append, extend, insert, remove, pop, etc.)
!   3. Constructors that return bytearray instances
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytearray
expectvalue /Metaclass3
doit
bytearray removeAllMethods: 1.
bytearray class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Hashing'
method: bytearray
__hash__
	"bytearray is mutable and therefore unhashable (matches CPython).
	bytes (the superclass) stays hashable."

	TypeError ___signal___: 'unhashable type: ''bytearray'''
%

category: 'Grail-Constructors'
classmethod: bytearray
__new__
	"bytearray() — create empty bytearray. Receiver is the class."

	^ self ___new___
%

! bytearray(source) intentionally has NO 1-arg __new__: override -- it inherits
! the self-typed bytes>>__new__: source (which builds via ``self ___new___:'', so
! the receiver class bytearray is instantiated here).  That shared constructor
! handles ints, bytes-likes, sequences, general iterables, __index__ elements /
! __index__ count-source, and their CPython error kinds; duplicating it here let
! bytearray drift (old empty fall-through + no __index__ coercion).

! bytearray(str, encoding) intentionally has NO 2-arg __new__:_: override
! either -- it inherits the self-typed bytes>>__new__: source _: encoding,
! which shares the single codec authority (___encodeSourceToSelf___ ->
! str>>encode:_:) AND also recognizes CPython's explicit-cls spelling
! ``bytearray.__new__(cls, x)''.  The old duplicate here shadowed that, so a
! subclass __new__ forwarding to bytearray.__new__(cls, value) mistook the
! class for the string and raised ``encoding without a string argument''.

! bytearray.fromhex intentionally has NO override -- it inherits the self-typed
! bytes>>fromhex: (which builds via `self ___new___:', so bytearray is built
! here).  The old duplicate only stripped spaces and mis-parsed ASCII
! whitespace, bytes-like arguments, and invalid digits.

category: 'Grail-Introspection'
classmethod: bytearray
__doc__
	"``bytearray.__doc__'' -- CPython's constructor docstring (bytes supplies
	its own; without either, the class-side lookup fell through to
	object>>__doc__)."

	^ 'bytearray(iterable_of_ints) -> bytearray
bytearray(string, encoding[, errors]) -> bytearray
bytearray(bytes_or_buffer) -> mutable copy of bytes_or_buffer
bytearray(int) -> bytes array of size given by the parameter initialized with null bytes
bytearray() -> empty bytes array

Construct a mutable bytearray object from:
  - an iterable yielding integers in range(256)
  - a text string encoded using the specified encoding
  - a bytes or a buffer object
  - any object implementing the buffer API.
  - an integer
'
%

category: 'Grail-Type'
method: bytearray
__class__
	"Return the Python type -- the receiver's ACTUAL class, so a
	``class MyBA(bytearray)'' instance reports MyBA while a plain
	bytearray still reports bytearray."
	^ self @env0:class
%

category: 'Grail-String Representation'
method: bytearray
__repr__
	"bytearray repr wraps the shared b'...' body: bytearray(b'...').  Inherited
	bytes>>__repr__ would drop the wrapper (so bytearray(b'') printed as b'').
	The wrapper carries the RECEIVER's class name, so a subclass reprs as
	MySubclass(b'...') like CPython's bytearray_repr; that routine also always
	backslash-escapes an apostrophe, hence the ___reprBody___: true."

	| name |
	name := [(self @env1:__class__ @env1:__name__) @env0:asString]
		@env0:on: Error do: [:ex | ex @env0:return: self @env0:class @env0:name @env0:asString].
	^ name @env0:, '(' @env0:, (self ___reprBody___: true) @env0:, ')'
%

category: 'Grail-Sequence Protocol'
method: bytearray
__delitem__: index
	"Delete the byte at an index, or the bytes selected by a slice."

	| idx size |
	size := self @env0:size.

	"Slice deletion: del bytearray[i:j[:k]]."
	(index isKindOf: slice) ifTrue: [
		^ self ___delSliceItem: index size: size
	].

	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Remove (convert to 1-based)"
	self @env0:removeAtIndex: (idx @env0:+ 1)
%

category: 'Grail-Concatenation'
method: bytearray
__iadd__: other
	"In-place concatenation"

	"Can only concatenate in place with a bytes-like object (bytes / bytearray /
	subclasses).  Message uses the Python type NAMES (``can't concat str to
	bytearray''); appending the class OBJECT used to raise an uncatchable MNU."
	(other isKindOf: bytes) ifFalse: [
		TypeError ___signal___: ('can''t concat '
			@env0:, (other @env1:__class__ @env1:__name__)
			@env0:, ' to '
			@env0:, (self @env1:__class__ @env1:__name__))
	].

	self extend: other.
	^ self
%

category: 'Grail-Concatenation'
method: bytearray
__imul__: count
	"In-place repetition"

	| n originalSize original |
	n := count.

	"Validate count is an integer (an __index__ object counts; a float does not)."
	(n isKindOf: Integer) ifFalse: [
		(n ___respondsTo___: #'__index__')
			ifTrue: [n := bytes ___coerceIndex___: n]
			ifFalse: [TypeError ___signal___: 'can''t multiply sequence by non-int']
	].

	"If count <= 1, nothing to do (or clear if <= 0)"
	(n @env0:<= 0) ifTrue: [
		self @env0:size: 0.
		^ self
	].

	(n == 1) ifTrue: [
		^ self
	].

	"A repeat that cannot be allocated is CPython's OverflowError, NOT an
	extend loop that exhausts the gem's temporary object memory."
	(self @env0:size @env0:* n) @env0:> 1073741823 ifTrue: [
		OverflowError ___signal___: 'repeated bytes are too long'
	].

	"Save original content"
	originalSize := self @env0:size.
	original := bytearray ___new___: originalSize.
	1 @env0:to: originalSize do: [:i |
		original @env0:at: i put: (self @env0:at: i)
	].

	"Repeat n-1 times"
	2 @env0:to: n do: [:rep |
		self extend: original
	].

	^ self
%

category: 'Grail-Sequence Protocol'
method: bytearray
__iter__
	"A bytearray is MUTABLE, so its iterator must latch exhaustion the way
	CPython's bytearray_iterator does -- once spent it stays spent even if the
	bytearray later grows.  list_iterator carries that flag (and round-trips
	it through pickle); the inherited tuple_iterator, built for immutable
	sequences, carries only a position and so revived itself after a resize."

	^ list_iterator ___on: self
%

category: 'Grail-Sequence Protocol'
method: bytearray
__setitem__: index _: value
	"Set the byte at an index, or assign to a slice (mutable)."
	| idx size val |

	"Slice assignment: bytearray[i:j[:k]] = bytes-like."
	(index isKindOf: slice) ifTrue: [
		^ self ___setSliceItem: index value: value size: self @env0:size
	].

	"A non-integer, non-slice subscript is CPython's ``bytearray indices must
	be integers or slices'' TypeError -- report that rather than the generic
	__index__ coercion message."
	((index isKindOf: Integer)
		or: [(index @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		TypeError ___signal___: ('bytearray indices must be integers or slices, not '
			@env0:, (bytes ___pyTypeNameOf___: index))].

	"Coerce the index via __index__ FIRST -- that may run Python code which
	reallocates/clears the receiver (gh-91153), so read size AFTERWARD and
	bounds-check against the current buffer."
	idx := bytes ___coerceIndex___: index.
	size := self @env0:size.
	(idx @env0:< 0) ifTrue: [idx := size @env0:+ idx].
	((idx @env0:< 0) or: [idx @env0:>= size]) ifTrue: [
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Coerce + range-check the value via __index__ (CPython order: after the
	index bounds check)."
	val := bytes ___coerceByteValue___: value.

	"Re-check bounds: coercing the value may have run __index__ that shrank
	self (gh-91153).  idx is already non-negative here, so only the upper
	bound can have been invalidated."
	(idx @env0:>= self @env0:size) ifTrue: [
		IndexError ___signal___: 'bytearray index out of range'
	].

	"Set value (convert to 1-based index)."
	self @env0:at: (idx @env0:+ 1) put: val.
	^ None
%

category: 'Grail-Sequence Protocol'
method: bytearray
___setSliceItem: aSlice value: value size: size
	"bytearray[i:j[:k]] = value.  For step 1 the length may change; the
	receiver is resized IN PLACE (identity preserved) via ``size:''.  For
	an extended slice (step != 1) the value length must equal the number
	of selected indices (CPython semantics)."

	| idxTuple lo hi st vals newVals indices i |
	idxTuple := aSlice indices: size.
	lo := idxTuple @env0:at: 1.
	hi := idxTuple @env0:at: 2.
	st := idxTuple @env0:at: 3.
	vals := self ___bytesFrom: value.

	(st @env0:= 1) ifTrue: [
		"A backward slice (stop < start) selects nothing: clamp the tail's
		start so the kept suffix does not overlap the kept prefix (CPython
		uses max(start, stop) as the effective stop for a step-1 slice)."
		hi := hi @env0:max: lo.
		newVals := OrderedCollection @env0:new.
		1 @env0:to: lo do: [:j | newVals @env0:add: (self @env0:at: j)].
		newVals @env0:addAll: vals.
		(hi @env0:+ 1) @env0:to: size do: [:j | newVals @env0:add: (self @env0:at: j)].
		self @env0:size: newVals @env0:size.
		1 @env0:to: newVals @env0:size do: [:j | self @env0:at: j put: (newVals @env0:at: j)].
		^ None
	].

	"Extended slice: collect the selected 0-based indices."
	indices := OrderedCollection @env0:new.
	i := lo.
	st @env0:> 0
		ifTrue: [[i @env0:< hi] @env0:whileTrue: [indices @env0:add: i. i := i @env0:+ st]]
		ifFalse: [[i @env0:> hi] @env0:whileTrue: [indices @env0:add: i. i := i @env0:+ st]].
	(vals @env0:size @env0:= indices @env0:size) ifFalse: [
		ValueError ___signal___: ('attempt to assign bytes of size '
			@env0:, vals @env0:size @env0:printString
			@env0:, ' to extended slice of size '
			@env0:, indices @env0:size @env0:printString)
	].
	1 @env0:to: indices @env0:size do: [:k |
		self @env0:at: ((indices @env0:at: k) @env0:+ 1) put: (vals @env0:at: k)].
	^ None
%

category: 'Grail-Sequence Protocol'
method: bytearray
___delSliceItem: aSlice size: size
	"del bytearray[i:j[:k]].  Step 1 removes the contiguous [lo, hi) run; an
	extended slice removes exactly the selected indices.  Either way the
	receiver is resized IN PLACE (identity preserved) via ``size:''."

	| idxTuple lo hi st toRemove newVals i |
	idxTuple := aSlice indices: size.
	lo := idxTuple @env0:at: 1.
	hi := idxTuple @env0:at: 2.
	st := idxTuple @env0:at: 3.

	(st @env0:= 1) ifTrue: [
		"Backward slice (stop < start) deletes nothing: clamp so the kept
		suffix does not overlap the kept prefix."
		hi := hi @env0:max: lo.
		newVals := OrderedCollection @env0:new.
		1 @env0:to: lo do: [:j | newVals @env0:add: (self @env0:at: j)].
		(hi @env0:+ 1) @env0:to: size do: [:j | newVals @env0:add: (self @env0:at: j)].
		self @env0:size: newVals @env0:size.
		1 @env0:to: newVals @env0:size do: [:j | self @env0:at: j put: (newVals @env0:at: j)].
		^ None
	].

	"Extended slice: mark the selected 0-based indices, keep the rest."
	toRemove := Set @env0:new.
	i := lo.
	st @env0:> 0
		ifTrue: [[i @env0:< hi] @env0:whileTrue: [toRemove @env0:add: i. i := i @env0:+ st]]
		ifFalse: [[i @env0:> hi] @env0:whileTrue: [toRemove @env0:add: i. i := i @env0:+ st]].
	newVals := OrderedCollection @env0:new.
	1 @env0:to: size do: [:j |
		(toRemove @env0:includes: (j @env0:- 1)) ifFalse: [
			newVals @env0:add: (self @env0:at: j)]].
	self @env0:size: newVals @env0:size.
	1 @env0:to: newVals @env0:size do: [:j | self @env0:at: j put: (newVals @env0:at: j)].
	^ None
%

category: 'Grail-Sequence Protocol'
method: bytearray
___bytesFrom: value
	"Materialize the right-hand side of a bytearray slice assignment into an
	OrderedCollection of validated byte ints (0..255).  Accepted: any
	bytes-like object (bytes / bytearray / subclasses) and any iterable of
	ints (list / tuple / Array / range / generator).  A str is iterable but
	explicitly rejected, as in CPython, and so is any non-iterable (an int,
	a float).  Elements go through __index__ so a non-int element is a
	TypeError and an out-of-range one a ValueError."

	| cls src out |
	cls := value @env0:class.
	(value isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___:
			'can assign only a bytes-like object to a bytearray slice'].
	src := ((value isKindOf: bytes)
			or: [(cls == list) or: [(cls == tuple)
				or: [(cls == Array) or: [cls == Interval]]]])
		ifTrue: [value]
		ifFalse: [
			((value ___respondsTo___: #'__iter__')
				or: [value ___respondsTo___: #'__getitem__'])
				ifTrue: [list __new__: value]
				ifFalse: [TypeError ___signal___:
					'can assign only a bytes-like object to a bytearray slice']].
	out := OrderedCollection @env0:new.
	1 @env0:to: src @env0:size do: [:i |
		out @env0:add: (bytes ___coerceByteValue___: (src @env0:at: i))].
	^ out
%

category: 'Grail-Mutation Methods'
method: bytearray
append: item
	"bytearray.append(int) -- append one byte, returning None.  The argument
	goes through __index__ (so Indexable(65) appends 'A') and is range-checked,
	so a str/bytes argument is a TypeError and 256 is a ValueError."

	self @env0:add: (bytes ___coerceByteValue___: item).
	^ None
%

category: 'Grail-Mutation Methods'
method: bytearray
clear
	"Remove all bytes (CPython returns None)."

	self @env0:size: 0.
	^ None
%

category: 'Grail-Mutation Methods'
method: bytearray
resize: size
	"bytearray.resize(n) -- grow or shrink in place, zero-filling new bytes.
	Returns None.  A negative size is a ValueError; a size beyond what the
	object model can hold is a MemoryError (CPython raises the same for
	sys.maxsize)."

	| n old |
	n := bytes ___coerceIndex___: size.
	n @env0:< 0 ifTrue: [
		ValueError ___signal___: 'negative resize value'].
	"64-bit CPython accepts up to PY_SSIZE_T_MAX but cannot allocate it; a
	GemStone byte object is bounded well below that, so anything at that
	scale is the MemoryError CPython raises."
	n @env0:> 1073741823 ifTrue: [
		MemoryError ___signal___: 'cannot allocate bytearray'].
	old := self @env0:size.
	self @env0:size: n.
	"``size:'' leaves grown bytes zeroed on GemStone, but do not rely on it."
	old @env0:+ 1 @env0:to: n do: [:i | self @env0:at: i put: 0].
	^ None
%

category: 'Grail-Mutation Methods'
method: bytearray
copy
	"Return a shallow copy"

	| result size |
	size := self @env0:size.
	result := bytearray ___new___: size.
	1 @env0:to: size do: [:i |
		result @env0:at: i put: (self @env0:at: i)
	].
	^ result
%

category: 'Grail-Mutation Methods'
method: bytearray
extend: iterable
	"Extend the bytearray with the bytes from any iterable of ints (CPython
	bytearray.extend).  Elements are coerced via __index__ and validated FIRST,
	so a bad element leaves the receiver unchanged."

	| vals coerced |

	"bytes / bytearray: copy by captured size (safe when extending with self)."
	(iterable isKindOf: bytes) ifTrue: [
		| size |
		size := iterable @env0:size.
		1 @env0:to: size do: [:i | self append: (iterable @env0:at: i)].
		^ None
	].

	"A str is iterable but not of integers -- CPython rejects it by name."
	(iterable isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'expected iterable of integers; got: ''str'''
	].

	"A non-iterable can't extend at all.  Numbers are checked by kind rather
	than by protocol: a Float answers ___respondsTo___: #'__getitem__' through
	the generic object fallbacks, so the protocol probe alone let ``extend(1.0)''
	reach list() and report list's ``'float' object is not iterable'' instead
	of CPython's extend-specific message."
	((iterable isKindOf: Number)
		or: [((iterable ___respondsTo___: #'__iter__')
			or: [iterable ___respondsTo___: #'__getitem__']) @env0:not]) ifTrue: [
		TypeError ___signal___: ('can''t extend bytearray with '
			@env0:, (bytes ___pyTypeNameOf___: iterable))
	].

	"Any other iterable (list/tuple/range/generator/iterator/__getitem__):
	materialize, coerce+validate EVERY element (__index__, 0..255) before
	touching the receiver, then append -- so a ValueError/TypeError midway
	leaves the bytearray unchanged."
	vals := list __new__: iterable.
	coerced := OrderedCollection @env0:new.
	1 @env0:to: vals @env0:size do: [:i |
		coerced @env0:add: (bytes ___coerceByteValue___: (vals @env0:at: i))].
	coerced @env0:do: [:b | self append: b].
	^ None
%

category: 'Grail-Mutation Methods'
method: bytearray
insert: index _: item
	"bytearray.insert(i, byte) -- insert before index i, returning None.
	A negative index counts from the end (floored at 0) and an index past
	the end appends, matching CPython's list-style clamping."

	| idx size val |
	size := self @env0:size.
	idx := bytes ___coerceIndex___: index.
	val := bytes ___coerceByteValue___: item.

	"Negative counts from the end; then clamp into [0, size]."
	(idx @env0:< 0) ifTrue: [idx := size @env0:+ idx].
	(idx @env0:< 0) ifTrue: [idx := 0].
	(idx @env0:> size) ifTrue: [idx := size].

	"Insert at position (convert to 1-based)"
	self @env0:insertAll: (ByteArray @env0:with: val) at: (idx @env0:+ 1).
	^ None
%

category: 'Grail-Mutation Methods'
method: bytearray
pop
	"Remove and return last byte"

	| size |
	size := self @env0:size.

	(size == 0) ifTrue: [
		IndexError ___signal___: 'pop from empty bytearray'
	].

	^ self @env0:removeLast
%

category: 'Grail-Mutation Methods'
method: bytearray
pop: index
	"Remove and return byte at index"

	| idx size byte |
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'pop index out of range'
	].

	"Get byte and remove (convert to 1-based)"
	byte := self @env0:at: (idx @env0:+ 1).
	self @env0:removeAtIndex: (idx @env0:+ 1).
	^ byte
%

category: 'Grail-Mutation Methods'
method: bytearray
remove: value
	"bytearray.remove(byte) -- delete the first occurrence, returning None.
	The argument is coerced through __index__ and range-checked first, so
	remove('e') / remove(b'e') is a TypeError and remove(400) a ValueError,
	as in CPython."

	| val size |
	val := bytes ___coerceByteValue___: value.
	size := self @env0:size.

	1 @env0:to: size do: [:i |
		((self @env0:at: i) @env0:= val) ifTrue: [
			self @env0:removeAtIndex: i.
			^ None
		]
	].

	ValueError ___signal___: 'value not found in bytearray'
%

category: 'Grail-Mutation Methods'
method: bytearray
reverse
	"Reverse bytearray in place (CPython returns None)."

	| size |
	size := self @env0:size.

	1 @env0:to: (size @env0:// 2) do: [:i |
		| temp j |
		j := size @env0:- (i @env0:- 1).
		temp := self @env0:at: i.
		self @env0:at: i put: (self @env0:at: j).
		self @env0:at: j put: temp
	].
	^ None
%

category: 'Grail-Mutation Methods'
method: bytearray
__alloc__
	"bytearray.__alloc__() -- CPython reports the allocated buffer size,
	which is always strictly greater than len() (it reserves the trailing
	NUL).  GemStone byte objects carry no separate capacity, so report the
	only value that is both honest and satisfies the documented invariant."

	^ self @env0:size @env0:+ 1
%

category: 'Grail-Constructors'
method: bytearray
__init__
	"bytearray() re-initialization: empty the receiver."

	self @env0:size: 0.
	^ None
%

category: 'Grail-Constructors'
method: bytearray
__init__: source
	"bytearray.__init__(source) re-initializes an EXISTING bytearray in
	place (CPython's bytearray_init).  test_bytes' test_init_alloc calls
	``b.__init__(generator)'' on a live object and watches it fill
	incrementally, so build straight onto the receiver rather than
	returning a fresh object."

	self @env0:size: 0.
	(source isKindOf: Integer) ifTrue: [
		source @env0:< 0 ifTrue: [ValueError ___signal___: 'negative count'].
		self @env0:size: source.
		1 @env0:to: source do: [:i | self @env0:at: i put: 0].
		^ None].
	(source isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'string argument without an encoding'].
	^ self extend: source
%

category: 'Grail-Constructors'
method: bytearray
___init__: positional kw: kwargs
	"bytearray.__init__(self, *args, **kwargs) -- the varargs form, reached
	when a subclass forwards its own constructor arguments
	(``bytearray.__init__(me, source=b'abcd')'', test_init_override)."

	| args source encoding errors n |
	args := positional ifNil: [#()].
	n := args @env0:size.
	source := n @env0:>= 1 ifTrue: [args @env0:at: 1] ifFalse: [nil].
	encoding := n @env0:>= 2 ifTrue: [args @env0:at: 2] ifFalse: [nil].
	errors := n @env0:>= 3 ifTrue: [args @env0:at: 3] ifFalse: [nil].
	kwargs ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'source' ifTrue: [source := v]
			ifFalse: [key @env0:= 'encoding' ifTrue: [encoding := v]
			ifFalse: [key @env0:= 'errors' ifTrue: [errors := v]
			ifFalse: [TypeError ___signal___:
				('bytearray() got an unexpected keyword argument ''' @env0:, key @env0:, '''')]]]]].
	source ifNil: [^ self __init__].
	encoding ifNil: [^ self __init__: source].
	errors ifNil: [^ self __init__: source _: encoding].
	^ self __init__: source _: encoding _: errors
%

category: 'Grail-Constructors'
method: bytearray
__init__: source _: encoding
	"bytearray(str, encoding) re-initialization."

	| encoded |
	encoded := bytes __new__: source _: encoding.
	self @env0:size: 0.
	^ self extend: encoded
%

category: 'Grail-Constructors'
method: bytearray
__init__: source _: encoding _: errors
	"bytearray(str, encoding, errors) re-initialization."

	| encoded |
	encoded := bytes __new__: source _: encoding _: errors.
	self @env0:size: 0.
	^ self extend: encoded
%

! ===============================================================================
! find — Python bytearray.find(sub[, start[, end]])
! Returns the lowest index where ``sub`` is found in self[start:end],
! or -1 if not found.  ``sub`` may be a single int byte (the
! re._compiler usage) or a bytes/bytearray-like sub-sequence.
! ===============================================================================

category: 'Grail-Search Methods'
method: bytearray
find: sub
	"find(sub) → first index where sub occurs, or -1."

	^ self find: sub _: 0 _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytearray
find: sub _: start
	"find(sub, start) → first index >= start where sub occurs, or -1."

	^ self find: sub _: start _: self @env0:size
%

category: 'Grail-Search Methods'
method: bytearray
find: sub _: start _: end
	"find(sub, start, end) → first index in [start, end) where ``sub``
	matches, or -1.  Single-int ``sub`` searches for that byte value;
	a sequence ``sub`` searches for the contiguous run."

	| size lo hi subSize |
	size := self @env0:size.
	"CPython bound handling (bytearray overrides find; bytes inherits the rest
	of the search family and normalizes there): None == the default bound, and
	a negative index counts from the end (size + i, floored at 0)."
	lo := start. hi := end.
	(lo @env0:== None) ifTrue: [lo := 0].
	(hi @env0:== None) ifTrue: [hi := size].
	lo @env0:< 0 ifTrue: [lo := (size @env0:+ lo) @env0:max: 0].
	hi @env0:< 0 ifTrue: [hi := (size @env0:+ hi) @env0:max: 0].
	"Clamp only hi to size: a start past the end must miss (an empty sub
	included), so leave lo unclamped and let the ``lo > hi'' guards reject it."
	hi := hi @env0:min: size.
	"Single byte value (range-checked): linear scan."
	(sub isKindOf: Integer) ifTrue: [
		self ___checkByteValue___: sub.
		lo @env0:+ 1 @env0:to: hi do: [:i |
			(self @env0:at: i) @env0:= sub ifTrue: [
				^ i @env0:- 1
			]
		].
		^ -1
	].
	"Sub-sequence: O(n*m) scan.  ``sub`` is itself a bytes /
	bytearray / sequence of ints."
	subSize := sub @env0:size.
	"Empty sub matches at lo, but only if lo is within the window (a start
	past the end -- lo > hi -- misses)."
	subSize @env0:= 0 ifTrue: [^ lo @env0:<= hi ifTrue: [lo] ifFalse: [-1]].
	subSize @env0:> (hi @env0:- lo) ifTrue: [^ -1].
	lo @env0:+ 1 @env0:to: hi @env0:- subSize @env0:+ 1 do: [:i |
		| match |
		match := true.
		1 @env0:to: subSize do: [:j |
			(self @env0:at: i @env0:+ j @env0:- 1) @env0:= (sub @env0:at: j) ifFalse: [
				match := false
			]
		].
		match ifTrue: [^ i @env0:- 1]
	].
	^ -1
%

set compile_env: 0
