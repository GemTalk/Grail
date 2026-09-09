! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'PathlibStubSurfaceTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
PathlibStubSurfaceTestCase comment:
'The methods Grail''s pathlib stub grew, and why a stub is worth growing.

src/python/stdlib/pathlib.py is an explicit MINIMAL stub -- its own
header says it exposes "the minimum Path / PurePath surface" Flask
needs.  That is a reasonable place to start and a bad place to stay,
because the missing methods do not announce themselves as missing.  They
announce themselves as ``AttributeError: ''Path'' object has no attribute
''touch''`` from inside whatever library reached for one, where it reads
as that library''s fault.

THE METHODS ARE NOT A WISH LIST.  Each was found by a real caller:
vendoring CPython''s test_zipapp turned an IMPORTERROR into 35 running
tests, and 32 of its 33 errors were ``touch``, ``rglob`` and
``with_suffix``, with 9 more reading ``''<'' not supported between
instances of ''Path'' and ''Path''`` -- a bare sorted() over a glob, which
is simply how you walk a tree reproducibly.  ``unlink``, ``rmdir``,
``relative_to`` and ``with_name`` come with them: they are the rest of
the same small vocabulary, and leaving them out only moves the next
AttributeError one call along.

MEASURED AGAINST THE REAL PATHLIB.  The fixture imports ``pathlib``
rather than a copy of it, so under the fixture gate every expectation
here is checked against CPython''s own implementation, and under Grail
the same assertions check that the stub agrees with what the gate
measured.  That is what keeps a stub honest: it is not asked to be
complete, it is asked to be RIGHT about what it claims.

glob() deliberately supports only two shapes -- a plain fnmatch pattern
and the ``**/`` prefix that means "at any depth" -- because those are
what the callers use; a pattern with a path separator in it is not
supported rather than quietly mismatched.'
%

doit
PathlibStubSurfaceTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
PathlibStubSurfaceTestCase removeAllMethods: 0.
PathlibStubSurfaceTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: PathlibStubSurfaceTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pathlib_stub_surface' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pathlib_stub_surface.py')
		name: 'pathlib_stub_surface'.
%

category: 'Grail-Helpers'
method: PathlibStubSurfaceTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: PathlibStubSurfaceTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: PathlibStubSurfaceTestCase
testTouchCreatesAFileAndSaysSoWhenItCannot
	"Creates, is idempotent, and honours exist_ok=False -- which is the
	half callers branch on, and the half test_zipapp builds fixtures with."

	self assertAll: #('touch_creates' 'touch_is_idempotent'
		'touch_refuses_when_told_to')
%

category: 'Grail-Tests'
method: PathlibStubSurfaceTestCase
testGlobIsShallowAndRglobIsNot
	"The distinction is the whole point of having both, and ``**/'' as a
	glob prefix means exactly rglob."

	self assertAll: #('glob_is_this_directory_only' 'rglob_is_every_depth'
		'glob_star_star_prefix_means_rglob'
		'glob_matches_the_name_not_the_path'
		'rglob_answers_paths_not_names')
%

category: 'Grail-Tests'
method: PathlibStubSurfaceTestCase
testNameSurgeryMatchesTheRealPathlib
	"with_suffix replaces, strips and adds; a suffix without its dot is
	refused rather than concatenated, which is CPython's rule."

	self assertAll: #('with_suffix_replaces' 'with_suffix_strips'
		'with_suffix_adds_when_there_is_none'
		'with_suffix_refuses_a_bare_word' 'with_name_replaces'
		'relative_to_strips_the_prefix' 'relative_to_refuses_a_non_prefix')
%

category: 'Grail-Tests'
method: PathlibStubSurfaceTestCase
testPathsCompareSoTheyCanBeSorted
	"``sorted(p.rglob(...))'' is the ordinary way to walk a tree
	reproducibly, and it needs nothing more than the four comparisons."

	self assertAll: #('paths_sort' 'comparisons_answer')
%

category: 'Grail-Tests'
method: PathlibStubSurfaceTestCase
testUnlinkAndRmdirRemoveAndComplain
	"missing_ok is the difference between a cleanup helper and a
	try/except at every call site."

	self assertAll: #('unlink_removes' 'unlink_refuses_a_missing_file'
		'unlink_forgives_when_told_to' 'rmdir_removes_an_empty_directory')
%

category: 'Grail-Tests'
method: PathlibStubSurfaceTestCase
testTheSurfaceThatWasAlreadyThereIsUnchanged
	"The regression half: exists / is_dir / is_file and the four pure-path
	properties the stub was originally written for."

	self assertAll: #('the_original_surface_still_works')
%
