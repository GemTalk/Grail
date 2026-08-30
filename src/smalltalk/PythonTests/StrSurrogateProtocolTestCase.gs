! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrSurrogateProtocolTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrSurrogateProtocolTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrSurrogateProtocolTestCase - a surrogate-bearing str across the str protocol
! ===============================================================================
! SurrogateStrTestCase covers the LITERAL and the handful of operations
! PyStrSurrogate implements on its own behalf.  This covers the other side: the
! operations CharacterCollection implements, which used to gate on ``isKindOf:
! CharacterCollection'' and so treated such a str as not-a-string at all.
!
! The Python-visible checks all live in tests/python/str_surrogate_protocol.py,
! which is SELF-RUNNING and therefore measured against CPython by
! scripts/check_python_fixtures.sh -- so what this class asserts is what CPython
! actually does, not what Grail happens to do.  The last test is the exception,
! and says so: it drives the shared Smalltalk accessors directly, which have no
! CPython counterpart to compare against.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrSurrogateProtocolTestCase removeAllMethods.
StrSurrogateProtocolTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
resultsDict
	"The fixture's per-check verdicts, freshly imported.

	Each entry is ``true'' or the text of the exception that check raised, so
	a failure names the operation AND says how it broke -- which matters here
	because the interesting failures are uncatchable Smalltalk errors with
	nothing Python-shaped about them."

	| mod |
	importlib @env1:modules removeKey: #'str_surrogate_protocol' ifAbsent: [].
	mod := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/str_surrogate_protocol.py')
		name: 'str_surrogate_protocol'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
assertChecks: names
	"Assert that every named fixture check answered True under Grail."

	| results |
	results := self resultsDict.
	names do: [:key |
		| got |
		got := results @env1:__getitem__: key.
		self
			assert: got = true
			description: key , ': expected true but got ' , got printString]
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testIdentity
	"A surrogate-bearing literal IS a str to Python -- isinstance, type name,
	len and repr -- even though it is not a CharacterCollection to Smalltalk.
	Everything below rests on that: the operations were not failing because
	the value was the wrong TYPE, they were failing because the guards asked
	the wrong QUESTION."

	self assertChecks: #('is_a_str' 'type_name_is_str' 'length_is_one'
		'repr_is_escaped')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testContainment
	"``s in 'abc''' is the operation the whole protocol was blocked on, and
	the one two independent lanes hit on the same day through ``re'' ->
	bleach.  __contains__ gated on ``isKindOf: CharacterCollection'' and
	raised ``TypeError: 'in <string>' requires string as left operand, not
	PyStrSurrogate'' -- naming the Smalltalk class in a Python error message,
	which is itself the tell that the guard had asked about representation
	where it meant to ask about type.  CPython answers False.

	The empty-needle and plain-needle cases are here to keep the fix honest:
	a guard that answered False for everything would pass the first two
	checks."

	self assertChecks: #('surrogate_not_in_plain' 'plain_not_in_surrogate'
		'plain_in_surrogate_bearing' 'empty_in_surrogate')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testEquality
	"Equality already worked, by accident: str.__eq__ answered NotImplemented
	for a non-CharacterCollection, the reflected PyStrSurrogate>>__eq__ got
	its turn, and that one is correct.  It is asserted anyway because the fix
	moves the decision to the LEFT operand, and a rule that only works
	through the reflected send is one dispatch change away from silently
	inverting."

	self assertChecks: #('eq_plain_is_false' 'reflected_eq_is_false'
		'ne_plain_is_true' 'eq_itself')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testOrdering
	"Ordering had NO route.  str.__lt__ punted to the reflected __gt__,
	PyStrSurrogate implemented none of the four, and its doesNotUnderstand:
	raises rather than forwarding -- so ``'abc' < s'' raised TypeError and
	``s < 'abc''' raised NotImplementedError, where CPython answers True and
	False.  A str that cannot be SORTED is not usable as a str, and PEP 383
	filenames get sorted all the time.

	Both directions are asserted because the two now take different paths:
	left-hand plain goes through CharacterCollection>>__lt__'s new exact-str
	branch, left-hand surrogate through PyStrSurrogate>>___orderAgainst___."

	self assertChecks: #('plain_sorts_before_surrogate'
		'surrogate_sorts_after_plain' 'surrogate_not_less_than_plain'
		'le_and_ge_agree' 'sorted_puts_surrogate_last')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testConcatenation
	"``'abc' + s'' reached the right answer through the binop fallback and
	PyStrSurrogate>>__radd__:; it is settled directly now, so both directions
	and repetition are pinned."

	self assertChecks: #('plain_plus_surrogate' 'surrogate_plus_plain'
		'repetition')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testPrefixAndSuffix
	"startswith / endswith raised ``first arg must be str or a tuple of str,
	not str'' -- a message that could not be true, and was produced by asking
	isKindOf: and then naming the type with the PYTHON type name.  CPython
	answers False.

	The surrogate-RECEIVER spellings (``T.startswith('a')'') are here too:
	those fell to PyStrSurrogate's doesNotUnderstand: refusal, so a
	perfectly ordinary question about a surrogateescape'd path raised."

	self assertChecks: #('plain_startswith_surrogate' 'plain_endswith_surrogate'
		'surrogate_startswith_plain' 'surrogate_endswith_plain'
		'surrogate_startswith_tuple' 'removeprefix_leaves_string'
		'removesuffix_leaves_string')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testSubstringSearch
	"find / rfind / index / count / replace / split / partition all handed the
	needle to a GemStone kernel primitive, which answered an
	ArgumentTypeError.  That is a SMALLTALK error: no Python ``except'' can
	see it, so ``'abc'.find(name)'' on a surrogateescape'd name took down the
	caller instead of answering -1.

	They route through ___pyFindString___:startingAt: now, which answers
	``absent'' -- correct by the class invariant, since a needle holding a
	surrogate cannot occur in a string that has none.  replace's two
	insert-a-surrogate cases are the ones that are NOT merely absent, and
	they are what proves the shared code-point accessor is doing real work
	rather than short-circuiting."

	self assertChecks: #('find_reports_absent' 'rfind_reports_absent'
		'count_is_zero' 'index_raises_value_error' 'replace_is_a_no_op'
		'replace_can_insert_a_surrogate' 'replace_honours_count'
		'split_finds_no_separator' 'partition_finds_no_separator')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testJoinAndFormat
	"``'-'.join(parts)'' died inside Unicode7>>addAll: as an uncatchable
	doesNotUnderstand: when any part held a surrogate.  It now sets the
	stream aside and finishes in code points, the way ___formatString___
	already did for ``'{}'.format(name)''.

	The all-plain join is asserted alongside because the code-point path must
	stay OFF for ordinary strings -- it allocates, and every join in the
	corpus goes through this method."

	self assertChecks: #('join_carries_the_surrogate'
		'join_of_plain_pieces_is_plain' 'format_braces'
		'str_of_surrogate_is_itself')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testMaketransAndContainers
	"maketrans is keyed and valued by CODE POINT, which is exactly what every
	str representation can supply -- so routing it through the shared
	accessor removes a guard rather than adding a branch.

	The container checks are the reflected-equality path once removed: list
	and set membership and dict keying all end in str.__eq__, so they moved
	when it did."

	self assertChecks: #('maketrans_accepts_a_surrogate' 'maketrans_dict_key'
		'not_in_a_list_of_plain' 'not_in_a_set_of_plain'
		'usable_as_a_dict_key' 'decoding_a_str_is_refused')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testEncodingUnchanged
	"The one place the two systems already agreed, asserted so the protocol
	work does not quietly change it: strict UTF-8 REFUSES a lone surrogate in
	CPython too, and surrogatepass emits the WTF-8 three-byte form."

	self assertChecks: #('strict_encode_raises' 'surrogatepass_encode')
