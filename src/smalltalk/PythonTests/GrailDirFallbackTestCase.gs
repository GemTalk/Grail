! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GrailDirFallbackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GrailDirFallbackTestCase'
  instVarNames: #('savedGrailDir' 'hadGrailDir')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GrailDirFallbackTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
GrailDirFallbackTestCase removeAllMethods: 0.
GrailDirFallbackTestCase class removeAllMethods: 0.
%

! ===============================================================================
! GrailDirFallbackTestCase -- ``importlib grailDir'' must resolve itself.
!
! It is SESSION-LOCAL (SessionTemps at: #GrailDir) and used to answer nil when
! no runner script had set it.  ___moduleNameToPath___: bails on nil BEFORE
! touching the filesystem, so in a bare topaz login EVERY .py-backed module
! raised ``No module named X'' while the Smalltalk-implemented ones (os, sys,
! ...) kept working.  ``PythonTestCase suite run'' therefore died on the
! `import shutil' in ShutilTestCase>>setUp, one line after an `import os' that
! succeeded -- reported as a missing stdlib module rather than an unconfigured
! session.
!
! Each test clears the SessionTemps key to reproduce that session and restores
! it in tearDown.  Restoring matters: everything after this class in the shard
! shares the session.
! ===============================================================================

set compile_env: 0

category: 'Grail-helpers'
method: GrailDirFallbackTestCase
setUp
	"Remember the session's grailDir (and whether it had one at all) so
	tearDown can put it back exactly, nil included."

	super setUp.
	hadGrailDir := SessionTemps current includesKey: #GrailDir.
	savedGrailDir := SessionTemps current at: #GrailDir otherwise: nil
%

category: 'Grail-helpers'
method: GrailDirFallbackTestCase
tearDown
	"Restore the session's grailDir.  A test that leaves it pointing
	somewhere else would break every later fixture in this shard."

	hadGrailDir
		ifTrue: [SessionTemps current at: #GrailDir put: savedGrailDir]
		ifFalse: [SessionTemps current removeKey: #GrailDir ifAbsent: []].
	super tearDown
%

category: 'Grail-helpers'
method: GrailDirFallbackTestCase
clearSessionGrailDir
	"Put the session back into the state a fresh topaz login is in."

	SessionTemps current removeKey: #GrailDir ifAbsent: []
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testResolvesWithNoSessionValue
	"THE REGRESSION: with nothing in SessionTemps this answered nil."

	| resolved |
	self clearSessionGrailDir.
	resolved := importlib grailDir.
	self deny: resolved isNil
		description: 'grailDir must resolve itself when no session set it'.
	self assert: (importlib ___looksLikeGrailDir___: resolved)
		description: 'resolved grailDir must hold src/python/stdlib, got '
			, resolved printString
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testResolutionIsMemoised
	"The probing is filesystem work; it must happen at most once per
	session, and the answer must not drift between reads."

	| first |
	self clearSessionGrailDir.
	first := importlib grailDir.
	self assert: (SessionTemps current includesKey: #GrailDir)
		description: 'a resolved grailDir must be cached in SessionTemps'.
	self assert: (SessionTemps current at: #GrailDir otherwise: nil) = first.
	self assert: importlib grailDir = first
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testExplicitSetStillWins
	"Every runner script sets grailDir: explicitly.  The lazy fallback must
	never override that -- including a deliberately odd value."

	importlib grailDir: '/nonexistent/grail/checkout'.
	self assert: importlib grailDir = '/nonexistent/grail/checkout'
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testLooksLikeGrailDirRejectsNonCheckout
	"The validator is what lets a correct CWD outrank a stale GRAIL_DIR, so
	it has to actually discriminate -- and tolerate nil."

	self deny: (importlib ___looksLikeGrailDir___: nil).
	self deny: (importlib ___looksLikeGrailDir___: '/tmp').
	self deny: (importlib ___looksLikeGrailDir___: '/nonexistent/grail/checkout')
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testPyBackedModuleResolvesWithNoSessionValue
	"The end-to-end point: a .py-backed module must be FINDABLE in a session
	that never set grailDir.  shutil is the module the original report died
	on; os is Smalltalk-implemented, which is why it kept working and made
	the failure look module-specific."

	| path |
	self clearSessionGrailDir.
	path := importlib @env1:___moduleNameToPath___: 'shutil'.
	self deny: path isNil
		description: 'shutil.py must resolve with no session grailDir'.
	self assert: (GsFile existsOnServer: path) == true
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testMisconfiguredDirGetsAConfigurationHint
	"When grailDir cannot satisfy ANY .py import, ``No module named X'' is
	actively misleading -- it blames whichever module was imported first.
	The message must say so instead."

	| msg |
	importlib grailDir: '/nonexistent/grail/checkout'.
	msg := importlib ___moduleNotFoundMessage___: 'shutil'.
	self assert: (msg includesString: 'No module named ''shutil''')
		description: 'the CPython wording must still lead the message'.
	self assert: (msg includesString: 'src/python/stdlib')
		description: 'a misconfigured session must be told what is wrong: ' , msg.
	self assert: (msg includesString: 'grailDir:')
		description: 'the hint must name the fix: ' , msg
%

category: 'Grail-Tests - grailDir fallback'
method: GrailDirFallbackTestCase
testConfiguredDirKeepsCPythonWordingExactly
	"A correctly configured session must get CPython's text UNCHANGED --
	conformance tests match on it."

	self clearSessionGrailDir.
	self assert: (importlib ___moduleNotFoundMessage___: 'no_such_module_xyz')
		= 'No module named ''no_such_module_xyz'''
%
