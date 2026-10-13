! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorThrowTracebackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorThrowTracebackTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GeneratorThrowTracebackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorThrowTracebackTestCase - gen.throw() keeps the chain it is given
! ===============================================================================
! An exception thrown into a generator keeps the frames it arrived with, and
! each function it unwinds through from the yield is added on top.  Grail
! rebuilt the chain at the next catch from the stack captured at the first
! raise -- on the consumer's process, not the generator's -- so a ``with''
! inside the generator dropped everything below a re-raise, and pytest's report
! of a failing test lost the test (#1539).
!
! The same path needed ``e.__traceback__ = tb'' to store the real slot (it made
! a shadowing attribute) and contextlib's __exit__ to restore the traceback the
! with statement passed it, as CPython's does.
! tests/python/generator_throw_traceback.py holds the 12 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorThrowTracebackTestCase removeAllMethods.
GeneratorThrowTracebackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: GeneratorThrowTracebackTestCase
setUp

	importlib @env1:modules removeKey: #'generator_throw_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_throw_traceback.py')
		name: 'generator_throw_traceback'
%

category: 'Grail-Helpers'
method: GeneratorThrowTracebackTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: GeneratorThrowTracebackTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - throw'
method: GeneratorThrowTracebackTestCase
testThrowAddsFramesOnTopOfTheChain

	self assertAll: #('throw_prepends_the_generator_and_the_caller'
		'throw_keeps_a_reraised_chain'
		'a_catch_inside_the_generator_sees_its_own_frame')
%

category: 'Grail-Tests - throw'
method: GeneratorThrowTracebackTestCase
testAWithInTheGeneratorKeepsTheChain

	self assertAll: #('a_with_in_the_generator_keeps_the_chain'
		'a_with_in_the_generator_keeps_a_reraised_chain'
		'a_contextmanager_in_the_generator_keeps_the_chain'
		'a_contextmanager_in_the_generator_keeps_a_reraised_chain')
%

category: 'Grail-Tests - __traceback__'
method: GeneratorThrowTracebackTestCase
testAssigningTheTracebackSetsTheSlot

	self assertAll: #('assignment_is_the_slot'
		'assignment_then_a_bare_raise_adds_nothing'
		'assignment_then_raise_e_adds_its_frame'
		'assigning_a_non_traceback_is_refused'
		'deleting_it_is_refused')
%

category: 'Grail-Tests - throw'
method: GeneratorThrowTracebackTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12
%
