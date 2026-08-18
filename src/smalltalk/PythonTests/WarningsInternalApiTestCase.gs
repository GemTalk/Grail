! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WarningsInternalApiTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WarningsInternalApiTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningsInternalApiTestCase comment:
'The internal surface CPython''s warnings publishes, and the filter tuple.

CPython 3.14 splits warnings into _py_warnings and a _warnings accelerator, and
its helpers read every global off ``_wm'', the module _set_module points at.
test.test_warnings drives BOTH implementations through that surface.

THE FILTER TUPLE IS (action, message, category, module, lineno).  Grail built
the same five fields with the category second and the message third -- invisible
while nothing outside warnings.gs read the list, and wrong the moment something
did, because _py_warnings'' _add_filter and test_warnings index these positions
directly.  The ORDER is the interop contract; the message and module SLOTS
still hold Grail''s plain strings rather than compiled regexes, which is the
substring/prefix matching _actionFor: has always documented.

CALLING THROUGH A VARIABLE.  ``self.module.resetwarnings()'' is how
test_warnings reaches the implementation under test, and a call through a
VARIABLE compiles to attribute-load-then-call rather than a direct send.  A
unary Grail module method AUTO-INVOKES on the load, so the load answered None
and the call landed on it -- ``''NoneType'' object is not callable'', twenty-one
times over.  Every public entry needs the varargs form; resetwarnings was the
last one without.

Also guarded here: _set_module must not be re-pointed on every access.  Reading
an attribute that reaches the vendored module used to yank _wm back to this one,
which silently broke the py variant for the rest of the session.

See tests/python/warnings_internal_api.py.'
%

expectvalue /Class
doit
WarningsInternalApiTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
WarningsInternalApiTestCase removeAllMethods: 0.
WarningsInternalApiTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningsInternalApiTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warnings_internal_api' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_internal_api.py')
		name: 'warnings_internal_api'.
%

category: 'Grail-Helpers'
method: WarningsInternalApiTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningsInternalApiTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - filter tuple'
method: WarningsInternalApiTestCase
testFilterTupleIsCPythonOrder
	"(action, message, category, module, lineno) -- from filterwarnings and
	from simplefilter alike, and append still puts the filter last."

	self assertAll: #('filter_tuple_is_cpython_order'
		'simplefilter_builds_the_same_shape' 'append_puts_it_last')
%

category: 'Grail-Tests - calling'
method: WarningsInternalApiTestCase
testCallingThroughAVariable
	"The shape every test_warnings call takes: the module in a variable, so
	the call is an attribute load followed by a call rather than a direct
	send."

	self assertAll: #('resetwarnings_through_a_variable'
		'get_filters_through_a_variable')
%

category: 'Grail-Tests - calling'
method: WarningsInternalApiTestCase
testGetFiltersAnswersTheLiveList
	"Not a copy: CPython''s helpers mutate the filter list in place through
	this accessor."

	self assertAll: #('get_filters_answers_the_live_list')
%

category: 'Grail-Tests - surface'
method: WarningsInternalApiTestCase
testEveryInternalNameIsPresentAndOfTheRightKind
	"Callables callable, values readable, classes exposed."

	self assertAll: #('every_callable_present' 'every_value_present'
		'every_class_present' 'callables_are_callable')
%

category: 'Grail-Tests - surface'
method: WarningsInternalApiTestCase
testTheValuesReadCorrectly
	"defaultaction, the filter version, and the two -W option lookups
	delegated to the vendored module."

	self assertAll: #('defaultaction_default' 'filters_version_is_an_int'
		'filters_mutated_is_callable' 'getcategory_resolves_a_name'
		'getaction_expands_an_abbreviation')
%
