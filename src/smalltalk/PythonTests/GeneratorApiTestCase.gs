! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorApiTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorApiTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GeneratorApiTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorApiTestCase -- the deprecated throw(type, value, tb) arguments, a
! generator's __name__ / __qualname__ setters, and a generator expression's
! single __iter__ call, each as CPython 3.14 has them.
!
! Fixture: tests/python/generator_api.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorApiTestCase removeAllMethods.
GeneratorApiTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Generators'
method: GeneratorApiTestCase
testGeneratorApiMatchesCPython
	"tests/python/generator_api.py:
	 * throw(type, value, tb) normalises as _gen_throw does, and the generator
	   survives every refusal;
	 * __name__ / __qualname__ take only a string and refuse deletion, on a
	   generator and a coroutine;
	 * a genexpr, listcomp, setcomp and nested genexpr each call __iter__ once
	   per iterable, on a module and through exec(), and an async genexpr
	   iterates a sync first clause once, at creation.
	One gap, a generator not picking up its function's later renaming, is
	pinned in the fixture's KNOWN_DIVERGENCES."

	| fixture |
	importlib @env1:modules removeKey: #'generator_api' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_api.py')
		name: 'generator_api'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '28 checks, 0 disagreeing [], keys match: True'
%

category: 'Grail-Tests-Generators'
method: GeneratorApiTestCase
testGeneratorIntrospectionMatchesCPython
	"tests/python/generator_introspection.py: dir() of a generator lists no
	``withBlock''; type(gi_frame) is ``frame'' in builtins; every gi_ / cr_ /
	ag_ attribute refuses a set and a delete with CPython's message;
	__next__ / __iter__ carry CPython's docstrings, and test.support has
	HAVE_DOCSTRINGS (test_generators' email doctest)."

	| fixture |
	importlib @env1:modules removeKey: #'generator_introspection' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_introspection.py')
		name: 'generator_introspection'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'
%
