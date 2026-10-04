! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrSearchAndSplitTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StrSearchAndSplitTestCase comment:
'The str search and split family, as CPython string_tests drives it.

collections.UserString was a seven-method stub, so CPython test_userstring --
which runs all of string_tests through a UserString delegating every method
to str -- scored 1 failure and 59 errors without ever reaching str.  Porting
CPython UserString exposed what the stub had hidden, all of it in str:

  * find was the kernel naive scan, quadratic in the worst case, and
    test_adaptive_find TIMED OUT on it.  An unbounded worst case now takes
    the linear two-way search (CharacterCollection >> ___twoWayFind___:).
  * a non-str argument to the find family, partition, replace, removeprefix
    or join reached a kernel primitive whose error no except can catch.
  * split / rsplit with a maxsplit re-joined the tail with single spaces,
    rsplit matched left to right, and a positional None separator was read
    as the string None.
  * an empty needle: count, rfind and replace all answered as if absent.
  * an inverted startswith window, an empty istitle, nested %-format keys
    and a non-int star width.

Every expectation in tests/python/str_search_and_split.py was produced by
CPython 3.14; the fixture gate re-checks it there.'
%

doit
StrSearchAndSplitTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StrSearchAndSplitTestCase removeAllMethods: 0.
StrSearchAndSplitTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrSearchAndSplitTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_search_and_split' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_search_and_split.py')
		name: 'str_search_and_split'.
%

category: 'Grail-Helpers'
method: StrSearchAndSplitTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrSearchAndSplitTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testSplitKeepsTheRemainderVerbatim
	"Once maxsplit is spent, the rest of the string is ONE piece with its
	own whitespace intact -- not the remaining words re-joined by spaces."

	self assertAll: #('split_whitespace_with_maxsplit' 'a_zero_maxsplit_does_not_split')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testRsplitWorksFromTheRight
	"Separators are matched right to left and the unsplit head keeps its
	leading whitespace; rsplit used to be a left split re-joined."

	self assertAll: #('rsplit_whitespace_keeps_the_head' 'rsplit_matches_from_the_right')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testANonStrArgumentIsATypeError
	"Each of these reached a kernel primitive whose error ended the session."

	self assertAll: #('split_refusals' 'find_family_refuses_a_non_str'
		'partition_refusals' 'replace_refusals' 'removeprefix_refuses_a_non_str'
		'join_refuses_a_non_str_item')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testTheEmptyNeedle
	"It occurs at every position of the window, its end included."

	self assertAll: #('the_empty_needle' 'replace_with_an_empty_old'
		'an_inverted_window_matches_nothing')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testArityAndWindows
	"Extra positionals are refused rather than dropped, and the [start, end)
	window follows CPython's ADJUST_INDICES."

	self assertAll: #('too_many_arguments' 'windows_and_misses')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testAdaptiveFindIsLinear
	"The test_adaptive_find shape: about 10**11 comparisons for the naive
	scan, linear for the two-way search it now falls back to.  The periodic
	needle exercises the two-way search's other branch.  (The suite's own
	million-character size is AlmostOutOfMemory in a default gem.)"

	self assertAll: #('adaptive_find_is_linear')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testIstitleAndPercentFormat
	self assertAll: #('istitle_needs_a_cased_character'
		'percent_mapping_keys_nest' 'percent_star_wants_an_int')
%

category: 'Grail-Tests'
method: StrSearchAndSplitTestCase
testUserStringIsComplete
	"CPython's UserString, registered as a Sequence."

	self assertAll: #('userstring_is_complete')
%
