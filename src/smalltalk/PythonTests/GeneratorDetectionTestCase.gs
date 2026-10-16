! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorDetectionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorDetectionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GeneratorDetectionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorDetectionTestCase -- which functions a yield makes generators.
!
! A yield in a nested def's or lambda's default value or decorator belongs to
! the ENCLOSING function, which those are evaluated in.  Grail skipped the
! nested node wholesale, so ``def f(): lambda x=(yield): 1'' compiled as an
! ordinary function whose yield named an unbound ___gen___ (a Smalltalk
! CompileError).  Also ``'yield from' outside function'', which Grail spelled
! ``'yield' outside function''.
!
! Fixture: tests/python/generator_detection.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorDetectionTestCase removeAllMethods.
GeneratorDetectionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Generators'
method: GeneratorDetectionTestCase
testAYieldInADefaultOrDecoratorMakesTheEnclosingFunctionAGenerator
	"tests/python/generator_detection.py: a yield in a lambda's positional or
	keyword-only default, in a nested def's default or decorator, and in a
	comprehension's outermost iterable makes the enclosing function a
	generator, and one in a lambda's body does not -- checked on a module and
	again through exec(), which compiles on Grail's other path -- plus the
	``outside function'' messages.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_detection' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_detection.py')
		name: 'generator_detection'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'
%
