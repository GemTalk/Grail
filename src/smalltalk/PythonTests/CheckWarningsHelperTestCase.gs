! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CheckWarningsHelperTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CheckWarningsHelperTestCase comment:
'test.support''s check_warnings() records AND checks.

It is not a silencer with a list attached.  On exit it verifies the recorded
warnings against the filters it was given: a filter that caught nothing raises
AssertionError unless quiet, and a warning no filter claimed raises always.
``quiet'' defaults to True with NO filters and False when filters are given,
which is why the bare form reads as "silence warnings here" and the filtered
form reads as an assertion.

The object it yields is a WarningsRecorder, and two of its habits matter:
attribute reads PROXY to the LAST warning, so ``w.message'' is the most recent
one rather than a list; and reset() moves a WATERMARK rather than emptying the
list, so w.warnings answers only what arrived since.

Grail''s version recorded and never checked, and exposed the bare list with no
proxy.  ``str(w.message)'' raised AttributeError, and both of
test_check_warnings'' assertRaises(AssertionError) cases passed for the wrong
reason -- nothing was ever going to raise.

os_helper.FS_NONASCII came with it: a non-ASCII character for building
filenames, which two tests skip on when absent.

See tests/python/check_warnings_helper.py.'
%

expectvalue /Class
doit
CheckWarningsHelperTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CheckWarningsHelperTestCase removeAllMethods: 0.
CheckWarningsHelperTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CheckWarningsHelperTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'check_warnings_helper' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/check_warnings_helper.py')
		name: 'check_warnings_helper'.
%

category: 'Grail-Helpers'
method: CheckWarningsHelperTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CheckWarningsHelperTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the recorder'
method: CheckWarningsHelperTestCase
testMessageProxiesToTheLastWarning
	"``w.message'' is the most recent warning, not the list."

	self assertAll: #('message_proxies_to_the_last_warning'
		'the_list_holds_them_in_order' 'empty_before_anything_is_recorded')
%

category: 'Grail-Tests - the recorder'
method: CheckWarningsHelperTestCase
testResetMovesAWatermark
	"Not an empty(): what arrived before reset stays in the underlying list,
	and w.warnings simply stops reporting it."

	self assertAll: #('reset_moves_a_watermark')
%

category: 'Grail-Tests - the checking half'
method: CheckWarningsHelperTestCase
testTheBareFormIsQuiet
	"No filters means quiet, so catching nothing is fine."

	self assertAll: #('the_bare_form_tolerates_silence'
		'a_matching_filter_passes')
%

category: 'Grail-Tests - the checking half'
method: CheckWarningsHelperTestCase
testAnUnsatisfiedFilterRaises
	"Giving a filter means quiet=False, so catching nothing is an error --
	and so is a warning whose category no filter claimed."

	self assertAll: #('a_filter_that_caught_nothing_raises'
		'a_wrong_category_raises')
%
