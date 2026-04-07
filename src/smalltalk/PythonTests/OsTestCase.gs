! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
OsTestCase category: 'SUnit'
%

! ===============================================================================
! OsTestCase - Tests for Python os module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
OsTestCase removeAllMethods: 0.
OsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Tests - File and Directory Operations'
method: OsTestCase
testChdir
	"Test os.chdir()"

	| o getcwdBlock chdirBlock originalCwd testDir newCwd |
	o := os @env1:instance.
	getcwdBlock := o @env1:getcwd.
	chdirBlock := o @env1:chdir.
	originalCwd := getcwdBlock value: {} value: nil.
	testDir := '/tmp'.

	"Change to test directory"
	chdirBlock value: {testDir} value: nil.
	newCwd := getcwdBlock value: {} value: nil.

	self assert: (newCwd includesString: testDir).

	"Change back to original directory"
	chdirBlock value: {originalCwd} value: nil.
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testExists
	"Test os.exists()"

	| o existsBlock |
	o := os @env1:instance.
	existsBlock := o @env1:exists.

	"Test with existing path"
	self assert: (existsBlock value: {'/tmp'} value: nil).

	"Test with non-existing path"
	self deny: (existsBlock value: {'/tmp/grail_os_test_nonexistent_xyz123'} value: nil)
%

category: 'Tests - Integration'
method: OsTestCase
testFileOperationsSequence
	"Test a sequence of file operations"

	| o existsBlock removeBlock rmdirBlock mkdirBlock isdirBlock listdirBlock isfileBlock testDir testFile file listResult |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	removeBlock := o @env1:remove.
	rmdirBlock := o @env1:rmdir.
	mkdirBlock := o @env1:mkdir.
	isdirBlock := o @env1:isdir.
	listdirBlock := o @env1:listdir.
	isfileBlock := o @env1:isfile.
	testDir := '/tmp/grail_os_test_sequence'.
	testFile := testDir , '/test_file.txt'.

	"Clean up if it exists"
	(existsBlock value: {testDir} value: nil) ifTrue: [
		(existsBlock value: {testFile} value: nil) ifTrue: [
			removeBlock value: {testFile} value: nil
		].
		rmdirBlock value: {testDir} value: nil
	].

	"Create directory"
	mkdirBlock value: {testDir} value: nil.
	self assert: (isdirBlock value: {testDir} value: nil).

	"List directory (should be empty or have minimal entries)"
	listResult := listdirBlock value: {testDir} value: nil.
	self assert: (listResult isKindOf: OrderedCollection).

	"Create file in directory"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Verify file exists"
	self assert: (existsBlock value: {testFile} value: nil).
	self assert: (isfileBlock value: {testFile} value: nil).

	"List directory again (should now include our file)"
	listResult := listdirBlock value: {testDir} value: nil.
	self assert: (listResult includes: 'test_file.txt').

	"Remove file"
	removeBlock value: {testFile} value: nil.
	self deny: (existsBlock value: {testFile} value: nil).

	"Remove directory"
	rmdirBlock value: {testDir} value: nil.
	self deny: (existsBlock value: {testDir} value: nil)
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testGetcwd
	"Test os.getcwd()"

	| o getcwdBlock result |
	o := os @env1:instance.
	getcwdBlock := o @env1:getcwd.
	result := getcwdBlock value: {} value: nil.

	self assert: (result isKindOf: String).
	self deny: result isEmpty
%

category: 'Tests - Environment Variables'
method: OsTestCase
testGetenv
	"Test os.getenv() - get environment variable"

	| o getenvBlock result |
	o := os @env1:instance.
	getenvBlock := o @env1:getenv.

	"Try to get a common environment variable (may or may not exist)"
	result := getenvBlock value: {'PATH'} value: nil.

	"Result may be nil or a string"
	(result notNil) ifTrue: [
		self assert: (result isKindOf: String)
	]
%

