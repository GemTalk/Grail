! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SysPathBootstrapTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SysPathBootstrapTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SysPathBootstrapTestCase comment:
'Tests for the sys.path bootstrap -- how a Grail session decides what is on
sys.path before any Python code runs.

sys.path used to start EMPTY, so ``pip install X; import X'' could not work:
every caller had to write sys.path.append() by hand, which nobody does in
CPython.  It is now populated in CPython''s order from GRAIL-OWNED sources --
the running script''s directory, $PYTHONPATH, an active $VIRTUAL_ENV''s
site-packages, and Grail''s own user site directory -- and the ``site'' module
reports those same directories.

Two properties here are load-bearing and easy to lose:

  * the SCRIPT directory is REPLACED, not appended, on each runPath:.  A
    CPython process runs one script and exits; a Grail session runs hundreds
    (the SUnit shards do), so appending would grow sys.path without bound.
  * sys.path is still searched LAST by ___moduleNameToPath___:, so nothing a
    caller puts there can shadow Grail''s own ``os'' or ``traceback''.  The
    precedence test below asserts both halves of that -- the stdlib wins AND
    sys.path is genuinely consulted -- so a green result cannot come from the
    resolver ignoring sys.path altogether.'
%

expectvalue /Class
doit
SysPathBootstrapTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
SysPathBootstrapTestCase removeAllMethods: 0.
SysPathBootstrapTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: SysPathBootstrapTestCase
sysInstance
	"The session's sys MODULE instance -- the object that holds sys.path.
	``sys'' names the CLASS here, and ``instance'' is an env-1 classmethod."

	^ sys @env1:instance
%

category: 'Grail-helpers'
method: SysPathBootstrapTestCase
sysPath
	"The live sys.path list (an OrderedCollection)."

	^ self sysInstance @env0:at: #path
%

category: 'Grail-helpers'
method: SysPathBootstrapTestCase
withEnv: aName value: aValue do: aBlock
	"Run aBlock with environment variable aName set to aValue, restoring the
	previous value afterwards.

	The EMPTY STRING means unset for every reader in this bootstrap:
	___grailEnvVar___ folds an empty variable to nil deliberately, and GemStone
	has no true unsetenv for a gem (os >> unsetenv falls back to the empty
	string the same way).  So restoring an originally-unset variable to empty
	restores its MEANING, which is what a test needs."

	| prior |
	prior := System gemEnvironmentVariable: aName.
	[System gemEnvironmentVariable: aName put: aValue.
	 aBlock value]
		ensure: [System gemEnvironmentVariable: aName
			put: (prior isNil ifTrue: [''] ifFalse: [prior])]
%

