! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningLocationTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningLocationTestCase comment:
'Where a warning says it came from: filename, lineno, and stacklevel.

CPython records the source location on every warning, and ``stacklevel'' picks
WHICH frame gets the blame -- 1 is the warn() call site, 2 its caller.  A
library warns with stacklevel=2 precisely so the report names the code that
misused it rather than the library''s own line.

Grail recorded neither.  warn() accepted ``stacklevel'' and dropped it, and
catch_warnings(record=True) answered records with filename None and lineno 0.
unittest said why, in a comment: "Grail has no frame introspection for the
warn() call site".  That was STALE -- sys._getframe answers a real frame
carrying f_code.co_filename and f_lineno, the same live stack the
module-scoped filter walk already used.  The limitation outlived its cause,
which is the reason a probe came before any code here.

The location is captured ONLY where a warning is being RECORDED: getting the
live stack costs a RAISE, and the ordinary warn-and-print route must not pay
that per call.

WHAT WAS TRIED AND REVERTED: feeding the recorded location into assertWarns''
context, so cm.filename / cm.lineno report the warn() site.  It gained four
tests in test_gettext and LOST five in test_re -- both assert cm.filename, and
Grail''s frame chain has a different shape from CPython''s (module-level code
has no frame at all, and Smalltalk entry points surface as ``<grail>''), so a
CPython-computed stacklevel lands on the wrong frame.  The approximation
assertWarns already stamped -- the test''s own module -- happens to be right
more often.  Measured, not argued: 4 gained against 5 lost.

Every warn() in the fixture is issued from inside a FUNCTION.  Grail does not
represent module-level code as a Python frame, so a warning raised there has no
location to report; a probe that ignored this made the implementation look
broken when it was not.

See tests/python/warning_location.py.'
%

expectvalue /Class
doit
WarningLocationTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningLocationTestCase removeAllMethods: 0.
WarningLocationTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningLocationTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warning_location' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_location.py')
		name: 'warning_location'.
%

category: 'Grail-Helpers'
method: WarningLocationTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningLocationTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the call site'
method: WarningLocationTestCase
testARecordCarriesItsSourceLocation
	"filename and lineno, of the right types, instead of None and 0."

	self assertAll: #('records_the_filename' 'records_the_lineno'
		'filename_is_a_string' 'lineno_is_an_int')
%

category: 'Grail-Tests - stacklevel'
method: WarningLocationTestCase
testStacklevelSelectsTheFrame
	"1 (the default) blames the warn() site; 2 blames the caller, which is
	the whole reason a library passes it."

	self assertAll: #('default_stacklevel_blames_the_warn_site'
		'stacklevel_two_blames_the_caller'
		'stacklevel_two_keeps_the_filename')
%

category: 'Grail-Tests - stacklevel'
method: WarningLocationTestCase
testStacklevelByKeyword
	"``warn(msg, cat, stacklevel=2)'' -- the spelling the fixed-arity forms
	cannot take, so it reaches the varargs dispatcher, which dropped it."

	self assertAll: #('stacklevel_by_keyword')
%

category: 'Grail-Tests - stacklevel'
method: WarningLocationTestCase
testAnOvershootingStacklevelDoesNotRaise
	"Deeper than the stack keeps the outermost frame, as CPython does."

	self assertAll: #('an_overshooting_stacklevel_does_not_raise')
%

category: 'Grail-Tests - unchanged'
method: WarningLocationTestCase
testTheRecordStillCarriesMessageAndCategory
	"Adding a location must not disturb what was already there."

	self assertAll: #('message_still_recorded' 'category_still_recorded')
%
