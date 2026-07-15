! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeployCheckTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DeployCheckTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DeployCheckTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DeployCheckTestCase -- gemstone.deploy_check(module), the pre-deploy audit
! (docs/Persistent_Modules_and_Classes.md par.10.4).  Imports two fixtures --
! one holding session-bound resources in module globals (an open socket + a
! threading.Lock over a Semaphore), one fully commit-clean -- and asserts the
! audit flags exactly the session-bound values on the dirty one and nothing on
! the clean one.  The suite never commits, so this exercises the walk itself,
! not the commit path.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DeployCheckTestCase removeAllMethods.
DeployCheckTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
checkModule: shortName
	"Load tests/python/<shortName>.py fresh and return the
	gemstone.deploy_check(...) result (a Python list of findings)."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: shortName @env0:asSymbol ifAbsent: [].
	importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/' @env0:, shortName @env0:, '.py')
		name: shortName.
	^ (gemstone @env1:instance) @env1:deploy_check: shortName
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
findings: shortName includeSubstring: sub
	"True when any deploy_check finding for the module contains sub."

	| r found |
	r := self checkModule: shortName.
	found := false.
	1 @env0:to: (r @env1:__len__) do: [:i |
		((r @env1:__getitem__: i @env0:- 1) @env0:includesString: sub) ifTrue: [found := true]].
	^ found
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testCleanModuleReportsNothing
	"A module whose globals are all committable (ints, lists, dicts,
	functions) audits clean."

	self assert: (self checkModule: 'grail_deploy_clean') @env1:__len__ equals: 0
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testDirtyModuleFlagsSocket
	"An open socket in a module global is flagged (dead after
	commit/logout)."

	self assert: (self findings: 'grail_deploy_dirty' includeSubstring: 'GsSocket')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testDirtyModuleFlagsSemaphore
	"A threading.Lock's Semaphore is flagged (non-persistable -- commit
	would fail 2407)."

	self assert: (self findings: 'grail_deploy_dirty' includeSubstring: 'Semaphore')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testFindingsCarryClassPath
	"Each finding names the reference path from the module down to the
	session-bound object (module class first)."

	self assert: (self findings: 'grail_deploy_dirty'
		includeSubstring: 'Grail_deploy_dirty.')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testUnimportedModuleReported
	"Auditing a module that was never imported returns a single
	explanatory finding rather than raising."

	| r |
	importlib @env1:modules @env0:removeKey: #'no_such_deploy_mod' ifAbsent: [].
	r := (gemstone @env1:instance) @env1:deploy_check: 'no_such_deploy_mod'.
	self assert: r @env1:__len__ equals: 1.
	self assert: ((r @env1:__getitem__: 0) @env0:includesString: 'not imported')
%