category: 'Grail-helpers'
method: SysPathBootstrapTestCase
withSysPathRestoredDo: aBlock
	"Run aBlock, then put sys.path and the remembered script directory back
	exactly as they were.

	sys.path is SESSION state shared by every test in the shard, so a test that
	appends to it and does not clean up changes what the next test resolves."

	| p saved priorScriptDir |
	p := self sysPath.
	saved := p asArray.
	priorScriptDir := SessionTemps current at: #GrailSysScriptDir otherwise: nil.
	^ [aBlock value] ensure: [
		p size: 0.
		saved do: [:each | p add: each].
		SessionTemps current at: #GrailSysScriptDir put: priorScriptDir]
%

category: 'Grail-helpers'
method: SysPathBootstrapTestCase
ensureFixtureDir: aRelativePath
	"Create $TMP/<aRelativePath> if it is not there, and answer its full path.
	os.makedirs here takes no ``exist_ok'' keyword, hence the isdir guard."

	self eval: ('import os
_d = "$TMP/', aRelativePath, '"
if not os.path.isdir(_d):
    os.makedirs(_d)').
	^ self tmp: aRelativePath
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testEnvVarReadsAnUnsetOrEmptyVariableAsNil
	"An exported-but-EMPTY variable must read as unset -- that is the shape a
	shell leaves behind when a venv is deactivated, and treating it as a real
	value would put a bogus site directory on sys.path.

	Honest about what this can and cannot catch: on GemStone 4.0/Darwin
	``gemEnvironmentVariable:'' answers nil for an empty variable by itself, so
	the empty half passes even with ___grailEnvVar___'s own isEmpty guard
	deleted (measured).  It is asserted anyway because it pins the CONTRACT the
	callers rely on, whichever layer supplies it.  The second half -- a set
	variable reads back -- is the half that fails if the reader breaks."

	| s |
	s := self sysInstance.
	self withEnv: 'GRAIL_TEST_SITE_PROBE' value: '' do: [
		self assert: (s @env1:___grailEnvVar___: 'GRAIL_TEST_SITE_PROBE') isNil].
	self withEnv: 'GRAIL_TEST_SITE_PROBE' value: '/laned/probe' do: [
		self assert: (s @env1:___grailEnvVar___: 'GRAIL_TEST_SITE_PROBE')
			equals: '/laned/probe']
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testUserSiteDirHonoursOverride
	"$GRAIL_SITE_PACKAGES names Grail's user site directory outright."

	| s |
	s := self sysInstance.
	self withEnv: 'GRAIL_SITE_PACKAGES' value: '/laned/override/site-packages' do: [
		self assert: (s @env1:___grailUserSiteDir___)
			equals: '/laned/override/site-packages']
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testUserSiteDirDefaultsUnderHome
	"With no override, Grail's user site is ~/.grail/site-packages -- GRAIL's
	own directory, deliberately NOT the host CPython's user site."

	| s home |
	home := System gemEnvironmentVariable: 'HOME'.
	home isNil ifTrue: [^ self].
	s := self sysInstance.
	self withEnv: 'GRAIL_SITE_PACKAGES' value: '' do: [
		self assert: (s @env1:___grailUserSiteDir___)
			equals: (home , '/.grail/site-packages')]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testPythonPathSplitsOnColonsDroppingEmptiesAndDuplicates
	"$PYTHONPATH is a colon-separated list.  An EMPTY component means the cwd
	in CPython; Grail's resolver skips an empty entry outright, so it is
	dropped rather than carried as a no-op.  A repeated directory is dropped
	too -- sys.path is searched linearly."

	| s |
	s := self sysInstance.
	self withEnv: 'PYTHONPATH' value: '/laned/a::/laned/b:/laned/a' do: [
		self assert: (s @env1:___grailPythonPathDirs___) asArray
			equals: #('/laned/a' '/laned/b')]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testPythonPathIsEmptyWhenUnset
	| s |
	s := self sysInstance.
	self withEnv: 'PYTHONPATH' value: '' do: [
		self assert: (s @env1:___grailPythonPathDirs___) isEmpty]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testVenvSiteDirsDiscoversTheInterpreterVersion
	"A venv's site-packages lives under lib/pythonX.Y, and X.Y belongs to
	whatever python3 built the venv -- Grail has no version of its own to guess
	with, so it LISTS lib/ instead.  The fixture uses a version that exists
	nowhere, which is the point: a guess could not find it."

	| s venv |
	venv := self ensureFixtureDir: 'sysbootvenv/lib/python9.87/site-packages'.
	self withEnv: 'VIRTUAL_ENV' value: (self tmp: 'sysbootvenv') do: [
		s := self sysInstance.
		self assert: (s @env1:___grailVenvSiteDirs___) asArray
			equals: (Array with: venv)]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testVenvSiteDirsEmptyWithoutVirtualEnv
	| s |
	s := self sysInstance.
	self withEnv: 'VIRTUAL_ENV' value: '' do: [
		self assert: (s @env1:___grailVenvSiteDirs___) isEmpty]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testInstallScriptDirPutsTheScriptDirectoryFirst
	"CPython's sys.path[0] is the running script's DIRECTORY -- that is what
	lets ``python3 dir/app.py'' import a helper module sitting beside app.py."

	self withSysPathRestoredDo: [
		importlib @env1:___installScriptDir___: '/laned/scripts/app.py'.
		self assert: (self sysPath at: 1) equals: '/laned/scripts']
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testInstallScriptDirReplacesThePreviousScriptDirectory
	"A CPython process runs ONE script; a Grail session runs many.  So the
	script directory is replaced, not appended -- otherwise a shard that runs
	hundreds of scripts would carry hundreds of stale directories on sys.path,
	each one searched by every later import."

	self withSysPathRestoredDo: [
		importlib @env1:___installScriptDir___: '/laned/one/a.py'.
		importlib @env1:___installScriptDir___: '/laned/two/b.py'.
		self assert: (self sysPath at: 1) equals: '/laned/two'.
		self deny: (self sysPath includes: '/laned/one')]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testInstallScriptDirLeavesAnUnrelatedEntryAlone
	"Replacing the script directory must not disturb anything else a caller
	put on sys.path -- only the entry this method itself installed goes."

	self withSysPathRestoredDo: [
		self sysPath add: '/laned/caller/added'.
		importlib @env1:___installScriptDir___: '/laned/one/a.py'.
		importlib @env1:___installScriptDir___: '/laned/two/b.py'.
		self assert: (self sysPath includes: '/laned/caller/added')]
%

category: 'Grail-Tests - sys.path bootstrap'
method: SysPathBootstrapTestCase
testSysPathIsSearchedAfterTheBundledStdlib
	"The resolver searches grailDir, then the bundled stdlib, then the extra
	roots, and sys.path LAST.  That ordering is deliberate: a directory a
	caller adds must not be able to shadow Grail's own ``quopri''.

	Both halves are asserted.  The second is the positive control: it shows
	sys.path IS consulted, so the first half cannot pass merely because the
	resolver ignored sys.path altogether."

	| shadow stdlibHit shadowOnlyHit |
	shadow := self ensureFixtureDir: 'sysbootshadow'.
	self eval: 'with open("$TMP/sysbootshadow/quopri.py", "w") as _f:
    _f.write("IMPOSTER = True\n")
with open("$TMP/sysbootshadow/lanedshadowonly.py", "w") as _f:
    _f.write("VALUE = 1\n")'.
	self withSysPathRestoredDo: [
		self sysPath add: shadow.
		stdlibHit := importlib @env1:___moduleNameToPath___: 'quopri'.
		shadowOnlyHit := importlib @env1:___moduleNameToPath___: 'lanedshadowonly'].
	self assert: stdlibHit
		equals: (importlib grailDir , '/src/python/stdlib/quopri.py').
	self assert: shadowOnlyHit equals: (shadow , '/lanedshadowonly.py')
%

category: 'Grail-Tests - site module'
method: SysPathBootstrapTestCase
testSiteReportsGrailDirectoriesNotTheHostCPythonOnes
	"site.getusersitepackages() / getsitepackages() answer what SYS computed,
	so there is one source of truth rather than two implementations of the
	same rules -- and, in particular, they never answer the host CPython's
	site-packages."

	| result |
	result := self eval: 'import site, sys
(site.getusersitepackages() == sys.__grail_user_site__
 and site.getsitepackages() == list(sys.__grail_site_packages__)
 and site.ENABLE_USER_SITE == (sys.__grail_user_site__ is not None))'.
	self assert: result
%

category: 'Grail-Tests - site module'
method: SysPathBootstrapTestCase
testSiteUserBaseIsTheParentOfUserSite
	| result |
	result := self eval: 'import site, os
(site.getuserbase() == os.path.dirname(site.getusersitepackages()))'.
	self assert: result
%

category: 'Grail-Tests - site module'
method: SysPathBootstrapTestCase
testSiteAddsitedirAppendsOnceAndTheImportThenResolves
	"addsitedir is the documented way to add a tree by hand.  Idempotence is a
	Grail requirement CPython does not need: a fresh process makes the question
	moot, a long-lived session does not."

	| result |
	self ensureFixtureDir: 'sysbootadded'.
	self eval: 'with open("$TMP/sysbootadded/lanedadded.py", "w") as _f:
    _f.write("VALUE = \"added\"\n")'.
	result := self withSysPathRestoredDo: [
		self eval: 'import site, sys
site.addsitedir("$TMP/sysbootadded")
site.addsitedir("$TMP/sysbootadded")
_n = len([p for p in sys.path if p == "$TMP/sysbootadded"])
_n == 1 and "$TMP/sysbootadded" in sys.path'].
	self assert: result
%