%

category: 'Grail-Tests - str'
method: StrSurrogateProtocolTestCase
testSharedAccessorsAcrossRepresentations
	"GRAIL-ONLY, and driven from Smalltalk because it has no Python
	counterpart: the three shared accessors the guards above route through.

	This is the part of the change that is a SHAPE rather than a fix.
	___pyCodePoints___ has to answer the same code points for all three str
	representations, or the guards are only sharing a name; ___pyPlainStr___
	has to answer nil for the one representation the kernel primitives cannot
	take, and a real CharacterCollection for the other two; and
	___isExactPyStr___ has to answer false for a str SUBCLASS, or the binary
	dunders would settle a comparison that CPython gives to the subclass's own
	__eq__ / __lt__ (reflected-operand priority).

	A non-str must answer nil to both accessors: a site that means ``is this a
	Python string'' asks ___isPyStr___ first, but the accessors are what a
	site reaches for next, and one that answered an empty sequence for an
	Integer would turn a type error into a wrong answer."

	| sur boxed cps |
	sur := PyStrSurrogate ___fromCodePoints___: #(97 16rDC80 98).

	"All three representations agree on the code points."
	self assert: ('abc' ___pyCodePoints___ asArray = #(97 98 99)).
	self assert: (sur ___pyCodePoints___ asArray = (Array with: 97 with: 16rDC80 with: 98)).

	"___fromCodePoints___ DEMOTES a surrogate-free result, so a boxed str is
	built through the AbstractPyStr path instead."
	boxed := AbstractPyStr ___new___: 'abc'.
	self assert: (boxed ___pyCodePoints___ asArray = #(97 98 99)).

	"___pyPlainStr___: a kernel-usable string, or nil."
	self assert: ('abc' ___pyPlainStr___ = 'abc').
	self assert: (boxed ___pyPlainStr___ = 'abc').
	self assert: (sur ___pyPlainStr___ == nil).

	"A non-str answers nil to both -- never an empty sequence."
	self assert: (42 ___pyCodePoints___ == nil).
	self assert: (42 ___pyPlainStr___ == nil).
	self assert: (42 ___isPyStr___ = false).

	"___isExactPyStr___: true for a kernel string and for the surrogate
	representation, false for a str SUBCLASS instance, whose own dunders must
	keep reflected-operand priority."
	self assert: ('abc' ___isExactPyStr___ = true).
	self assert: (sur ___isExactPyStr___ = true).
	self assert: (boxed ___isExactPyStr___ = false).
	self assert: (42 ___isExactPyStr___ = false).

	"___fromCodePoints___ demotes: a surrogate-free code point sequence comes
	back as an ordinary string, which is what keeps cross-representation
	equality trivially decidable."
	cps := PyStrSurrogate ___fromCodePoints___: #(97 98 99).
	self assert: (cps isKindOf: CharacterCollection).
	self assert: (cps = 'abc')
%
