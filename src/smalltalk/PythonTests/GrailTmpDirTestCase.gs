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

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
fixedTmpPathLineOffends: aLine
	"True when aLine names a FIXED path under /tmp.

	Exempt, both deliberately:
	  * a line that also says ``getpid'' or ``mkdtemp'' -- the two sanctioned
	    ways to make a fixture path unique per gem; and
	  * a line carrying the marker ``grail-tmp-ok'', for a literal that never
	    reaches the filesystem.  That marker is a comment written WITH A REASON,
	    so an exemption is visible in review rather than baked silently into
	    this method.

	``/tmp/'' with nothing after it is a prefix, not a path, and is not flagged."

	| idx nextCh |
	idx := aLine indexOfSubCollection: '/tmp/' startingAt: 1.
	idx = 0 ifTrue: [^ false].
	idx + 5 > aLine size ifTrue: [^ false].
	nextCh := aLine at: idx + 5.
	(nextCh isLetter or: [nextCh isDigit or: [nextCh == $_]]) ifFalse: [^ false].
	(aLine indexOfSubCollection: 'getpid' startingAt: 1) > 0 ifTrue: [^ false].
	(aLine indexOfSubCollection: 'mkdtemp' startingAt: 1) > 0 ifTrue: [^ false].
	(aLine indexOfSubCollection: 'grail-tmp-ok' startingAt: 1) > 0 ifTrue: [^ false].
	^ true
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
fixedTmpPathOffendersIn: aPath root: aRoot
	| f out lineNo line |
	out := OrderedCollection new.
	f := [GsFile openReadOnServer: aPath] on: Error do: [:ex | ex return: nil].
	f isNil ifTrue: [^ out].
	lineNo := 0.
	[(line := f nextLine) isNil] whileFalse: [
		lineNo := lineNo + 1.
		((self fixedTmpPathLineOffends: line)
			or: [self sharedPrefixCountLineOffends: line]) ifTrue: [
			| shown |
			shown := (aPath size > aRoot size
				and: [(aPath copyFrom: 1 to: aRoot size) = aRoot])
					ifTrue: [aPath copyFrom: aRoot size + 2 to: aPath size]
					ifFalse: [aPath].
			out add: shown , ':' , lineNo printString , ': ' , line trimSeparators]].
	f close.
	^ out
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
fixedTmpPathOffenders
	"Every ``relative/path.py:N: text'' naming a fixed /tmp path, across every
	directory this guard covers.  Answers nil when one cannot be listed at all.

	SCOPE WIDENED beyond tests/python, which is how it missed tarfile.py.  The
	fixtures were only ever half the exposure: PRODUCTION stdlib code writes
	scratch files too, and `tarfile._temp_path' built ``/tmp/grail_tarfile_''
	+ time_ns.  The existing predicate flags that line on sight -- nothing was
	wrong with it -- the scan simply never read the file.  Measured: with the
	scan widened and the fix reverted, this test fails on tarfile.py:179.

	WHAT IS STILL OUT OF SCOPE, deliberately: the inline Python inside
	PythonTests/*.gs, where the COUNTING half of the tarfile bug actually lived.
	Scanning those would be self-referential -- this file's own docstrings and
	the literals testTheFixedTmpPathGuardCanActuallyFail feeds the predicates
	are exactly the shapes being looked for, so the guard would flag itself.
	Both predicates are pinned directly instead, which is the coverage that
	matters; a reviewer adding a /tmp count to a .gs test is the remaining gap
	and knowing where it is beats a scan that cries wolf."

	| out |
	out := OrderedCollection new.
	#('tests/python' 'src/python/stdlib') do: [:rel |
		| found |
		found := self fixedTmpPathOffendersUnder: rel.
		found isNil ifTrue: [^ nil].
		out addAll: found].
	^ out
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
fixedTmpPathOffendersUnder: aRelativeDir
	"The offending lines of every .py directly under aRelativeDir, or nil when
	that directory cannot be listed."

	| root dir entries out |
	out := OrderedCollection new.
	root := importlib grailDir.
	dir := root , '/' , aRelativeDir.
	entries := [GsFile contentsOfDirectory: dir onClient: false]
		on: Error do: [:ex | ex return: nil].
	entries isNil ifTrue: [^ nil].
	entries do: [:each |
		| name path |
		"contentsOfDirectory: answers full paths on some versions and bare names
		on others -- normalise by taking the trailing component."
		name := each asString.
		(name size >= 3 and: [(name copyFrom: name size - 2 to: name size) = '.py'])
			ifTrue: [
				path := (name includes: $/) ifTrue: [name] ifFalse: [dir , '/' , name].
				out addAll: (self fixedTmpPathOffendersIn: path root: root)]].
	^ out
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
sharedPrefixCountLineOffends: aLine
	"True when aLine COUNTS entries of a shared directory filtered by a name
	prefix -- a different failure in kind from a fixed path, and the one that
	got through.

	`tarfile._temp_path' gave every file a unique NAME under a shared PREFIX,
	so nothing ever collided on disk and the fixed-path predicate had nothing
	to say.  What broke was a test COUNTING that prefix:

	    len([n for n in os.listdir(""/tmp"") if n.startswith(""grail_tarfile_"")])

	An exact count over a machine-wide directory is an assertion about every
	other session on the box, so it went red whenever a second suite had an
	archive open -- and the stone lock cannot fix it, being keyed on
	GEMSTONE_NAME so that two stones run concurrently by design.

	A count keyed on getpid (or on a helper that is) is the sanctioned form and
	passes, exactly as for the fixed-path predicate."

	| line |
	line := aLine.
	(line indexOfSubCollection: 'listdir' startingAt: 1) = 0 ifTrue: [^ false].
	(line indexOfSubCollection: '/tmp' startingAt: 1) = 0 ifTrue: [^ false].
	(line indexOfSubCollection: 'startswith' startingAt: 1) = 0
		ifTrue: [(line indexOfSubCollection: 'glob' startingAt: 1) = 0
			ifTrue: [^ false]].
	(line indexOfSubCollection: 'getpid' startingAt: 1) > 0 ifTrue: [^ false].
	(line indexOfSubCollection: '_temp_prefix' startingAt: 1) > 0 ifTrue: [^ false].
	(line indexOfSubCollection: 'grail-tmp-ok' startingAt: 1) > 0 ifTrue: [^ false].
	^ true
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testNoFixtureNamesAFixedTmpPath
	"A fixture must not write to a path every checkout shares.

	This has now been fixed TWICE.  The first sweep migrated
	/tmp/grail_glob_test, /tmp/grail_shutil_test, /tmp/grail_fileio_*.txt and
	/tmp/grail; it missed /tmp/grail_netrc_fixture and
	/tmp/grail_fileio_fixture_{data,write} because those names did not match the
	pattern being grepped for.  Measured cost of the netrc one: four processes
	doing what its _parse did -- open(w), write, read back, unlink, on ONE shared
	path -- failed 1033 times in 1600, and 0 in 1600 once the path was per-gem.

	The failure is invisible when a suite runs alone, so a reviewer cannot be
	relied on to catch it.  Grepping filenames is what missed the stragglers last
	time; this reads every .py under tests/python instead."

	| offenders |
	offenders := self fixedTmpPathOffenders.
	"nil means the directory could not be listed.  FAIL rather than pass
	vacuously -- a guard that silently stops guarding is worse than none."
	self deny: offenders isNil
		description: 'could not list ' , importlib grailDir , '/tests/python'.
	self assert: offenders isEmpty
		description: 'fixture(s) name a fixed /tmp path; give each a per-gem '
			, 'directory (see fileio_constructor.py), or mark the line '
			, 'grail-tmp-ok with a reason: '
			, (offenders inject: '' into: [:a :b | a , (String with: Character lf) , b])
