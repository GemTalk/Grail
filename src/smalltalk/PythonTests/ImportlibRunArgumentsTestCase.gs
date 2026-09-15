! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibRunArgumentsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibRunArgumentsTestCase'
  instVarNames: #(savedArgv savedRoots scriptPath registrySnapshot)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ImportlibRunArgumentsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportlibRunArgumentsTestCase - runPath:arguments: / runModule:arguments:
! give a program CPython's sys.argv (issue #850).
!
! The script is written to grailTmpDir rather than tests/python, because what is
! under test is a Smalltalk API's effect on sys.argv, not Python conformance --
! and a tests/python fixture asserting its own argv would fail the fixture gate,
! which runs it through the plain runPath: that deliberately leaves argv alone.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportlibRunArgumentsTestCase removeAllMethods: 0.
ImportlibRunArgumentsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportlibRunArgumentsTestCase
setUp
	"Snapshot sys.argv so a test cannot leave the session's argv rewritten, and
	write the one-line script the run methods will execute."

	| lf body |
	savedArgv := (sys @env1:instance) @env0:at: #argv otherwise: nil.
	lf := String with: Character lf.
	body := 'import sys' , lf , 'SEEN = list(sys.argv)' , lf.
	scriptPath := importlib grailTmpDir , '/grail_argv_probe.py'.
	self ___write___: body to: scriptPath.
	"A second copy under a MODULE name, for runModule:arguments:, plus its
	directory on sys.path so the dotted name resolves at all."
	self ___write___: body to: importlib grailTmpDir , '/grail_argv_probe_mod.py'.
	"The temp dir goes on importlib's extraSearchRoots, NOT on sys.path.  Both
	___installScriptDir___: and ___installCwdDir___ REPLACE sys.path[0], and
	this session's sys.path is otherwise empty -- so an appended entry IS index
	0, and runModule: evicted the very directory it then needed.  Measured: the
	test passed alone and failed in the suite until this moved off sys.path."
	savedRoots := importlib @env1:extraSearchRoots.
	importlib @env1:addSearchRoot: importlib grailTmpDir.
	"Every run here loads a module named ``__main__'', which gets a CANONICAL
	registration.  Dropping only the sys.modules key in tearDown then arms the
	par.10.5 guard for the NEXT test -- ``module '__main__' is canonical
	(deployed); it was removed from sys.modules in this session'' -- which is why
	these tests passed alone and errored in the suite."
	self ___forgetCanonicalModule___: '__main__'.
	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
%

category: 'Grail-Setup'
method: ImportlibRunArgumentsTestCase
tearDown
	| mods |
	savedArgv ifNotNil: [:av | (sys @env1:instance) @env0:at: #argv put: av].
	savedRoots ifNotNil: [:r |
		SessionTemps current at: #Grail_importlib_extraRoots put: r].
	savedArgv := nil.
	savedRoots := nil.
	mods := importlib @env1:modules.
	mods removeKey: #'__main__' ifAbsent: [].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___forgetCanonicalModule___: '__main__'.
%


category: 'Grail-Private'
method: ImportlibRunArgumentsTestCase
___write___: aString to: aPath
	| file |
	file := importlib ___openServerFile___: aPath mode: 'w'.
	file nextPutAll: aString.
	file close.
%

category: 'Grail-Private'
method: ImportlibRunArgumentsTestCase
___seenArgv___: aModule
	"The argv the script itself observed, as an Array of Strings."

	| seen out |
	seen := aModule @env1:___pyAttrLoad___: #'SEEN'.
	out := OrderedCollection new.
	seen @env0:do: [:each | out add: each asString].
	^ out asArray
%

category: 'Grail-Tests-RunArguments'
method: ImportlibRunArgumentsTestCase
test_run_path_with_arguments_gives_cpython_argv
	"argv[0] is the script, argv[1:] are its arguments."

	| mod seen |
	mod := importlib runPath: scriptPath arguments: #('alpha' 'beta').
	seen := self ___seenArgv___: mod.
	self assert: seen equals: (Array with: scriptPath with: 'alpha' with: 'beta').
%

category: 'Grail-Tests-RunArguments'
method: ImportlibRunArgumentsTestCase
test_run_path_with_empty_arguments_is_script_only
	"An EMPTY array is not the same as nil: it means ``argv is just the script'',
	which is what a program run with no arguments must see."

	| mod seen |
	mod := importlib runPath: scriptPath arguments: #().
	seen := self ___seenArgv___: mod.
	self assert: seen equals: (Array with: scriptPath).
%

category: 'Grail-Tests-RunArguments'
method: ImportlibRunArgumentsTestCase
test_run_path_without_arguments_leaves_argv_alone
	"The compatibility guarantee: plain runPath: must not touch sys.argv, or
	every existing caller (the SUnit harnesses, install.gs, ./grail) changes
	behaviour underneath itself."

	| before mod seen |
	before := self ___seenArgvOfSession___.
	mod := importlib runPath: scriptPath.
	seen := self ___seenArgv___: mod.
	self assert: seen equals: before
		description: 'plain runPath: rewrote sys.argv'.
%

category: 'Grail-Private'
method: ImportlibRunArgumentsTestCase
___seenArgvOfSession___
	"The session's current sys.argv as an Array of Strings."

	| av out |
	av := (sys @env1:instance) @env0:at: #argv otherwise: nil.
	out := OrderedCollection new.
	av ifNotNil: [:each | each @env0:do: [:s | out add: s asString]].
	^ out asArray
%

category: 'Grail-Tests-RunArguments'
method: ImportlibRunArgumentsTestCase
test_arguments_are_visible_as_strings
	"argparse and friends index and compare these, so they must be str, not
	Symbols -- a Symbol satisfies isinstance(x, str) and then dies on
	x.replace(...)."

	| mod seen |
	mod := importlib runPath: scriptPath arguments: #('--flag' 'value').
	seen := self ___seenArgv___: mod.
	self assert: (seen at: 2) equals: '--flag'.
	self assert: ((seen at: 2) isKindOf: String).
	self deny: ((seen at: 2) isKindOf: Symbol)
		description: 'argv element was a Symbol, which breaks str methods'.
%

category: 'Grail-Tests-RunArguments'
method: ImportlibRunArgumentsTestCase
test_run_module_with_arguments_uses_the_resolved_path
	"CPython's ``-m'' puts the module's RESOLVED FILE PATH in argv[0], not the
	dotted name."

	| mod seen |
	mod := importlib runModule: 'grail_argv_probe_mod' arguments: #('one').
	seen := self ___seenArgv___: mod.
	self assert: seen size equals: 2.
	self assert: ((seen at: 1) indexOfSubCollection: 'grail_argv_probe_mod.py') > 0
		description: 'argv[0] was not the resolved path: ' , (seen at: 1) printString.
	self assert: (seen at: 2) equals: 'one'.
%

category: 'Grail-Tests-RunArguments'
method: ImportlibRunArgumentsTestCase
test_a_bad_module_name_does_not_disturb_argv
	"argv is installed only after the name resolves."

	| before after |
	before := self ___seenArgvOfSession___.
	"AbstractException, not Error: a Grail Python exception raised in env 1 is
	not reliably caught by an ``on: Error'' in an env-0 test method -- the same
	trap importlib's own guarded probes avoid this way.  AlmostOutOfStackError
	is re-passed so this cannot eat the VM's stack warning."
	[importlib runModule: 'grail_no_such_module_at_all' arguments: #('x')]
		on: AbstractException do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: nil].
	after := self ___seenArgvOfSession___.
	self assert: after equals: before
		description: 'a failed runModule: rewrote sys.argv'.
%
