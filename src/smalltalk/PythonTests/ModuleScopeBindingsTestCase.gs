! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleScopeBindingsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleScopeBindingsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleScopeBindingsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleScopeBindingsTestCase
!
! Regression for module-scope ``except X as e'' and ``with M as w''
! binding.  At module top level these as-targets must bind module
! variables (routed through ``self dynamicInstVarAt: #name put: ...'')
! rather than emitting a bare ``name := ...'' that references an
! undeclared Smalltalk temp.  Before the fix the module failed to
! COMPILE ("undefined symbol e/w"); this blocked compiling regular
! Python (e.g. numpy/__init__.py).  Function-scope except-as/with-as
! must still compile to ordinary enclosing-scope temps.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleScopeBindingsTestCase removeAllMethods.
ModuleScopeBindingsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleScopeBindingsTestCase
setUp
	"Load tests/python/module_scope_bindings.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'module_scope_bindings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_scope_bindings.py')
		name: 'module_scope_bindings'.
%

category: 'Grail-Tests'
method: ModuleScopeBindingsTestCase
testModuleScopeExceptAsBindsModuleVariable
	"``except ValueError as e'' at module top level: the value captured
	from e inside the handler is readable as a module variable."

	self assert: (testModule @env1:___pyAttrLoad___: #'except_msg') equals: 'boom'.
	self assert: (testModule @env1:___pyAttrLoad___: #'except_repr_len') equals: 4.
%

category: 'Grail-Tests'
method: ModuleScopeBindingsTestCase
testModuleScopeWithAsBindsModuleVariable
	"``with mgr as w'' at module top level: w binds the value from
	__enter__, is readable inside the block, survives as a module
	variable after the block, and __exit__ ran."

	self assert: (testModule @env1:___pyAttrLoad___: #'with_read') equals: 'hello'.
	self assert: (testModule @env1:___pyAttrLoad___: #'w') equals: 'hello'.
	self assert: (testModule @env1:___pyAttrLoad___: #'with_exited') equals: true.
%

category: 'Grail-Tests'
method: ModuleScopeBindingsTestCase
testFunctionScopeExceptAsStillWorks
	"``except ValueError as fe'' inside a function still compiles to a
	bare enclosing-scope temp and binds correctly."

	self assert: (testModule @env1:___pyAttrLoad___: #'fn_except_result') equals: 'k'.
%

category: 'Grail-Tests'
method: ModuleScopeBindingsTestCase
testFunctionScopeWithAsStillWorks
	"``with m as fw'' inside a function still compiles to a bare
	enclosing-scope temp and binds correctly."

	self assert: (testModule @env1:___pyAttrLoad___: #'fn_with_result') equals: 'inner'.
%
