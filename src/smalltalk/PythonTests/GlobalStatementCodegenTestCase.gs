! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobalStatementCodegenTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GlobalStatementCodegenTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GlobalStatementCodegenTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GlobalStatementCodegenTestCase
!
! Regression: ``GlobalAst >> printSmalltalkOn:'' previously did a
! ``self halt'' that aborted codegen for any function body with a
! ``global'' declaration.  Werkzeug, jinja2, and many CPython sources
! use ``global'' for lazy module-level state caches.  The codegen now
! emits nothing for ``global'' (it's a parser-time declaration, not a
! runtime statement) so modules compile and import cleanly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GlobalStatementCodegenTestCase removeAllMethods.
GlobalStatementCodegenTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: GlobalStatementCodegenTestCase
setUp
	"Load tests/python/global_statement_codegen.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'global_statement_codegen' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/global_statement_codegen.py')
		name: 'global_statement_codegen'.
%

category: 'Grail-Tests'
method: GlobalStatementCodegenTestCase
testModuleImportsCleanly
	"The module loads without raising at codegen time."

	self
		assert: (testModule @env1:___pyAttrLoad___: #compiles)
		equals: true.
%
