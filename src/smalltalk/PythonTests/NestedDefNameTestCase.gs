! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedDefNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedDefNameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NestedDefNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedDefNameTestCase — a nested ``def`` compiles to a bare ExecBlock with no
! lexical name.  FunctionDefAst stamps the def name via ``___pyNamed___:`` and
! ExecBlock exposes ``__name__`` / ``__qualname__`` as value attributes, so
! ``func.__name__`` returns the real name.  flask's ``@app.route`` keys
! ``view_functions`` by ``view_func.__name__``.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedDefNameTestCase removeAllMethods.
NestedDefNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-NestedDefName'
method: NestedDefNameTestCase
loadFixture
	"Load tests/python/nested_def_name.py fresh."

	importlib @env1:modules @env0:removeKey: #'nested_def_name' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/nested_def_name.py')
		name: 'nested_def_name'
%

category: 'Grail-Tests-NestedDefName'
method: NestedDefNameTestCase
testNestedName
	"``make_nested().__name__`` returns the def's lexical name."

	self assert: (self loadFixture @env1:nested_name) equals: 'hello'
%

category: 'Grail-Tests-NestedDefName'
method: NestedDefNameTestCase
testNestedQualname
	"``__qualname__`` mirrors ``__name__`` for a Grail closure."

	self assert: (self loadFixture @env1:nested_qualname) equals: 'hello'
%

category: 'Grail-Tests-NestedDefName'
method: NestedDefNameTestCase
testNameSurvivesAssignment
	"The stamped name rides along through a plain rebinding."

	self assert: (self loadFixture @env1:name_survives_assignment) equals: 'hello'
%
