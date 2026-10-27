Extension { #name : 'Interval' }

{ #category : 'Grail-Python protocol' }
Interval class >> __getitem__: index [
	"``range[1]'' -- a TypeError, as in CPython, which gives range no
	__class_getitem__.  Metaclass3's permissive default answers the class itself
	for any subscript, which is load-bearing for user classes but hid this for a
	built-in: ``def f(x: range[1])'' read its annotations without complaint where
	CPython raises (test_annotationlib test_partial_evaluation_error).  Joins the
	scalar built-ins Subscript.gs already makes strict (int, float, bool, str,
	bytes); range cannot be subclassed, so there is no hook to defer to."

	^ TypeError ___signal___: 'type ''range'' is not subscriptable'

]

{ #category : 'Grail-Initialization' }
Interval class >> __new__ [
	"range() -- refused by name, as CPython's range_from_array does
	(Objects/rangeobject.c:118).  The inherited fallback named the kernel
	class: ``cannot create 'Interval' instances''."

	^ TypeError ___signal___: 'range expected at least 1 argument, got 0'

]

{ #category : 'Grail-Initialization' }
Interval class >> __new__: stop [
	"range(stop) — creates range from 0 to stop-1 with step 1.
	Receiver is the class."

	"Coerced through __index__ -- see __new__:_: above."
	| e |
	e := stop ___asIndex___.
	^ self @env0:from: 0 to: (e @env0:- 1) by: 1

]

{ #category : 'Grail-Initialization' }
Interval class >> __new__: start _: stop [
	"range(start, stop) — creates range from start to stop-1 with step 1.
	Receiver is the class."

	"Coerced through __index__ (PEP 357) before any arithmetic.  Without
	it ``range(k)'' on an __index__ object reached env-0 ``-'' on a Python
	object and died with an uncatchable MessageNotUnderstood -- not a
	TypeError a program could handle.  ___asIndex___ raises CPython's own
	``'X' object cannot be interpreted as an integer'' for a non-index."
	| s e |
	s := start ___asIndex___.
	e := stop ___asIndex___.
	^ self @env0:from: s to: (e @env0:- 1) by: 1

]

{ #category : 'Grail-Initialization' }
Interval class >> __new__: start _: stop _: step [
	"range(start, stop, step) — creates range from start to stop-1 with
	given step. Receiver is the class."

	| adjustedStop s e st |
	"Coerced through __index__ before the zero test, so range(0, 3, k)
	behaves as CPython's does -- see __new__:_: above."
	s := start ___asIndex___.
	e := stop ___asIndex___.
	st := step ___asIndex___.
	"Step cannot be zero"
	(st @env0:= 0) ifTrue: [
		ValueError ___signal___: 'range() arg 3 must not be zero'
	].

	"Python's range is exclusive of stop, but Interval's to is inclusive.
	 For positive step: to = stop - 1
	 For negative step: to = stop + 1
	 But we need to handle empty ranges correctly."
	adjustedStop := (st @env0:> 0)
		ifTrue: [e @env0:- 1]
		ifFalse: [e @env0:+ 1].

	^ self @env0:from: s to: adjustedStop by: st

]

{ #category : 'Grail-Initialization' }
Interval class >> _new: positional kw: keywords [
	"range() with a keyword or with more than three arguments, the only calls
	the class-call path sends here.  CPython refuses both by name
	(Objects/rangeobject.c:141, 122); the fallbacks without this named the
	kernel class, Interval."

	keywords @env0:isEmpty ifFalse: [
		^ TypeError ___signal___: 'range() takes no keyword arguments'].
	^ TypeError ___signal___: 'range expected at most 3 arguments, got '
		@env0:, positional @env0:size @env0:printString

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> ___containsInt___: value [
	"range_contains_long: value lies between start and stop on the step's
	side, and (value - start) is a multiple of step.  Smalltalk's ``\\'' is
	floored, so the remainder test is right for a negative step too."

	| n startVal stepVal stopVal |
	n := value == true
		ifTrue: [1]
		ifFalse: [value == false ifTrue: [0] ifFalse: [value]].
	startVal := self @env0:_from.
	stepVal := self @env0:increment.
	stopVal := self stop.
	(stepVal @env0:> 0)
		ifTrue: [((n @env0:>= startVal) @env0:and: [n @env0:< stopVal]) ifFalse: [^ false]]
		ifFalse: [((n @env0:<= startVal) @env0:and: [n @env0:> stopVal]) ifFalse: [^ false]].
	^ ((n @env0:- startVal) @env0:\\ stepVal) @env0:= 0

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> ___isArithmeticMember___: value [
	"Whether range answers count/index/``in'' for value arithmetically: an
	exact int or a bool, the PyLong_CheckExact || PyBool_Check test of
	CPython's rangeobject.c.  A Python int subclass is not an Integer here,
	so it takes the element-by-element path, as in CPython."

	^ (value @env0:isKindOf: Integer)
		@env0:or: [value == true @env0:or: [value == false]]

]

{ #category : 'Grail-Attributes' }
Interval >> ___pyAttrDelete___: aName [
	"See ___refuseReadOnlyAttr___:."

	self ___refuseReadOnlyAttr___: aName.
	^ super ___pyAttrDelete___: aName

]

{ #category : 'Grail-Attributes' }
Interval >> ___pyAttrStore___: aName put: aValue [
	"See ___refuseReadOnlyAttr___:."

	self ___refuseReadOnlyAttr___: aName.
	^ super ___pyAttrStore___: aName put: aValue

]

{ #category : 'Grail-Attributes' }
Interval >> ___refuseReadOnlyAttr___: aName [
	"start, stop and step are Py_READONLY members of CPython's range
	(Objects/rangeobject.c:775), so a store and a delete are both refused as
	``readonly attribute''.  Grail accepted both without a word, and the
	readers went on answering the range's own values."

	(#('start' 'stop' 'step') @env0:includes: aName @env0:asString) ifTrue: [
		^ AttributeError ___signal___: 'readonly attribute']

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> __bool__ [
	"Test if range is non-empty"

	| size |
	size := self @env0:size.
	^ size @env0:> 0

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> __contains__: value [
	"``value in range'' -- CPython's range_contains: ARITHMETIC for an exact
	int or a bool, so ``2**87 in range(1, 2**100, 2)'' answers at once (#1380);
	anything else (a float, an int subclass, an object with its own __eq__)
	is searched element by element with Python rich equality, the inherited
	SequenceableCollection scan.  This used to be Smalltalk ``includes:'',
	which walked the range for any step but 1 and compared by ``='', so an
	ALWAYS_EQ object was never found."

	(self ___isArithmeticMember___: value) ifTrue: [
		^ self ___containsInt___: value].
	^ super __contains__: value

]

{ #category : 'Grail-Comparison' }
Interval >> __eq__: other [
	"CPython's range_equals (Objects/rangeobject.c:515): two ranges are equal
	when they hold the same elements -- the same length, then the same start
	unless both are empty, then the same step unless they hold one element.
	Comparing the steps of a one-element range made range(5, 6) differ from
	range(5, 6, 2), though both are [5]."

	| size |
	other @env0:class == range ifFalse: [^ false].
	size := self @env0:size.
	size @env0:= other @env0:size ifFalse: [^ false].
	size @env0:= 0 ifTrue: [^ true].
	self start @env0:= other start ifFalse: [^ false].
	size @env0:= 1 ifTrue: [^ true].
	^ self step @env0:= other step

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> __getitem__: index [
	"Return the item at the given index or a slice."

	| idx size |
	(index isKindOf: slice) ifTrue: [
		"CPython: ``range(...)[i:j:k]'' is a NEW range, not a list -- so it
		compares equal only to another range (test_slice test_indices:
		``range(len)[s] == range(*s.indices(len))'').  slice>>indices: gives the
		normalized (start, stop, step) against this range's length; map them
		through this range's own start/step to the sub-range's endpoints
		(stop stays exclusive, matching range __new__:_:_:'s convention)."
		| ind sStart sStop sStep rStart rStep |
		ind := index indices: self @env0:size.
		sStart := ind @env0:at: 1.
		sStop := ind @env0:at: 2.
		sStep := ind @env0:at: 3.
		rStart := self start.
		rStep := self step.
		^ range @env1:__new__: (rStart @env0:+ (sStart @env0:* rStep))
			_: (rStart @env0:+ (sStop @env0:* rStep))
			_: (rStep @env0:* sStep)
	].
	"Non-integer, non-slice index: catchable TypeError instead of an
	uncatchable env-0 comparison DNU on the index."
	((index isKindOf: Integer)
		or: [index ___hasIndexDunder___]) ifFalse: [
		"PYTHON type name, through ___pyTypeNameForError___: ``index class name''
		is the GEMSTONE class backing the value, so this message read ``not
		Unicode7'' for a str key, ``not SmallDouble'' for a float and ``not
		ByteArray'' for bytes, where CPython says str / float / bytes.  Bytes.gs
		and Bytearray.gs already named the type properly; these sites did not."
		TypeError ___signal___: ('range indices must be integers or slices, not '
			@env0:, (index ___pyTypeNameForError___))].
	"Fetch the index via __index__ (see SequenceableCollection>>__getitem__:)."
	idx := index ___asIndex___.
	size := self @env0:size.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'range object index out of range'
	].

	"Convert to 1-based Smalltalk index and get value"
	^ self @env0:at: (idx @env0:+ 1)

]

{ #category : 'Grail-Hashing' }
Interval >> __hash__ [
	"CPython's range_hash (Objects/rangeobject.c:579): the hash of
	(len, start, step), with None for the start of an empty range and for the
	step of a one-element one, so ranges that __eq__: calls equal hash alike.
	The kernel's hash sees the inclusive end, so range(0, 5, 2) and
	range(0, 6, 2) -- both [0, 2, 4] -- hashed apart."

	| size |
	size := self @env0:size.
	^ (tuple
		@env0:with: size
		with: (size @env0:= 0 ifTrue: [nil] ifFalse: [self start])
		with: (size @env0:<= 1 ifTrue: [nil] ifFalse: [self step])) __hash__

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> __iter__ [
	"Return an iterator over the range."

	^ range_iterator ___on: self

]

{ #category : 'Grail-Sequence Protocol' }
Interval >> __len__ [
	"Return the length of the range"
	^ self @env0:size

]

{ #category : 'Grail-Comparison' }
Interval >> __ne__: other [
	"Test inequality with another range"

	| eq |
	eq := self __eq__: other.
	^ eq @env0:not

]

{ #category : 'Grail-String Representation' }
Interval >> __repr__ [
	"Return string representation of the range"

	| stream |
	stream := AppendStream @env0:on: (Unicode7 ___new___).

	stream @env0:nextPutAll: 'range('.

	"ALWAYS start and stop, never the one-argument abbreviation.  CPython prints
	``range(0, 1)'' for ``range(1)'' -- repr(range) is not the constructor call
	that was written, it is the normalised three-field form, and reprlib's
	test_range compares it literally.

	Stop comes from the ``stop'' ACCESSOR rather than being recomputed here.  The
	inline version was ``to + 1'', which is the inclusive-to-exclusive conversion
	for a POSITIVE step only: GemStone's Interval keeps an inclusive bound, so a
	negative step needs ``to - 1'', and ``range(5, 0, -1)'' printed as
	``range(5, 2, -1)'' -- a range with different contents from the one being
	printed, while .start/.stop/.step all reported the right values.  One source
	for the conversion means the repr and the attribute cannot disagree again."
	stream @env0:nextPutAll: (from @env0:printString).
	stream @env0:nextPutAll: ', '.
	stream @env0:nextPutAll: (self stop) @env0:printString.
	(by @env0:= 1) ifFalse: [
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: (by @env0:printString).
	].

	stream @env0:nextPut: $).
	^ stream @env0:contents

]

{ #category : 'Grail-Iteration' }
Interval >> __reversed__ [
	"reversed(range(...)) -- an ITERATOR walking the range backwards, which is
	what CPython answers (a range_iterator over the reversed range).  This used
	to answer the reversed RANGE itself; the difference is observable, because a
	range reports a STATIC len() and so a static operator.length_hint, while an
	iterator's hint decreases with every __next__.  That broke the
	len(it) == len(list(it)) invariant: ``it = reversed(range(10))'' reported 10
	after nine of its ten items had been consumed (test_iterlen
	TestXrangeCustomReversed/TestListReversed test_invariant).

	The reversed range is still computed the same way -- only the iterator
	wrapper is new."

	| size startVal stepVal newStart newStop newStep |
	size := self @env0:size.

	"Empty range returns an exhausted iterator"
	(size == 0) ifTrue: [
		^ (range __new__: 0 _: 0 _: 1) __iter__
	].

	startVal := self start.
	stepVal := self step.

	"Calculate new start: original start + (size - 1) * step"
	newStart := startVal  @env0:+ ((size @env0:- 1) @env0:* stepVal).

	"New step is negated"
	newStep := stepVal @env0:negated.

	"New stop is original start + newStep (exclusive)"
	newStop := startVal @env0:+ newStep.

	^ (range __new__: newStart _: newStop _: newStep) __iter__

]

{ #category : 'Grail-Sequence Methods' }
Interval >> count: value [
	"range.count(value): 0 or 1 by arithmetic for an exact int or a bool;
	otherwise the number of elements equal to value by Python rich equality
	-- ``range(10).count(ALWAYS_EQ)'' is 10 (test_range test_count)."

	(self ___isArithmeticMember___: value) ifTrue: [
		^ (self ___containsInt___: value) ifTrue: [1] ifFalse: [0]].
	^ super count: value

]

{ #category : 'Grail-Sequence Methods' }
Interval >> index: value [
	"range.index(value): (value - start) // step for an exact int or a bool
	in the range; otherwise the first element equal to value by Python rich
	equality.  CPython's two misses read differently, and both are pinned:
	``range.index(x): x not in range'' and ``sequence.index(x): x not in
	sequence''."

	| i n |
	(self ___isArithmeticMember___: value) ifTrue: [
		(self ___containsInt___: value) ifFalse: [
			^ ValueError ___signal___: 'range.index(x): x not in range'].
		n := value == true
			ifTrue: [1]
			ifFalse: [value == false ifTrue: [0] ifFalse: [value]].
		^ (n @env0:- self @env0:_from) @env0:// self @env0:increment].
	i := 1.
	[i @env0:<= self @env0:size] @env0:whileTrue: [
		((self @env0:at: i) ___pyRichEqBool___: value) ifTrue: [^ i @env0:- 1].
		i := i @env0:+ 1].
	^ ValueError ___signal___: 'sequence.index(x): x not in sequence'

]

{ #category : 'Grail-Attributes' }
Interval >> start [
	"Return the start value (Python's start attribute)"
	^ self @env0:_from

]

{ #category : 'Grail-Attributes' }
Interval >> step [
	"Return the step value (Python's step attribute)"
	^ self @env0:increment

]

{ #category : 'Grail-Attributes' }
Interval >> stop [
	"Return the stop value (Python's stop attribute - exclusive)"

	| fromVal byVal toVal |
	fromVal := self @env0:_from.
	byVal := self @env0:increment.
	toVal := self @env0:_to.

	"Convert from inclusive 'to' to exclusive 'stop'"
	^ (byVal @env0:> 0)
		ifTrue: [toVal @env0:+ 1]
		ifFalse: [toVal @env0:- (1)]

]
