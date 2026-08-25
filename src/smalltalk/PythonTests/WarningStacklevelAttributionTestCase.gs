! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningStacklevelAttributionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningStacklevelAttributionTestCase comment:
'Which frame a warning BLAMES: overrun, imports, and skip_file_prefixes.

RUNNING OFF THE TOP IS ``<sys>``, line 0 (measured; the first cut assumed 1).
Grail kept the OUTERMOST frame instead, blaming an arbitrary caller, and its
no-frame case reported a private ``<unknown>''/0 spelling.

A MODULE BODY IS A FRAME.  ``warnings.warn(..., stacklevel=2)'' at module
level during an import must blame the IMPORTER (issue #24305).  Module-init
codegen emits no position markers, so the generated-Python probe honestly
said ``not Python'' and the live walk dropped the frame entirely -- the real
origin of ``module-level code has no Python frame''.  The walk now
recognises a module init by what it IS (a module instance''s #initialize)
rather than by the marker it lacks, and names it ``<module>'' as CPython
does, line 0.

A LIBRARY CAN REFUSE THE BLAME.  skip_file_prefixes (3.12) makes each hop
land on the next frame whose filename does not start with a prefix, and
forces stacklevel to at least 2.  The subtlety: CPython takes the starting
frame AS IT COMES and lets the first hop advance past it -- a separate
pre-skip double-counts and lands one frame too far out, measured as
unittest/__init__.py where the test file was expected.

Also: _deprecated''s _version keyword, with the alpha clause -- RuntimeError
when _version[:2] > remove, or equal with the release level past alpha.

See tests/python/warning_stacklevel_attribution.py and its helpers under
tests/python/stacklevel_helpers/.'
%

expectvalue /Class
doit
WarningStacklevelAttributionTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningStacklevelAttributionTestCase removeAllMethods: 0.
WarningStacklevelAttributionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningStacklevelAttributionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	#(#'warning_stacklevel_attribution' #'stacklevel_helpers.mod_warns'
	  #'stacklevel_helpers.chain_probe' #'stacklevel_helpers.skip_pkg.api')
		do: [:m | mods removeKey: m ifAbsent: []].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warning_stacklevel_attribution.py')
		name: 'warning_stacklevel_attribution'.
%

category: 'Grail-Helpers'
method: WarningStacklevelAttributionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningStacklevelAttributionTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - overrun'
method: WarningStacklevelAttributionTestCase
testOverrunReportsSys
	self assertAll: #('overrun_reports_sys_line_0')
%

category: 'Grail-Tests - the module frame'
method: WarningStacklevelAttributionTestCase
testAModuleLevelWarningBlamesTheImporter
	"issue #24305 -- and the frame Grail used to drop entirely."

	self assertAll: #('a_module_level_warning_blames_the_importer'
		'the_module_body_has_a_frame')
%

category: 'Grail-Tests - skip_file_prefixes'
method: WarningStacklevelAttributionTestCase
testALibraryCanRefuseTheBlame
	self assertAll: #('skip_file_prefixes_blames_the_caller'
		'a_low_stacklevel_is_forced_to_two' 'prefixes_must_be_a_tuple_of_str')
%

category: 'Grail-Tests - _deprecated versions'
method: WarningStacklevelAttributionTestCase
testTheVersionKeywordDrivesTheRemovalRule
	"Synthetic versions, every branch -- including the alpha clause."

	self assertAll: #('a_future_removal_warns' 'a_far_future_removal_warns'
		'a_past_removal_raises' 'the_same_final_version_raises'
		'the_same_alpha_version_still_warns')
%
