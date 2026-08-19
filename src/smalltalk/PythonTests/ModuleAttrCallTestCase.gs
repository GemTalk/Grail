! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleAttrCallTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ModuleAttrCallTestCase comment:
'Calling a module attribute works whichever module the name resolves to.

``mod.name(...)'' is COMPILED once and RESOLVED at run time, and the two need
not agree.  test.test_warnings swaps sys.modules[''warnings''] to drive both
warnings implementations through the same unittest code, so a call written
against Grail''s Smalltalk warnings can land on the vendored _py_warnings,
where the same name is a CLASS attribute rather than a module method.

Grail emitted a compile-time fast path for that call -- a ``_name:kw:'' send to
the module -- which only exists on a module that IMPLEMENTS it.  On the swapped
module the send raised MessageNotUnderstood.  unittest''s assertWarns was
written that way, so every DeprecatedTests case died in setUp: 14 identical
errors that masked whatever those tests were actually checking.

module >> doesNotUnderstand: now falls back to what Python does anyway -- read
the attribute, call it -- for exactly the two-argument shape the fast path
emits, and only when the attribute exists, so a genuine typo still reaches the
usual error.

That unblocked the other half: _AssertWarnsContext now drives the PUBLIC
catch_warnings(record=True) rather than Grail''s private _grail_* recording
protocol, which the swapped module does not have.  It is also CPython''s own
implementation, and it restores the filter list and the dedupe table for free.

Measured against main: test_warnings 79 -> 71 fail+err.

See tests/python/module_attr_call.py.'
%

expectvalue /Class
doit
ModuleAttrCallTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ModuleAttrCallTestCase removeAllMethods: 0.
ModuleAttrCallTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleAttrCallTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_attr_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_call.py')
		name: 'module_attr_call'.
%

category: 'Grail-Helpers'
method: ModuleAttrCallTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ModuleAttrCallTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests'
method: ModuleAttrCallTestCase
testAKeywordCallOnASwappedModule
	"The case that broke: the name was compiled against one module and
	resolves to another, where it is a class attribute."

	self assertAll: #('the_swap_takes_effect'
		'keyword_call_on_a_swapped_module' 'the_original_still_resolves')
%

category: 'Grail-Tests'
method: ModuleAttrCallTestCase
testOrdinaryModuleCallsAreUnaffected
	"Positional, keyword and zero-argument module calls all still take the
	fast path -- the fallback only runs when that path misses."

	self assertAll: #('positional_module_call' 'zero_argument_module_call')
%

category: 'Grail-Tests'
method: ModuleAttrCallTestCase
testAMissingNameStillRaises
	"The fallback must not swallow a typo."

	self assertAll: #('a_missing_name_still_raises')
%

category: 'Grail-Tests'
method: ModuleAttrCallTestCase
testAssertWarnsStillWorks
	"It now drives the public catch_warnings(record=True) instead of Grail''s
	private recording protocol."

	self assertAll: #('assert_warns_with_the_native_module')
%
