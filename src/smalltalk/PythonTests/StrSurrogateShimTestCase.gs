! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrSurrogateShimTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrSurrogateShimTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrSurrogateShimTestCase - a lone-surrogate str across the C shim border
! ===============================================================================
! StrSurrogateProtocolTestCase covers the SMALLTALK side of the str protocol.
! This covers the other border such a string has to cross: the C shim, where
! Grail's compiled _sre lives.  re is what makes that border matter in practice
! -- it is the one stdlib module that routinely takes an arbitrary str from user
! code and hands it straight to C.
!
! The Python-visible checks all live in tests/python/str_surrogate_shim.py,
! which is SELF-RUNNING and therefore measured against CPython by
! scripts/check_python_fixtures.sh -- so what this class asserts is what CPython
! actually does, not what Grail happens to do.
!
! Every failure this covers was UNCATCHABLE before the fix: two environment-0
! doesNotUnderstand:s and a shim TypeError naming a C tp_name.  That is why the
! fixture runs each check in its own try/except -- an uncontained one takes the
! whole module import with it, and the dict never gets built at all.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrSurrogateShimTestCase removeAllMethods.
StrSurrogateShimTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - str'
method: StrSurrogateShimTestCase
resultsDict
	"The fixture's per-check verdicts, freshly imported.

	Each entry is ``true'' or the text of the exception that check raised, so
	a failure names the operation AND says how it broke.  Evicting the module
	first matters: RESULTS is computed at import time, so a cached instance
	would replay the verdicts of whenever it was first imported."

	| mod |
	importlib @env1:modules removeKey: #'str_surrogate_shim' ifAbsent: [].
	mod := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/str_surrogate_shim.py')
		name: 'str_surrogate_shim'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - str'
method: StrSurrogateShimTestCase
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
method: StrSurrogateShimTestCase
testSurrogatePatternCompiles
	"A pattern containing lone surrogates reaches _sre and compiles.

	This is the blocker bleach hit, reduced: html5lib's _inputstream.py builds
	a character class over D800..DFFF with an eval and compiles it at import
	time.  PyUnicode_Check reads Py_TPFLAGS_UNICODE_SUBCLASS off the type
	address the wrapper carries, and typeAddrFor: had no mapping for the boxed
	str classes, so they fell through to ``object'' -- flag clear, check false,
	and _sre reported ``expected string or bytes-like object, got 'object'''.
	That message is the tell: ``object'' is a C tp_name, not any value Python
	was handed.

	Compiling alone would not be proof -- a pattern that lost its code points
	in transit compiles just as happily -- so .pattern is read back, and the
	negative case pins that the class still matches nothing in plain text."

	self assertChecks: #('compiles_a_surrogate_pattern'
		'compiled_pattern_reads_back' 'surrogate_pattern_misses_plain_text')
%

category: 'Grail-Tests - str'
method: StrSurrogateShimTestCase
testSurrogateSubjectMatches
	"An ordinary pattern scanning a subject that CONTAINS a surrogate.

	Separate from the pattern case, and it broke separately: the subject is
	read through get_ucs4_for_string, which sends encodeAsUTF8 in environment
	0.  Strict UTF-8 cannot encode D800..DFFF at all, and the boxed classes
	forward only environment 1, so the send was a Smalltalk DNU no Python
	``except'' could see.  This is also the commoner shape in the wild -- the
	pattern is a literal in library code and the surrogate arrives in the data.

	The span is asserted because it is measured in CODE POINTS: a UTF-8 byte
	offset leaking out as a character index would read 1..4 here, the
	surrogate being three bytes in the WTF-8 form the shim transfers."

	self assertChecks: #('plain_pattern_over_surrogate_subject'
		'match_span_is_correct')
%

category: 'Grail-Tests - str'
method: StrSurrogateShimTestCase
testMatchedTextComesBack
	"The match comes BACK out of C as the same code points.

	Reading the subject is only half a round trip.  _sre returns a span
	through PyUnicode_Substring:from:to:, which slices with copyFrom:to: --
	a third environment-0 send, and a third DNU.  sub/split are here because
	they assert the NEIGHBOURS survive: an off-by-one in the byte/code-point
	conversion eats the characters either side, which is exactly how an
	earlier mis-decode showed up in test_textwrap's umlaut wraps."

	self assertChecks: #('match_group_round_trips'
		'substitution_preserves_neighbours' 'split_around_a_surrogate'
		'findall_returns_each_surrogate')
%

category: 'Grail-Tests - str'
method: StrSurrogateShimTestCase
testSliceOutOfSurrogateNarrows
	"A span holding no surrogate comes back as an ORDINARY str.

	PyStrSurrogate rests on the invariant that it always contains at least one
	surrogate -- without it, ``t[0]'' on a surrogate-bearing string answered a
	PyStrSurrogate holding just ``a'', which then compared UNEQUAL to 'a'.  A
	span extracted through the shim has to keep that invariant too, and
	___fromCodePoints___: is what applies it.

	In CPython there is only one str type and this check is trivially true.
	That is the point: it reads the same on both sides, so the fixture can be
	measured against CPython like every other check here."

	self assertChecks: #('sliced_span_without_surrogate_is_plain')
%
