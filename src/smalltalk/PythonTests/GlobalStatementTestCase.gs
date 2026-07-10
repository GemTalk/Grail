! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobalStatementTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GlobalStatementTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GlobalStatementTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GlobalStatementTestCase — the ``global`` statement.  A name declared global
! inside a function reads and writes the module-level binding instead of being
! a function local.  Realised at parse time (PythonParser parseGlobal +
! popScope).  flask.testing._get_werkzeug_version relies on this.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GlobalStatementTestCase removeAllMethods.
GlobalStatementTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Global'
method: GlobalStatementTestCase
loadFixture
	"Load tests/python/global_statement.py fresh (each load is a new
	module, so module-global state starts from the file's defaults)."

	importlib @env1:modules @env0:removeKey: #'global_statement' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/global_statement.py')
		name: 'global_statement'
%

category: 'Grail-Tests-Global'
method: GlobalStatementTestCase
testGlobalReadModifyWrite
	"``global _counter; _counter += 1`` updates the module global; a
	plain read in another function sees the new value."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:bump equals: 1.
	self assert: mod @env1:bump equals: 2.
	"A function without the global decl still reads the module slot."
	self assert: mod @env1:read_counter equals: 2
%

category: 'Grail-Tests-Global'
method: GlobalStatementTestCase
testGlobalLazyInit
	"The flask lazy-init pattern: read the global, assign it on first
	use.  Without honoring ``global'' this raised UnboundLocalError on
	the read-before-assign."

	self assert: self loadFixture @env1:lazy_init equals: 'computed'
%

category: 'Grail-Tests-Global'
method: GlobalStatementTestCase
testGlobalCreatesModuleBinding
	"``global x; x = ...`` creates a module binding even with no
	module-level assignment to x; another function reads it back."

	| mod |
	mod := self loadFixture.
	mod @env1:make_fresh.
	self assert: mod @env1:read_fresh equals: 99
%

category: 'Grail-Tests - global'
method: GlobalStatementTestCase
testGlobalInNestedDefBypassesOuterLocal
	"``global x'' in a nested def stores the MODULE binding even when
	the enclosing function has a same-named local; the outer local is
	untouched (Python: the declaration binds the name to the module for
	the whole declaring scope)."

	| mod pair |
	mod := self loadFixture.
	pair := mod @env1:shadowed_nested.
	self assert: (pair @env1:__getitem__: 0) equals: 1.
	self assert: (pair @env1:__getitem__: 1) equals: 100.
	self assert: (mod @env1:___pyAttrLoad___: #_counter) equals: 1
%

category: 'Grail-Tests - global'
method: GlobalStatementTestCase
testGlobalStoreInClassMethod
	"``global x; x = ...'' inside a class METHOD routes the store to the
	module singleton (previously a CompileError: the store guard bailed
	on class context and the temp had been stripped by the parser)."

	| mod r |
	mod := self loadFixture.
	mod @env1:shadowed_nested.  "reset _counter to 1"
	r := mod @env1:method_bump.
	self assert: r equals: 51.
	self assert: (mod @env1:___pyAttrLoad___: #_counter) equals: 51
%
