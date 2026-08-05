! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GrailTmpDirTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GrailTmpDirTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GrailTmpDirTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
GrailTmpDirTestCase removeAllMethods: 0.
GrailTmpDirTestCase class removeAllMethods: 0.
%

! ===============================================================================
! Fixtures must write under this checkout's own /tmp/Grail<N>.
!
! They used to use absolute shared paths -- /tmp/grail_glob_test,
! /tmp/grail_shutil_test, /tmp/grail_fileio_*.txt, /tmp/grail for the codegen
! capture.  Four checkouts run against one stone on the dev host as four users,
! so concurrent runs collided in the FILESYSTEM even though their Smalltalk was
! fully isolated: ShutilTestCase and GlobTestCase both rmtree their fixture root
! in setUp, and ImportlibTestCase counts files under the codegen directory and
! asserts the delta.  None of it reproduces when a suite runs alone.
!
! The token matters as much as the path: an UNEXPANDED $TMP would not raise --
! open("$TMP/x") is a valid RELATIVE path, so it would quietly create a
! directory named `$TMP' in the gem's working directory (the checkout) and the
! test would still pass.  testTokenReachesTheFilesystem is what makes that
! failure visible.
! ===============================================================================

set compile_env: 0

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testRootIsPerCheckoutAndExists
	| root |
	root := self tmpRoot.
	self assert: (root copyFrom: 1 to: 10) = '/tmp/Grail'
		description: 'expected /tmp/Grail<N>, got ' , root printString.
	self assert: (root at: root size) isDigit
		description: 'the root must end in the checkout index: ' , root.
	self assert: (GsFile existsOnServer: root) == true
		description: root , ' must be created on demand'
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testRootIsRecreatedIfRemoved
	"Existence is re-probed on every call, so a fixture that rmtree's its way
	up to the root cannot leave every later test writing into thin air."

	| root |
	root := self tmpRoot.
	(GsFile existsOnServer: root) == true
		ifTrue: [GsFile removeServerDirectory: root].
	self assert: (GsFile existsOnServer: self tmpRoot) == true
		description: 'tmpRoot must recreate the directory when it is missing'
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testTmpBuildsPathsUnderTheRoot
	self assert: (self tmp: 'a.txt') = (self tmpRoot , '/a.txt').
	self assert: (self tmp: 'sub/b.txt') = (self tmpRoot , '/sub/b.txt')
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testTokenExpansion
	self assert: (self expandTmpTokensIn: '$TMP/x') = (self tmpRoot , '/x').
	self assert: (self expandTmpTokensIn: 'a $TMP/x b $TMP/y c')
		= ('a ' , self tmpRoot , '/x b ' , self tmpRoot , '/y c').
	self assert: (self expandTmpTokensIn: 'no token here') = 'no token here'
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testTokenReachesTheFilesystem
	"THE LOAD-BEARING TEST.  Writes through eval: using the token and then
	looks for the file at the SMALLTALK-side path.  If eval: ever stops
	expanding, this fails instead of silently creating a `$TMP' directory in
	the checkout."

	| path |
	path := self tmp: 'tmp_token_probe.txt'.
	(GsFile existsOnServer: path) == true ifTrue: [GsFile removeServerFile: path].
	self eval: 'f = open("$TMP/tmp_token_probe.txt", "w")
f.write("token expanded")
f.close()'.
	self assert: (GsFile existsOnServer: path) == true
		description: 'eval: must expand $TMP; nothing was written to ' , path.
	self assert: (self eval: 'open("$TMP/tmp_token_probe.txt").read()')
		= 'token expanded'.
	GsFile removeServerFile: path
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testUnexpandedTokenWouldNotFailLoudly
	"WHY the positive test above is the guard, and no negative one can be.

	GemStone expands ``$VAR'' inside a server file path, and an UNDEFINED
	variable expands to the empty string.  So a path that still contains an
	unexpanded $TMP does not raise and does not create a literal `$TMP'
	directory -- it silently resolves somewhere else entirely
	(``<dir>/$TMP/x'' becomes ``<dir>/x'').  A fixture whose token stopped
	being expanded would therefore keep passing while writing to the wrong
	place, which is exactly the failure this class exists to catch, and it can
	only be caught by asserting the file appears where it SHOULD be."

	| dir |
	dir := importlib grailDir.
	self assert: (GsFile existsOnServer: dir , '/$GRAIL_NO_SUCH_VAR_XYZ') == true
		description: 'expected GemStone to expand an undefined $VAR to empty; '
			, 'if this ever changes, a negative token test becomes possible'.
	self deny: (GsFile existsOnServer: dir , '/literally_not_here_xyz') == true
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testIndexComesFromTheUser
	"Claude0..Claude3 are the four checkouts' users; the trailing digit is
	what keeps them apart.  DataCurator (CI) has none and falls back."

	self assert: (importlib ___trailingDigitsOf___: 'Claude0') = '0'.
	self assert: (importlib ___trailingDigitsOf___: 'Claude3') = '3'.
	self assert: (importlib ___trailingDigitsOf___: 'Claude12') = '12'.
	self assert: (importlib ___trailingDigitsOf___: 'DataCurator') = ''.
	self assert: (importlib ___trailingDigitsOf___: '') = ''.
	self assert: (importlib ___trailingDigitsOf___: nil) = ''
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testCheckoutFallbackIndex
	"With no digit in the user name the checkout directory decides, so
	Grail-1 and Grail still differ."

	self assert: (importlib ___lastPathComponentOf___: '/a/b/Grail-1') = 'Grail-1'.
	self assert: (importlib ___lastPathComponentOf___: '/a/b/Grail-1/') = 'Grail-1'.
	self assert: (importlib ___lastPathComponentOf___: 'Grail') = 'Grail'.
	self assert: (importlib ___lastPathComponentOf___: nil) = ''.
	self assert: (importlib ___trailingDigitsOf___:
		(importlib ___lastPathComponentOf___: '/a/b/Grail-2')) = '2'
%
