! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecBareEvalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecBareEvalTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecBareEvalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecBareEvalTestCase - a bare eval() / exec() in exec'd source
! ===============================================================================
! A bare one-argument eval() / exec() in a function is compiled so the evaluated
! code sees the function's locals and the globals, and the globals were named
! through the module the code belongs to.  An exec'd source has no module: in a
! class method the compile died with an uncatchable UndefinedObject does not
! understand #name'' (pytest's and pyparsing's own suites stopped there), and in
! a plain function the evaluated code could not see the exec's globals.  Both
! now name the doit's globals.  tests/python/exec_bare_eval.py holds the checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecBareEvalTestCase removeAllMethods.
ExecBareEvalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecBareEvalTestCase
setUp

	importlib @env1:modules removeKey: #'exec_bare_eval' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_bare_eval.py')
		name: 'exec_bare_eval'
%

category: 'Grail-Helpers'
method: ExecBareEvalTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ExecBareEvalTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - exec'
method: ExecBareEvalTestCase
testBareEvalAndExecInExecdSource

	self assertAll: #('exec_of_source_text' 'exec_of_a_parsed_tree')
%

category: 'Grail-Tests - exec'
method: ExecBareEvalTestCase
testTheModuleCaseIsUnchanged

	self assertAll: #('the_same_in_a_module')
%

category: 'Grail-Tests - exec'
method: ExecBareEvalTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 3
%
