! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningFilterOrderTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningFilterOrderTestCase comment:
'The filter decides BEFORE the recorder sees a warning.

catch_warnings(record=True) does not capture everything that is warned -- it
captures what the filters decided to SHOW.  In CPython the recorder replaces
showwarning, which sits at the END of the pipeline, so a warning the filters
suppressed never reaches it.

Grail recorded FIRST and filtered afterwards, so recording was filter-blind:
simplefilter(''ignore'') still captured one, and ''once'' captured every
repeat.  The order is the semantics, not a detail of the implementation, and
six tests in test_warnings were failing on it.

assertWarns is why this could not simply be reordered.  CPython''s installs its
own filter -- resetwarnings() then simplefilter("always") -- so the assertion
is about whether the code warns at all, not about whatever filters happen to be
installed.  Grail''s did not, which did not matter while the recorder ran ahead
of the filters; with the order corrected, an assertWarns under an ''ignore''
filter would have recorded nothing and failed for the wrong reason.  It now
installs and restores that filter, along with the dedupe table, because
resetwarnings() clears both.

Two smaller fixes came out of the same reading: ''all'' is 3.14''s alias for
''always'' and was falling through to the deduping branch, losing every repeat
after the first; and the no-filter-matched fallback was hardcoded to
''default'' rather than reading the module''s ``defaultaction'', so assigning
that had no effect on anything.

DOCUMENTED DIFFERENCE: CPython''s ''default'' dedupes on (message, category,
LINE); Grail''s key has no line.  The line IS available -- warning records
carry it -- but only on the recording path, where the raise that gets the live
frame is affordable.  Dedupe runs on the ordinary warn path, which must not pay
a raise per call.  The fixture asserts Grail''s answer as an XFAIL rather than
leaving the difference implicit.

See tests/python/warning_filter_order.py.'
%

expectvalue /Class
doit
WarningFilterOrderTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningFilterOrderTestCase removeAllMethods: 0.
WarningFilterOrderTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningFilterOrderTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warning_filter_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_filter_order.py')
		name: 'warning_filter_order'.
%

category: 'Grail-Helpers'
method: WarningFilterOrderTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningFilterOrderTestCase
assertAll: keys
	"Assert every named check passed, naming the failing one AND what it saw.

	``false is not equal to true'' is not enough to act on when the failure
	only happens somewhere you cannot reproduce -- these counts depend on the
	call site each warn() resolves to, and the useful question is which count
	came back, not merely that one did."

	keys do: [:each |
		| v |
		v := self resultAt: each.
		self
			assert: v == true
			description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the filter decides'
method: WarningFilterOrderTestCase
testAnIgnoreFilterRecordsNothing
	"The headline case: recording used to be filter-blind."

	self assertAll: #('ignore_records_nothing')
%

category: 'Grail-Tests - the filter decides'
method: WarningFilterOrderTestCase
testAlwaysAndItsAlias
	"``all'' is 3.14''s alias for ``always'' -- unrecognised, it fell through
	to the deduping branch and lost every repeat after the first."

	self assertAll: #('always_records_every_one' 'all_is_an_alias_for_always')
%

category: 'Grail-Tests - the filter decides'
method: WarningFilterOrderTestCase
testDedupingActions
	"``once'' dedupes on the message alone, so the repeat is dropped wherever
	it was written; ``default'' dedupes per CALL SITE, so two lines warn
	twice.

	The second was a documented Grail difference -- the key carried no line
	number, which collapsed ``default'' into ``once'' -- on the grounds that
	reaching the live frame costs a raise on every warn().  It does not: the
	cost lands past the filters, on a warning that is going somewhere anyway."

	self assertAll: #('once_dedupes_on_the_message'
		'default_dedupes_per_call_site')
%

category: 'Grail-Tests - the filter decides'
method: WarningFilterOrderTestCase
testErrorRaisesEvenWhileRecording
	"The filter runs first, so there is nothing left to record."

	self assertAll: #('error_raises_even_while_recording')
%

category: 'Grail-Tests - the filter decides'
method: WarningFilterOrderTestCase
testAScopedFilterSuppressesOnlyItsCategory
	self assertAll: #('a_scoped_filter_suppresses_only_its_category')
%

category: 'Grail-Tests - assertWarns'
method: WarningFilterOrderTestCase
testAssertWarnsIsImmuneToTheAmbientFilter
	"It installs its own ``always'', as CPython''s does, and puts the ambient
	filters AND the dedupe table back on the way out -- resetwarnings()
	clears both."

	self assertAll: #('assert_warns_ignores_the_ambient_filter'
		'assert_warns_restores_the_ambient_filters')
%

category: 'Grail-Tests - unchanged'
method: WarningFilterOrderTestCase
testARecordStillCarriesMessageAndCategory
	self assertAll: #('a_warning_still_carries_its_message'
		'a_warning_still_carries_its_category')
%