category: 'Tests - Environment Variables'
method: OsTestCase
testGetenvWithDefault
	"Test os.getenv() with default value"

	| o getenvWithDefaultBlock result default |
	o := os @env1:instance.
	getenvWithDefaultBlock := o @env1:getenvWithDefault.
	default := 'default_value'.

	"Try to get a non-existent environment variable"
	result := getenvWithDefaultBlock value: {'GRAIL_TEST_NONEXISTENT_VAR_XYZ123'. default} value: nil.

	"Should return default value"
	self assert: result equals: default
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testIsdir
	"Test os.isdir()"

	| o existsBlock rmdirBlock mkdirBlock isdirBlock testDir |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	rmdirBlock := o @env1:rmdir.
	mkdirBlock := o @env1:mkdir.
	isdirBlock := o @env1:isdir.
	testDir := '/tmp/grail_os_test_isdir'.

	"Clean up if it exists"
		(existsBlock value: {testDir} value: nil) ifTrue: [
			rmdirBlock value: {testDir} value: nil
	].

	"Create directory"
	mkdirBlock value: {testDir} value: nil.

	"Test isdir"
	self assert: (isdirBlock value: {testDir} value: nil).
	self deny: (isdirBlock value: {'/tmp/grail_os_test_isdir_nonexistent'} value: nil).

	"Clean up"
	rmdirBlock value: {testDir} value: nil
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testIsfile
	"Test os.isfile()"

	| o existsBlock removeBlock isfileBlock testFile file |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	removeBlock := o @env1:remove.
	isfileBlock := o @env1:isfile.
	testFile := '/tmp/grail_os_test_isfile'.

	"Clean up if it exists"
	(existsBlock value: {testFile} value: nil) ifTrue: [
		removeBlock value: {testFile} value: nil
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Test isfile"
	self assert: (isfileBlock value: {testFile} value: nil).
	self deny: (isfileBlock value: {'/tmp/grail_os_test_isfile_nonexistent'} value: nil).

	"Test that directory is not a file"
	self deny: (isfileBlock value: {'/tmp'} value: nil).

	"Clean up"
	removeBlock value: {testFile} value: nil
%

category: 'Tests - Constants'
method: OsTestCase
testLinesep
	"Test os.linesep constant"

	| o result |
	o := os @env1:instance.
	result := o @env1:linesep.

	self assert: (result size) equals: 1
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testListdir
	"Test os.listdir() with no argument (uses current directory)"

	| o listdirBlock result |
	o := os @env1:instance.
	listdirBlock := o @env1:listdir.
	result := listdirBlock value: {} value: nil.

	self assert: (result isKindOf: OrderedCollection).
	self deny: result isEmpty
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testListdirWithPath
	"Test os.listdir() with path"

	| o listdirBlock result |
	o := os @env1:instance.
	listdirBlock := o @env1:listdir.
	result := listdirBlock value: {'/tmp'} value: nil.

	self assert: (result isKindOf: OrderedCollection)
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testLstat
	"Test os.lstat()"

	| o existsBlock removeBlock lstatBlock testFile file statResult |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	removeBlock := o @env1:remove.
	lstatBlock := o @env1:lstat.
	testFile := '/tmp/grail_os_test_lstat'.

	"Clean up if it exists"
	(existsBlock value: {testFile} value: nil) ifTrue: [
		removeBlock value: {testFile} value: nil
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Get lstat"
	statResult := lstatBlock value: {testFile} value: nil.

	"Verify lstat result is not nil"
	self assert: statResult notNil.

	"Clean up"
	removeBlock value: {testFile} value: nil
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testMakedirs
	"Test os.makedirs() - recursive directory creation"

	| o existsBlock rmdirBlock makedirsBlock testDir |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	rmdirBlock := o @env1:rmdir.
	makedirsBlock := o @env1:makedirs.
	testDir := '/tmp/grail_os_test_makedirs/level1/level2'.

	"Clean up if it exists"
	(existsBlock value: {'/tmp/grail_os_test_makedirs'} value: nil) ifTrue: [
		rmdirBlock value: {'/tmp/grail_os_test_makedirs/level1/level2'} value: nil.
		rmdirBlock value: {'/tmp/grail_os_test_makedirs/level1'} value: nil.
		rmdirBlock value: {'/tmp/grail_os_test_makedirs'} value: nil
	].

	"Create nested directories"
	makedirsBlock value: {testDir} value: nil.

	"Verify all levels exist"
	self assert: (existsBlock value: {'/tmp/grail_os_test_makedirs'} value: nil).
	self assert: (existsBlock value: {'/tmp/grail_os_test_makedirs/level1'} value: nil).
	self assert: (existsBlock value: {testDir} value: nil).

	"Clean up"
	rmdirBlock value: {'/tmp/grail_os_test_makedirs/level1/level2'} value: nil.
	rmdirBlock value: {'/tmp/grail_os_test_makedirs/level1'} value: nil.
	rmdirBlock value: {'/tmp/grail_os_test_makedirs'} value: nil
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testMkdir
	"Test os.mkdir()"

	| o existsBlock rmdirBlock mkdirBlock isdirBlock testDir |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	rmdirBlock := o @env1:rmdir.
	mkdirBlock := o @env1:mkdir.
	isdirBlock := o @env1:isdir.
	testDir := '/tmp/grail_os_test_mkdir'.

	"Clean up if it exists"
		(existsBlock value: {testDir} value: nil) ifTrue: [
			rmdirBlock value: {testDir} value: nil
	].

	"Create directory"
	mkdirBlock value: {testDir} value: nil.

	"Verify it exists and is a directory"
	self assert: (existsBlock value: {testDir} value: nil).
	self assert: (isdirBlock value: {testDir} value: nil).

	"Clean up"
	rmdirBlock value: {testDir} value: nil
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testMkdirWithMode
	"Test os.mkdir() with mode"

	| o existsBlock rmdirBlock mkdirWithModeBlock testDir |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	rmdirBlock := o @env1:rmdir.
	mkdirWithModeBlock := o @env1:mkdirWithMode.
	testDir := '/tmp/grail_os_test_mkdir_mode'.

	"Clean up if it exists"
		(existsBlock value: {testDir} value: nil) ifTrue: [
			rmdirBlock value: {testDir} value: nil
	].

	"Create directory with mode"
	mkdirWithModeBlock value: {testDir. 493} value: nil.

	"Verify it exists"
	self assert: (existsBlock value: {testDir} value: nil).

	"Clean up"
	rmdirBlock value: {testDir} value: nil
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathAbspath
	"Test os.path.abspath()"

	| o path abspathBlock isabsBlock getcwdBlock result cwd |
	o := os @env1:instance.
	path := o @env1:path.
	abspathBlock := path @env1:abspath.
	isabsBlock := path @env1:isabs.
	getcwdBlock := o @env1:getcwd.
	cwd := getcwdBlock value: {} value: nil.

	"Absolute path should remain absolute"
	result := abspathBlock value: {'/usr/bin'} value: nil.
	self assert: result equals: '/usr/bin'.

	"Relative path should become absolute"
	result := abspathBlock value: {'file.txt'} value: nil.
	self assert: (isabsBlock value: {result} value: nil).
	self assert: (result endsWith: 'file.txt')
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathBasename
	"Test os.path.basename()"

	| o path basenameBlock result |
	o := os @env1:instance.
	path := o @env1:path.
	basenameBlock := path @env1:basename.

	result := basenameBlock value: {'/usr/bin/python'} value: nil.
	self assert: result equals: 'python'.

	result := basenameBlock value: {'/usr/bin/'} value: nil.
	self assert: result equals: 'bin'.

	result := basenameBlock value: {'/usr/'} value: nil.
	self assert: result equals: 'usr'.

	result := basenameBlock value: {'python'} value: nil.
	self assert: result equals: 'python'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathCommonpath
	"Test os.path.commonpath()"

	| o path commonpathBlock result paths |
	o := os @env1:instance.
	path := o @env1:path.
	commonpathBlock := path @env1:commonpath.

	paths := OrderedCollection with: '/usr/lib/python3' with: '/usr/lib/python2'.
	result := commonpathBlock value: {paths} value: nil.
	self assert: result equals: '/usr/lib'.

	paths := OrderedCollection with: '/usr/lib/python3' with: '/usr/local/lib'.
	result := commonpathBlock value: {paths} value: nil.
	self assert: result equals: '/usr'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathCommonprefix
	"Test os.path.commonprefix()"

	| o path commonprefixBlock result paths |
	o := os @env1:instance.
	path := o @env1:path.
	commonprefixBlock := path @env1:commonprefix.

	paths := OrderedCollection with: '/usr/lib' with: '/usr/lib/python3'.
	result := commonprefixBlock value: {paths} value: nil.
	self assert: result equals: '/usr/lib'.

	paths := OrderedCollection with: '/usr/lib' with: '/usr/local/lib'.
	result := commonprefixBlock value: {paths} value: nil.
	self assert: result equals: '/usr/l'.

	paths := OrderedCollection with: 'file1.txt' with: 'file2.txt'.
	result := commonprefixBlock value: {paths} value: nil.
	self assert: result equals: 'file'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathDirname
	"Test os.path.dirname()"

	| o path dirnameBlock result |
	o := os @env1:instance.
	path := o @env1:path.
	dirnameBlock := path @env1:dirname.

	result := dirnameBlock value: {'/usr/bin/python'} value: nil.
	self assert: result equals: '/usr/bin'.

	result := dirnameBlock value: {'/usr/bin/'} value: nil.
	self assert: result equals: '/usr'.

	result := dirnameBlock value: {'python'} value: nil.
	self assert: result equals: '.'.

	result := dirnameBlock value: {'/'} value: nil.
	self assert: result equals: '/'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathExists
	"Test os.path.exists()"

	| o path existsBlock |
	o := os @env1:instance.
	path := o @env1:path.
	existsBlock := path @env1:exists.

	"Test with existing path"
	self assert: (existsBlock value: {'/tmp'} value: nil).

	"Test with non-existing path"
	self deny: (existsBlock value: {'/tmp/grail_os_path_test_nonexistent_xyz123'} value: nil)
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIntegration
	"Test integration of multiple os.path functions"

	| o path joinBlock splitBlock basenameBlock dirnameBlock normpathBlock abspathBlock isabsBlock result paths |
	o := os @env1:instance.
	path := o @env1:path.
	joinBlock := path @env1:join.
	splitBlock := path @env1:split.
	basenameBlock := path @env1:basename.
	dirnameBlock := path @env1:dirname.
	normpathBlock := path @env1:normpath.
	abspathBlock := path @env1:abspath.
	isabsBlock := path @env1:isabs.

	"Join paths, then split"
	paths := OrderedCollection with: '/usr' with: 'local'.
	result := joinBlock value: {paths} value: nil.
	result := splitBlock value: {result} value: nil.
	self assert: (result at: 1) equals: '/usr'.
	self assert: (result at: 2) equals: 'local'.

	"Get basename and dirname"
	paths := OrderedCollection with: '/usr' with: 'bin/python'.
	result := joinBlock value: {paths} value: nil.
	self assert: (basenameBlock value: {result} value: nil) equals: 'python'.
	self assert: (dirnameBlock value: {result} value: nil) equals: '/usr/bin'.

	"Normalize and get absolute path"
	result := normpathBlock value: {'usr/../bin/python'} value: nil.
	result := abspathBlock value: {result} value: nil.
	self assert: (isabsBlock value: {result} value: nil)
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIsabs
	"Test os.path.isabs()"

	| o path isabsBlock |
	o := os @env1:instance.
	path := o @env1:path.
	isabsBlock := path @env1:isabs.

	self assert: (isabsBlock value: {'/usr/bin'} value: nil).
	self assert: (isabsBlock value: {'/'} value: nil).
	self deny: (isabsBlock value: {'usr/bin'} value: nil).
	self deny: (isabsBlock value: {'file.txt'} value: nil)
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIsdir
	"Test os.path.isdir()"

	| o path existsBlock rmdirBlock mkdirBlock isdirBlock testDir |
	o := os @env1:instance.
	path := o @env1:path.
	existsBlock := path @env1:exists.
	rmdirBlock := o @env1:rmdir.
	mkdirBlock := o @env1:mkdir.
	isdirBlock := path @env1:isdir.
	testDir := '/tmp/grail_os_path_test_isdir'.

	"Clean up if it exists"
		(existsBlock value: {testDir} value: nil) ifTrue: [
			rmdirBlock value: {testDir} value: nil
	].

	"Create directory"
	mkdirBlock value: {testDir} value: nil.

	"Test isdir"
	self assert: (isdirBlock value: {testDir} value: nil).
	self deny: (isdirBlock value: {'/tmp/grail_os_path_test_isdir_nonexistent'} value: nil).

	"Clean up"
	rmdirBlock value: {testDir} value: nil
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIsfile
	"Test os.path.isfile()"

	| o path existsBlock removeBlock isfileBlock testFile file |
	o := os @env1:instance.
	path := o @env1:path.
	existsBlock := path @env1:exists.
	removeBlock := o @env1:remove.
	isfileBlock := path @env1:isfile.
	testFile := '/tmp/grail_os_path_test_isfile'.

	"Clean up if it exists"
	(existsBlock value: {testFile} value: nil) ifTrue: [
		removeBlock value: {testFile} value: nil
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Test isfile"
	self assert: (isfileBlock value: {testFile} value: nil).
	self deny: (isfileBlock value: {'/tmp/grail_os_path_test_isfile_nonexistent'} value: nil).

	"Test that directory is not a file"
	self deny: (isfileBlock value: {'/tmp'} value: nil).

	"Clean up"
	removeBlock value: {testFile} value: nil
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathJoin
	"Test os.path.join() with paths"

	| o path joinBlock result paths |
	o := os @env1:instance.
	path := o @env1:path.
	joinBlock := path @env1:join.

	paths := OrderedCollection with: '/usr' with: 'bin'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: '/usr/bin'.

	paths := OrderedCollection with: '/usr/' with: 'bin'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: '/usr/bin'.

	paths := OrderedCollection with: '/usr' with: '/bin'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: '/bin'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathJoinAll
	"Test os.path.join() with collection (already covered by testPathJoinMultiple, but keeping for completeness)"

	| o path joinBlock result paths |
	o := os @env1:instance.
	path := o @env1:path.
	joinBlock := path @env1:join.

	paths := OrderedCollection with: '/usr' with: 'local' with: 'bin'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: '/usr/local/bin'.

	paths := OrderedCollection with: 'home' with: 'user' with: 'docs'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: 'home/user/docs'.

	paths := OrderedCollection with: '/usr/'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: '/usr/'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathJoinMultiple
	"Test os.path.join() with multiple paths"

	| o path joinBlock result paths |
	o := os @env1:instance.
	path := o @env1:path.
	joinBlock := path @env1:join.

	paths := OrderedCollection with: '/usr' with: 'local' with: 'bin'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: '/usr/local/bin'.

	paths := OrderedCollection with: 'home' with: 'user' with: 'docs' with: 'file.txt'.
	result := joinBlock value: {paths} value: nil.
	self assert: result equals: 'home/user/docs/file.txt'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathNormpath
	"Test os.path.normpath()"

	| o path normpathBlock result |
	o := os @env1:instance.
	path := o @env1:path.
	normpathBlock := path @env1:normpath.

	result := normpathBlock value: {'/usr/../usr/bin'} value: nil.
	self assert: result equals: '/usr/bin'.

	result := normpathBlock value: {'/usr/./bin'} value: nil.
	self assert: result equals: '/usr/bin'.

	result := normpathBlock value: {'usr/../bin'} value: nil.
	self assert: result equals: 'bin'.

	result := normpathBlock value: {'usr/./bin'} value: nil.
	self assert: result equals: 'usr/bin'.

	result := normpathBlock value: {'/usr//bin'} value: nil.
	self assert: result equals: '/usr/bin'.

	result := normpathBlock value: {'..'} value: nil.
	self assert: result equals: '..'.

	result := normpathBlock value: {'.'} value: nil.
	self assert: result equals: '.'
%

category: 'Tests - Constants'
method: OsTestCase
testPathsep
	"Test os.pathsep constant"

	| o result |
	o := os @env1:instance.
	result := o @env1:pathsep.

	self assert: result equals: ':'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathSplit
	"Test os.path.split()"

	| o path splitBlock result |
	o := os @env1:instance.
	path := o @env1:path.
	splitBlock := path @env1:split.

	result := splitBlock value: {'/usr/bin/python'} value: nil.
	self assert: (result size) equals: 2.
	self assert: (result at: 1) equals: '/usr/bin'.
	self assert: (result at: 2) equals: 'python'.

	result := splitBlock value: {'/usr/bin/'} value: nil.
	self assert: (result at: 1) equals: '/usr/bin'.
	self assert: (result at: 2) equals: ''.

	result := splitBlock value: {'python'} value: nil.
	self assert: (result at: 1) equals: ''.
	self assert: (result at: 2) equals: 'python'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathSplitext
	"Test os.path.splitext()"

	| o path splitextBlock result |
	o := os @env1:instance.
	path := o @env1:path.
	splitextBlock := path @env1:splitext.

	result := splitextBlock value: {'file.txt'} value: nil.
	self assert: (result size) equals: 2.
	self assert: (result at: 1) equals: 'file'.
	self assert: (result at: 2) equals: '.txt'.

	result := splitextBlock value: {'/path/to/file.txt'} value: nil.
	self assert: (result at: 1) equals: '/path/to/file'.
	self assert: (result at: 2) equals: '.txt'.

	result := splitextBlock value: {'file'} value: nil.
	self assert: (result at: 1) equals: 'file'.
	self assert: (result at: 2) equals: ''.

	result := splitextBlock value: {'.hidden'} value: nil.
	self assert: (result at: 1) equals: '.hidden'.
	self assert: (result at: 2) equals: ''
%

category: 'Tests - Environment Variables'
method: OsTestCase
testPutenv
	"Test os.putenv() - set environment variable"

	| o putenvBlock getenvBlock testVar testValue result |
	o := os @env1:instance.
	putenvBlock := o @env1:putenv.
	getenvBlock := o @env1:getenv.
	testVar := 'GRAIL_TEST_PUTENV_VAR'.
	testValue := 'test_value_123'.

	"Set the environment variable"
	putenvBlock value: {testVar. testValue} value: nil.

	"Get it back"
	result := getenvBlock value: {testVar} value: nil.

	"Should match what we set"
	self assert: result equals: testValue
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testRemove
	"Test os.remove() - remove file"

	| o existsBlock removeBlock testFile file |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	removeBlock := o @env1:remove.
	testFile := '/tmp/grail_os_test_remove'.

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Verify it exists"
	self assert: (existsBlock value: {testFile} value: nil).

	"Remove it"
	removeBlock value: {testFile} value: nil.

	"Verify it's gone"
	self deny: (existsBlock value: {testFile} value: nil)
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testRename
	"Test os.rename() - rename file"

	| o existsBlock removeBlock renameBlock oldPath newPath file |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	removeBlock := o @env1:remove.
	renameBlock := o @env1:rename.
	oldPath := '/tmp/grail_os_test_rename_old'.
	newPath := '/tmp/grail_os_test_rename_new'.

	"Clean up if they exist"
	(existsBlock value: {oldPath} value: nil) ifTrue: [
		removeBlock value: {oldPath} value: nil
	].
	(existsBlock value: {newPath} value: nil) ifTrue: [
		removeBlock value: {newPath} value: nil
	].

	"Create a test file"
	file := GsFile open: oldPath mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Verify old file exists"
	self assert: (existsBlock value: {oldPath} value: nil).

	"Rename it"
	renameBlock value: {oldPath. newPath} value: nil.

	"Verify old file is gone and new file exists"
	self deny: (existsBlock value: {oldPath} value: nil).
	self assert: (existsBlock value: {newPath} value: nil).

	"Clean up"
	removeBlock value: {newPath} value: nil
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testRmdir
	"Test os.rmdir() - remove directory"

	| o existsBlock rmdirBlock mkdirBlock testDir |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	rmdirBlock := o @env1:rmdir.
	mkdirBlock := o @env1:mkdir.
	testDir := '/tmp/grail_os_test_rmdir'.

	"Clean up if it exists"
		(existsBlock value: {testDir} value: nil) ifTrue: [
			rmdirBlock value: {testDir} value: nil
	].

	"Create directory"
	mkdirBlock value: {testDir} value: nil.

	"Verify it exists"
	self assert: (existsBlock value: {testDir} value: nil).

	"Remove it"
	rmdirBlock value: {testDir} value: nil.

	"Verify it's gone"
	self deny: (existsBlock value: {testDir} value: nil)
%

category: 'Tests - Constants'
method: OsTestCase
testSep
	"Test os.sep constant"

	| o result |
	o := os @env1:instance.
	result := o @env1:sep.

	self assert: result equals: '/'
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testStat
	"Test os.stat()"

	| o existsBlock removeBlock statBlock testFile file statResult |
	o := os @env1:instance.
	existsBlock := o @env1:exists.
	removeBlock := o @env1:remove.
	statBlock := o @env1:stat.
	testFile := '/tmp/grail_os_test_stat'.

	"Clean up if it exists"
	(existsBlock value: {testFile} value: nil) ifTrue: [
		removeBlock value: {testFile} value: nil
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Get stat"
	statResult := statBlock value: {testFile} value: nil.

	"Verify stat result is not nil"
	self assert: statResult notNil.

	"Clean up"
	removeBlock value: {testFile} value: nil
%

category: 'Tests - Process Management'
method: OsTestCase
testSystem
	"Test os.system() - execute shell command"

	| o systemBlock result |
	o := os @env1:instance.
	systemBlock := o @env1:system.

	"Execute a simple command"
	result := systemBlock value: {'echo "test"'} value: nil.

	"Result should not be nil (exit code or output)"
	self assert: result notNil
%
