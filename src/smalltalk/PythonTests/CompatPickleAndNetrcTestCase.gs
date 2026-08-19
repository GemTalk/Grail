! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition
expectvalue /Class
doit
PythonTestCase subclass: 'CompatPickleAndNetrcTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CompatPickleAndNetrcTestCase comment:
'Two small stdlib modules Grail was missing, and what they buy.

``_compat_pickle'' is pure data: the four tables pickle uses to rewrite names
across the Python 2/3 boundary when fix_imports is on (protocols 0-2).
pickle.py carried a TWO-ENTRY subset of them inline -- exactly the entries its
own reductions happened to reach -- with a comment naming the module as where
CPython keeps the real thing.  It is now vendored and wired in, so about 300
mappings replace those two.

The pickle half is the part worth guarding, because fix_imports is SILENT when
it is wrong: a name that fails to map does not raise, it just pickles under a
name the other side cannot find, and only a cross-version load ever notices.

``netrc'' parses ~/.netrc.  Nothing inside Grail needed it; test.test_netrc did,
and could not import at all -- it now runs 23 tests.

See tests/python/compat_pickle_and_netrc.py.'
%

expectvalue /Class
doit
CompatPickleAndNetrcTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CompatPickleAndNetrcTestCase removeAllMethods: 0.
CompatPickleAndNetrcTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CompatPickleAndNetrcTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compat_pickle_and_netrc' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compat_pickle_and_netrc.py')
		name: 'compat_pickle_and_netrc'.
%

category: 'Grail-Helpers'
method: CompatPickleAndNetrcTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CompatPickleAndNetrcTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - _compat_pickle'
method: CompatPickleAndNetrcTestCase
testTheFourTablesMapBothWays
	"Module names and (module, name) pairs, Python 2 to 3 and back."

	self assertAll: #('import_mapping_py2_to_py3'
		'reverse_import_mapping_py3_to_py2' 'name_mapping_py2_to_py3'
		'reverse_name_mapping_py3_to_py2')
%

category: 'Grail-Tests - _compat_pickle'
method: CompatPickleAndNetrcTestCase
testTheTablesAreTheFullOnes
	"Not the two-entry subset: entries Grail''s own reductions never reach can
	only come from the vendored module."

	self assertAll: #('tables_are_the_full_ones' 'queue_module_maps'
		'copyreg_module_maps')
%

category: 'Grail-Tests - fix_imports'
method: CompatPickleAndNetrcTestCase
testRangePicklesAsXrangeAtProtocolTwo
	"The canonical case, both directions -- and it must come back as range."

	self assertAll: #('range_pickles_as_xrange'
		'range_pickles_under_builtin_module' 'xrange_loads_back_as_range')
%

category: 'Grail-Tests - fix_imports'
method: CompatPickleAndNetrcTestCase
testOrdinaryPicklingIsUnaffected
	"Rewriting names must not disturb ordinary data, and protocol 4 must not
	rewrite at all -- fix_imports applies to 0-2 only."

	self assertAll: #('ordinary_roundtrip_p2'
		'ordinary_roundtrip_default_protocol' 'protocol_4_keeps_builtins')
%

category: 'Grail-Tests - netrc'
method: CompatPickleAndNetrcTestCase
testNetrcParsesAndLooksUp
	"Two machines, the default fallback, and the host list -- in which
	``default'' is an entry like any other."

	self assertAll: #('netrc_finds_a_machine' 'netrc_finds_the_second_machine'
		'netrc_falls_back_to_default' 'netrc_lists_its_hosts')
%
