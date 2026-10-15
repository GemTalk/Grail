! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorExceptionContextTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorExceptionContextTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GeneratorExceptionContextTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorExceptionContextTestCase -- the handled exception a generator body
! sees, and the __context__ that throw() gives what it injects.
!
! CPython stacks each generator's own handled-exception slot on its resumer's
! while the body runs.  Grail kept one session slot and restored the body's own
! value on every resume, so a body resumed from inside an ``except'' saw
! nothing.  throw() set no context at all, and called a thrown class in the
! caller rather than at the injection point.
!
! Fixture: tests/python/generator_exception_context.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorExceptionContextTestCase removeAllMethods.
GeneratorExceptionContextTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Generators'
method: GeneratorExceptionContextTestCase
testGeneratorExceptionStateMatchesCPython
	"tests/python/generator_exception_context.py: sys.exception() in a body
	resumed from inside a handler, after the body's own handler ends, and across
	later resumes; the context throw() sets (the body's own handled exception,
	never the caller's) for a class, an instance, through ``yield from'' and on
	an unstarted generator; and a thrown class whose __new__ answers a
	non-exception.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_exception_context' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_exception_context.py')
		name: 'generator_exception_context'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'
%