%

category: 'Grail-Tests - tmp isolation'
method: GrailTmpDirTestCase
testTheFixedTmpPathGuardCanActuallyFail
	"A guard that cannot fail is not a guard.  The scan above reads real files,
	so a bug in its predicate would leave it reporting a clean corpus forever --
	the shape that produced three false zeros in the frame-walk hunt.  Pin the
	predicate against BOTH answers rather than trusting that it compiles."

	self assert: (self fixedTmpPathLineOffends: 'path = ''/tmp/grail_netrc_fixture''')
		description: 'must catch the exact literal this guard exists for'.
	self assert: (self fixedTmpPathLineOffends: 'PATH = "/tmp/grail_fileio_fixture_data"')
		description: 'must catch a double-quoted literal too'.
	self deny: (self fixedTmpPathLineOffends: '_DIR = ''/tmp/grail_netrc_%d'' % os.getpid()')
		description: 'a pid-keyed path is the sanctioned fix and must pass'.
	self deny: (self fixedTmpPathLineOffends: 'ROOT = tempfile.mkdtemp(prefix=''g_'')')
		description: 'mkdtemp is the other sanctioned form'.
	self deny: (self fixedTmpPathLineOffends: 'warnings.warn(skip_file_prefixes=(''/tmp/'',))')
		description: 'a bare prefix names no file'.
	self deny: (self fixedTmpPathLineOffends: 'return "/tmp/x"  # grail-tmp-ok: never opened')
		description: 'the marker must exempt'.
	self deny: (self fixedTmpPathLineOffends: 'nothing to see here')
		description: 'an unrelated line must not trip it'.

	"The SECOND predicate, pinned the same way and for the same reason.  It
	exists because the first one cannot see a count over a shared prefix: the
	line below carries no fixed path, so fixedTmpPathLineOffends: correctly
	says false about it and something else has to say true."
	self deny: (self fixedTmpPathLineOffends:
			'return len([n for n in os.listdir("/tmp") if n.startswith("grail_tarfile_")])')
		description: 'the fixed-path predicate cannot see a prefix count -- if '
			, 'this ever starts passing, the two predicates overlap and this '
			, 'test is no longer distinguishing them'.
	self assert: (self sharedPrefixCountLineOffends:
			'return len([n for n in os.listdir("/tmp") if n.startswith("grail_tarfile_")])')
		description: 'must catch the exact count this predicate exists for'.
	self deny: (self sharedPrefixCountLineOffends:
			'return len([n for n in os.listdir("/tmp") if n.startswith(tarfile._temp_prefix())])')
		description: 'a per-gem prefix helper is the sanctioned fix and must pass'.
	self deny: (self sharedPrefixCountLineOffends:
			'names = [n for n in os.listdir("/tmp") if n.startswith("g%d" % os.getpid())]')
		description: 'a pid-keyed prefix must pass'.
	self deny: (self sharedPrefixCountLineOffends:
			'self assert: ("." not in os.listdir("/tmp"))')
		description: 'MEMBERSHIP over /tmp is race-free and must not be flagged '
			, '(OsTestCase does exactly this)'.
	self deny: (self sharedPrefixCountLineOffends: 'nothing to see here')
		description: 'an unrelated line must not trip it'
%
