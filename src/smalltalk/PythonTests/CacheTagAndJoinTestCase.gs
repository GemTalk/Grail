! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CacheTagAndJoinTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CacheTagAndJoinTestCase comment:
'sys.implementation.cache_tag, and the join bug it exposed.

cache_tag names the bytecode-cache files an implementation would write --
``__pycache__/x.<tag>.pyc''''.  PEP 421 lets it be None when caching does
not apply, and Grail''s was None, which is defensible on its face: nothing
here writes a .pyc.

IT WAS THE WRONG ANSWER ANYWAY, because the tag is used for PATH
ARITHMETIC far more than for reading files.  importlib.util
>> cache_from_source RAISES NotImplementedError on a None tag, so every
caller that merely wants to KNOW the path got an exception instead of a
string -- including CPython''s own test_reprlib, whose
_check_path_limitations computes the cached path''s LENGTH to decide
whether to skip on Windows.  It never opens it.  Five LongReprTest cases
died in that helper, none of them about caching; three now pass and the
other two turn out to have entirely different roots that the helper had
been hiding.

DERIVED, NOT WRITTEN OUT.  ``<name>-<major><minor>'''' read off the values
stored beside it, so a version bump carries and the two cannot drift.
CPython''s is ``cpython-314''''; Grail''s is ``grail-314''''.  Naming Grail
honestly matters -- a .pyc claiming to be CPython''s would be a file no
CPython could load and no Grail would write.

AND IT EXPOSED A REAL PATH BUG.  With a tag in place, cache_from_source
(''''x.py'''') answered ``/__pycache__/x.grail-314.pyc'''' -- with a LEADING
SLASH, because the first component is the empty dirname of a bare
filename and os.path.join('''''''', ''''a'''') answered ''''/a''''.  That
turns a RELATIVE path into an ABSOLUTE one: the kind of thing nobody
notices until something writes to the wrong place.

THE TWO joins WERE WRONG IN OPPOSITE DIRECTIONS, which is possible
because they are separate implementations -- os.path is Smalltalk
(os_path.gs) and posixpath is vendored Python.  The Smalltalk one added a
separator after an EMPTY accumulator; the Python one carried an ``if not
p: continue'''' that CPython does not have, skipping empty components and
so dropping the trailing separator that is how a caller says
``directory''''.  A test here asserts they now agree, since agreeing is
the property that would have caught either.'
%

doit
CacheTagAndJoinTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CacheTagAndJoinTestCase removeAllMethods: 0.
CacheTagAndJoinTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CacheTagAndJoinTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cache_tag_and_join' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/cache_tag_and_join.py')
		name: 'cache_tag_and_join'.
%

category: 'Grail-Helpers'
method: CacheTagAndJoinTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CacheTagAndJoinTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: CacheTagAndJoinTestCase
testTheCacheTagIsSetAndDerived
	"Present, built from name and version so it cannot drift from them,
	and naming Grail rather than CPython."

	self assertAll: #('the_tag_exists' 'the_tag_is_derived'
		'the_tag_names_this_implementation')
%

category: 'Grail-Tests'
method: CacheTagAndJoinTestCase
testCacheFromSourceAnswersAPath
	"What the tag is actually FOR: the path, its shape, and the length
	delta test_reprlib wants -- none of which opens a file."

	self assertAll: #('cache_from_source_answers_a_path'
		'it_does_not_start_with_a_separator'
		'the_length_delta_is_positive')
%

category: 'Grail-Tests'
method: CacheTagAndJoinTestCase
testBothJoinsMatchCPython
	"Twelve component shapes through each implementation, including every
	arrangement of empties -- and the assertion that the two AGREE, which
	is the property that would have caught either of them."

	self assertAll: #('os_path_join' 'posixpath_join' 'the_two_agree')
%

category: 'Grail-Tests'
method: CacheTagAndJoinTestCase
testTheTwoShapesEachGotWrong
	"Named individually because they are opposite mistakes: a separator
	added after an empty accumulator, and a trailing separator dropped by
	skipping an empty component."

	self assertAll: #('an_empty_first_component_stays_relative'
		'an_empty_last_component_keeps_the_separator')
%
