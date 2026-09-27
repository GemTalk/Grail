! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ReprlibConformanceTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ReprlibConformanceTestCase comment:
'The runtime gaps test_reprlib ran into, one check per gap -- see
tests/python/reprlib_conformance.py, whose expected values were produced by
running it under CPython 3.14.6.  Each gap lived far from reprlib:

  array''s type named ``_array'' (array.py); math.log10 from GemStone''s
  inaccurate Float>>log10 (math.gs, libm callout); module repr printing the
  namespace dict (module.gs); ``from a.b import b'' never loading a/b/b.py
  (importlib.gs); a decorated class-body dunder that operator dispatch never
  ran with direct calls off (Object.gs); class-body code reading sibling
  metadata before it was compiled (ClassDefAst.gs); function attributes equal
  but not identical per read (UnboundMethod.gs); ``f = m; m = deco(m)'' binding
  f to the wrapper (ClassDefAst.gs, NameAst.gs); no sys.stdin (sys.gs,
  PyConsoleStream.gs); PEP 695 bounds dropped (PythonParser.gs, ExecBlock.gs).'
%

expectvalue /Class
doit
ReprlibConformanceTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ReprlibConformanceTestCase removeAllMethods: 0.
ReprlibConformanceTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReprlibConformanceTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reprlib_conformance' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reprlib_conformance.py')
		name: 'reprlib_conformance'.
%

category: 'Grail-Helpers'
method: ReprlibConformanceTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ReprlibConformanceTestCase
testValuesAndReprs
	self assertAll: #('array_type_is_named_array' 'log10_is_libm_accurate'
		'module_repr_names_the_module' 'sys_stdin_is_the_console_text_stream')
%

category: 'Grail-Tests'
method: ReprlibConformanceTestCase
testImportOfASameNamedSubmodule
	self assertAll: #('from_a_b_import_b_loads_the_submodule')
%

category: 'Grail-Tests'
method: ReprlibConformanceTestCase
testClassBodySemantics
	self assertAll: #('a_decorated_dunder_is_what_repr_runs'
		'class_body_code_sees_sibling_metadata'
		'an_alias_keeps_the_def_a_later_line_rebinds')
%

category: 'Grail-Tests'
method: ReprlibConformanceTestCase
testTypeParameterBounds
	self assertAll: #('pep695_bounds_and_constraints')
%
