! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecZeroArgSuperTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecZeroArgSuperTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecZeroArgSuperTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecZeroArgSuperTestCase - super() and __class__ in an exec'd class
! ===============================================================================
! CallAst rewrites a zero-argument ``super()'' into a proxy bound to the
! method's class, and reached that class through the module it belongs to.  An
! exec'd source compiles with no module, so the rewrite stood down and every
! super() there reached the run-time ``super(): no arguments''; a bare
! ``__class__'' raised NameError.  The class is now reached through its cell,
! as a method-local class's already was.  pytest imports test modules and
! conftests through exec, so each test or conftest class calling super() failed
! -- 1,508 of pygments' collection errors.  tests/python/exec_zero_arg_super.py
! holds the checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecZeroArgSuperTestCase removeAllMethods.
ExecZeroArgSuperTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecZeroArgSuperTestCase
setUp

	importlib @env1:modules removeKey: #'exec_zero_arg_super' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_zero_arg_super.py')
		name: 'exec_zero_arg_super'
%

category: 'Grail-Helpers'
method: ExecZeroArgSuperTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ExecZeroArgSuperTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - exec'
method: ExecZeroArgSuperTestCase
testSuperAndClassInExecdSourceText

	self assertAll: #('exec_of_source_text')
%

category: 'Grail-Tests - exec'
method: ExecZeroArgSuperTestCase
testSuperAndClassInAnExecdTree
	"pytest's case: the module's asserts were rewritten, so it is compiled from
	a tree and exec'd."

	self assertAll: #('exec_of_a_parsed_tree')
%

category: 'Grail-Tests - exec'
method: ExecZeroArgSuperTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 2
%
