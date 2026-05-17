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
OsTestCase category: 'Grail-SUnit'
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

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testChdir
	"Test os.chdir()"

	| o originalCwd testDir newCwd |
	o := os @env1:instance.
	originalCwd := o @env1:getcwd.
	testDir := '/tmp'.

	"Change to test directory"
	o @env1:chdir: testDir.
	newCwd := o @env1:getcwd.

	self assert: (newCwd includesString: testDir).

	"Change back to original directory"
	o @env1:chdir: originalCwd.
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testExists
	"Test os.exists()"

	| o |
	o := os @env1:instance.

	"Test with existing path"
	self assert: (o @env1:exists: '/tmp').

	"Test with non-existing path"
	self deny: (o @env1:exists: '/tmp/grail_os_test_nonexistent_xyz123')
%

category: 'Grail-Tests - Integration'
method: OsTestCase
testFileOperationsSequence
	"Test a sequence of file operations"

	| o testDir testFile file listResult |
	o := os @env1:instance.
	testDir := '/tmp/grail_os_test_sequence'.
	testFile := testDir , '/test_file.txt'.

	"Clean up if it exists"
	(o @env1:exists: testDir) ifTrue: [
		(o @env1:exists: testFile) ifTrue: [
			o @env1:remove: testFile
		].
		o @env1:rmdir: testDir
	].

	"Create directory"
	o @env1:mkdir: testDir.
	self assert: (o @env1:isdir: testDir).

	"List directory (should be empty or have minimal entries)"
	listResult := o @env1:listdir: testDir.
	self assert: (listResult isKindOf: OrderedCollection).

	"Create file in directory"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Verify file exists"
	self assert: (o @env1:exists: testFile).
	self assert: (o @env1:isfile: testFile).

	"List directory again (should now include our file)"
	listResult := o @env1:listdir: testDir.
	self assert: (listResult includes: 'test_file.txt').

	"Remove file"
	o @env1:remove: testFile.
	self deny: (o @env1:exists: testFile).

	"Remove directory"
	o @env1:rmdir: testDir.
	self deny: (o @env1:exists: testDir)
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testGetcwd
	"Test os.getcwd()"

	| o result |
	o := os @env1:instance.
	result := o @env1:getcwd.

	self assert: (result isKindOf: String).
	self deny: result isEmpty
%

category: 'Grail-Tests - Environment Variables'
method: OsTestCase
testGetenv
	"Test os.getenv() - get environment variable"

	| o result |
	o := os @env1:instance.

	"Try to get a common environment variable (may or may not exist)"
	result := o @env1:getenv: 'PATH'.

	"Result may be nil or a string"
	(result notNil) ifTrue: [
		self assert: (result isKindOf: String)
	]
%

category: 'Grail-Tests - Environment Variables'
method: OsTestCase
testGetenvWithDefault
	"Test os.getenv() with default value"

	| o result default |
	o := os @env1:instance.
	default := 'default_value'.

	"Try to get a non-existent environment variable"
	result := o @env1:getenv: 'GRAIL_TEST_NONEXISTENT_VAR_XYZ123' _: default.

	"Should return default value"
	self assert: result equals: default
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testIsdir
	"Test os.isdir()"

	| o testDir |
	o := os @env1:instance.
	testDir := '/tmp/grail_os_test_isdir'.

	"Clean up if it exists"
		(o @env1:exists: testDir) ifTrue: [
			o @env1:rmdir: testDir
	].

	"Create directory"
	o @env1:mkdir: testDir.

	"Test isdir"
	self assert: (o @env1:isdir: testDir).
	self deny: (o @env1:isdir: '/tmp/grail_os_test_isdir_nonexistent').

	"Clean up"
	o @env1:rmdir: testDir
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testIsfile
	"Test os.isfile()"

	| o testFile file |
	o := os @env1:instance.
	testFile := '/tmp/grail_os_test_isfile'.

	"Clean up if it exists"
	(o @env1:exists: testFile) ifTrue: [
		o @env1:remove: testFile
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Test isfile"
	self assert: (o @env1:isfile: testFile).
	self deny: (o @env1:isfile: '/tmp/grail_os_test_isfile_nonexistent').

	"Test that directory is not a file"
	self deny: (o @env1:isfile: '/tmp').

	"Clean up"
	o @env1:remove: testFile
%

category: 'Grail-Tests - Constants'
method: OsTestCase
testLinesep
	"Test os.linesep constant"

	| o result |
	o := os @env1:instance.
	result := o @env1:linesep.

	self assert: (result size) equals: 1
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testListdir
	"Test os.listdir() with no argument (uses current directory)"

	| o result |
	o := os @env1:instance.
	result := o @env1:_listdir: {} kw: nil.

	self assert: (result isKindOf: OrderedCollection).
	self deny: result isEmpty
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testListdirWithPath
	"Test os.listdir() with path"

	| o result |
	o := os @env1:instance.
	result := o @env1:listdir: '/tmp'.

	self assert: (result isKindOf: OrderedCollection)
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testLstat
	"Test os.lstat()"

	| o testFile file statResult |
	o := os @env1:instance.
	testFile := '/tmp/grail_os_test_lstat'.

	"Clean up if it exists"
	(o @env1:exists: testFile) ifTrue: [
		o @env1:remove: testFile
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Get lstat"
	statResult := o @env1:lstat: testFile.

	"Verify lstat result is not nil"
	self assert: statResult notNil.

	"Clean up"
	o @env1:remove: testFile
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testMakedirs
	"Test os.makedirs() - recursive directory creation"

	| o testDir |
	o := os @env1:instance.
	testDir := '/tmp/grail_os_test_makedirs/level1/level2'.

	"Clean up if it exists"
	(o @env1:exists: '/tmp/grail_os_test_makedirs') ifTrue: [
		o @env1:rmdir: '/tmp/grail_os_test_makedirs/level1/level2'.
		o @env1:rmdir: '/tmp/grail_os_test_makedirs/level1'.
		o @env1:rmdir: '/tmp/grail_os_test_makedirs'
	].

	"Create nested directories"
	o @env1:makedirs: testDir.

	"Verify all levels exist"
	self assert: (o @env1:exists: '/tmp/grail_os_test_makedirs').
	self assert: (o @env1:exists: '/tmp/grail_os_test_makedirs/level1').
	self assert: (o @env1:exists: testDir).

	"Clean up"
	o @env1:rmdir: '/tmp/grail_os_test_makedirs/level1/level2'.
	o @env1:rmdir: '/tmp/grail_os_test_makedirs/level1'.
	o @env1:rmdir: '/tmp/grail_os_test_makedirs'
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testMkdir
	"Test os.mkdir()"

	| o testDir |
	o := os @env1:instance.
	testDir := '/tmp/grail_os_test_mkdir'.

	"Clean up if it exists"
		(o @env1:exists: testDir) ifTrue: [
			o @env1:rmdir: testDir
	].

	"Create directory"
	o @env1:mkdir: testDir.

	"Verify it exists and is a directory"
	self assert: (o @env1:exists: testDir).
	self assert: (o @env1:isdir: testDir).

	"Clean up"
	o @env1:rmdir: testDir
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testMkdirWithMode
	"Test os.mkdir() with mode"

	| o testDir |
	o := os @env1:instance.
	testDir := '/tmp/grail_os_test_mkdir_mode'.

	"Clean up if it exists"
		(o @env1:exists: testDir) ifTrue: [
			o @env1:rmdir: testDir
	].

	"Create directory with mode"
	o @env1:mkdir: testDir _: 493.

	"Verify it exists"
	self assert: (o @env1:exists: testDir).

	"Clean up"
	o @env1:rmdir: testDir
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathAbspath
	"Test os.path.abspath()"

	| o path result cwd |
	o := os @env1:instance.
	path := o @env1:path.
	cwd := o @env1:getcwd.

	"Absolute path should remain absolute"
	result := path @env1:abspath: '/usr/bin'.
	self assert: result equals: '/usr/bin'.

	"Relative path should become absolute"
	result := path @env1:abspath: 'file.txt'.
	self assert: (path @env1:isabs: result).
	self assert: (result endsWith: 'file.txt')
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathBasename
	"Test os.path.basename()"

	| o path result |
	o := os @env1:instance.
	path := o @env1:path.

	result := path @env1:basename: '/usr/bin/python'.
	self assert: result equals: 'python'.

	result := path @env1:basename: '/usr/bin/'.
	self assert: result equals: 'bin'.

	result := path @env1:basename: '/usr/'.
	self assert: result equals: 'usr'.

	result := path @env1:basename: 'python'.
	self assert: result equals: 'python'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathCommonpath
	"Test os.path.commonpath()"

	| o path result paths |
	o := os @env1:instance.
	path := o @env1:path.

	paths := OrderedCollection with: '/usr/lib/python3' with: '/usr/lib/python2'.
	result := path @env1:commonpath: paths.
	self assert: result equals: '/usr/lib'.

	paths := OrderedCollection with: '/usr/lib/python3' with: '/usr/local/lib'.
	result := path @env1:commonpath: paths.
	self assert: result equals: '/usr'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathCommonprefix
	"Test os.path.commonprefix()"

	| o path result paths |
	o := os @env1:instance.
	path := o @env1:path.

	paths := OrderedCollection with: '/usr/lib' with: '/usr/lib/python3'.
	result := path @env1:commonprefix: paths.
	self assert: result equals: '/usr/lib'.

	paths := OrderedCollection with: '/usr/lib' with: '/usr/local/lib'.
	result := path @env1:commonprefix: paths.
	self assert: result equals: '/usr/l'.

	paths := OrderedCollection with: 'file1.txt' with: 'file2.txt'.
	result := path @env1:commonprefix: paths.
	self assert: result equals: 'file'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathDirname
	"Test os.path.dirname()"

	| o path result |
	o := os @env1:instance.
	path := o @env1:path.

	result := path @env1:dirname: '/usr/bin/python'.
	self assert: result equals: '/usr/bin'.

	result := path @env1:dirname: '/usr/bin/'.
	self assert: result equals: '/usr'.

	result := path @env1:dirname: 'python'.
	self assert: result equals: '.'.

	result := path @env1:dirname: '/'.
	self assert: result equals: '/'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathExists
	"Test os.path.exists()"

	| o path |
	o := os @env1:instance.
	path := o @env1:path.

	"Test with existing path"
	self assert: (o @env1:exists: '/tmp').

	"Test with non-existing path"
	self deny: (o @env1:exists: '/tmp/grail_os_path_test_nonexistent_xyz123')
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathIntegration
	"Test integration of multiple os.path functions"

	| o path result paths |
	o := os @env1:instance.
	path := o @env1:path.

	"Join paths, then split"
	paths := OrderedCollection with: '/usr' with: 'local'.
	result := path @env1:join: paths.
	result := path @env1:split: result.
	self assert: (result at: 1) equals: '/usr'.
	self assert: (result at: 2) equals: 'local'.

	"Get basename and dirname"
	paths := OrderedCollection with: '/usr' with: 'bin/python'.
	result := path @env1:join: paths.
	self assert: (path @env1:basename: result) equals: 'python'.
	self assert: (path @env1:dirname: result) equals: '/usr/bin'.

	"Normalize and get absolute path"
	result := path @env1:normpath: 'usr/../bin/python'.
	result := path @env1:abspath: result.
	self assert: (path @env1:isabs: result)
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathIsabs
	"Test os.path.isabs()"

	| o path |
	o := os @env1:instance.
	path := o @env1:path.

	self assert: (path @env1:isabs: '/usr/bin').
	self assert: (path @env1:isabs: '/').
	self deny: (path @env1:isabs: 'usr/bin').
	self deny: (path @env1:isabs: 'file.txt')
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathIsdir
	"Test os.path.isdir()"

	| o path testDir |
	o := os @env1:instance.
	path := o @env1:path.
	testDir := '/tmp/grail_os_path_test_isdir'.

	"Clean up if it exists"
		(o @env1:exists: testDir) ifTrue: [
			o @env1:rmdir: testDir
	].

	"Create directory"
	o @env1:mkdir: testDir.

	"Test isdir"
	self assert: (o @env1:isdir: testDir).
	self deny: (o @env1:isdir: '/tmp/grail_os_path_test_isdir_nonexistent').

	"Clean up"
	o @env1:rmdir: testDir
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathIsfile
	"Test os.path.isfile()"

	| o path testFile file |
	o := os @env1:instance.
	path := o @env1:path.
	testFile := '/tmp/grail_os_path_test_isfile'.

	"Clean up if it exists"
	(o @env1:exists: testFile) ifTrue: [
		o @env1:remove: testFile
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Test isfile"
	self assert: (o @env1:isfile: testFile).
	self deny: (o @env1:isfile: '/tmp/grail_os_path_test_isfile_nonexistent').

	"Test that directory is not a file"
	self deny: (o @env1:isfile: '/tmp').

	"Clean up"
	o @env1:remove: testFile
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathJoin
	"Test os.path.join() with paths"

	| o path result paths |
	o := os @env1:instance.
	path := o @env1:path.

	paths := OrderedCollection with: '/usr' with: 'bin'.
	result := path @env1:join: paths.
	self assert: result equals: '/usr/bin'.

	paths := OrderedCollection with: '/usr/' with: 'bin'.
	result := path @env1:join: paths.
	self assert: result equals: '/usr/bin'.

	paths := OrderedCollection with: '/usr' with: '/bin'.
	result := path @env1:join: paths.
	self assert: result equals: '/bin'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathJoinAll
	"Test os.path.join() with collection (already covered by testPathJoinMultiple, but keeping for completeness)"

	| o path result paths |
	o := os @env1:instance.
	path := o @env1:path.

	paths := OrderedCollection with: '/usr' with: 'local' with: 'bin'.
	result := path @env1:join: paths.
	self assert: result equals: '/usr/local/bin'.

	paths := OrderedCollection with: 'home' with: 'user' with: 'docs'.
	result := path @env1:join: paths.
	self assert: result equals: 'home/user/docs'.

	paths := OrderedCollection with: '/usr/'.
	result := path @env1:join: paths.
	self assert: result equals: '/usr/'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathJoinMultiple
	"Test os.path.join() with multiple paths"

	| o path result paths |
	o := os @env1:instance.
	path := o @env1:path.

	paths := OrderedCollection with: '/usr' with: 'local' with: 'bin'.
	result := path @env1:join: paths.
	self assert: result equals: '/usr/local/bin'.

	paths := OrderedCollection with: 'home' with: 'user' with: 'docs' with: 'file.txt'.
	result := path @env1:join: paths.
	self assert: result equals: 'home/user/docs/file.txt'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathNormpath
	"Test os.path.normpath()"

	| o path result |
	o := os @env1:instance.
	path := o @env1:path.

	result := path @env1:normpath: '/usr/../usr/bin'.
	self assert: result equals: '/usr/bin'.

	result := path @env1:normpath: '/usr/./bin'.
	self assert: result equals: '/usr/bin'.

	result := path @env1:normpath: 'usr/../bin'.
	self assert: result equals: 'bin'.

	result := path @env1:normpath: 'usr/./bin'.
	self assert: result equals: 'usr/bin'.

	result := path @env1:normpath: '/usr//bin'.
	self assert: result equals: '/usr/bin'.

	result := path @env1:normpath: '..'.
	self assert: result equals: '..'.

	result := path @env1:normpath: '.'.
	self assert: result equals: '.'
%

category: 'Grail-Tests - Constants'
method: OsTestCase
testPathsep
	"Test os.pathsep constant"

	| o result |
	o := os @env1:instance.
	result := o @env1:pathsep.

	self assert: result equals: ':'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathSplit
	"Test os.path.split()"

	| o path result |
	o := os @env1:instance.
	path := o @env1:path.

	result := path @env1:split: '/usr/bin/python'.
	self assert: (result size) equals: 2.
	self assert: (result at: 1) equals: '/usr/bin'.
	self assert: (result at: 2) equals: 'python'.

	result := path @env1:split: '/usr/bin/'.
	self assert: (result at: 1) equals: '/usr/bin'.
	self assert: (result at: 2) equals: ''.

	result := path @env1:split: 'python'.
	self assert: (result at: 1) equals: ''.
	self assert: (result at: 2) equals: 'python'
%

category: 'Grail-Tests - Path Manipulation'
method: OsTestCase
testPathSplitext
	"Test os.path.splitext()"

	| o path result |
	o := os @env1:instance.
	path := o @env1:path.

	result := path @env1:splitext: 'file.txt'.
	self assert: (result size) equals: 2.
	self assert: (result at: 1) equals: 'file'.
	self assert: (result at: 2) equals: '.txt'.

	result := path @env1:splitext: '/path/to/file.txt'.
	self assert: (result at: 1) equals: '/path/to/file'.
	self assert: (result at: 2) equals: '.txt'.

	result := path @env1:splitext: 'file'.
	self assert: (result at: 1) equals: 'file'.
	self assert: (result at: 2) equals: ''.

	result := path @env1:splitext: '.hidden'.
	self assert: (result at: 1) equals: '.hidden'.
	self assert: (result at: 2) equals: ''
%

category: 'Grail-Tests - Environment Variables'
method: OsTestCase
testPutenv
	"Test os.putenv() - set environment variable"

	| o testVar testValue result |
	o := os @env1:instance.
	testVar := 'GRAIL_TEST_PUTENV_VAR'.
	testValue := 'test_value_123'.

	"Set the environment variable"
	o @env1:putenv: testVar _: testValue.

	"Get it back"
	result := o @env1:getenv: testVar.

	"Should match what we set"
	self assert: result equals: testValue
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testRemove
	"Test os.remove() - remove file"

	| o testFile file |
	o := os @env1:instance.
	testFile := '/tmp/grail_os_test_remove'.

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Verify it exists"
	self assert: (o @env1:exists: testFile).

	"Remove it"
	o @env1:remove: testFile.

	"Verify it's gone"
	self deny: (o @env1:exists: testFile)
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testRename
	"Test os.rename() - rename file"

	| o oldPath newPath file |
	o := os @env1:instance.
	oldPath := '/tmp/grail_os_test_rename_old'.
	newPath := '/tmp/grail_os_test_rename_new'.

	"Clean up if they exist"
	(o @env1:exists: oldPath) ifTrue: [
		o @env1:remove: oldPath
	].
	(o @env1:exists: newPath) ifTrue: [
		o @env1:remove: newPath
	].

	"Create a test file"
	file := GsFile open: oldPath mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Verify old file exists"
	self assert: (o @env1:exists: oldPath).

	"Rename it"
	o @env1:rename: oldPath _: newPath.

	"Verify old file is gone and new file exists"
	self deny: (o @env1:exists: oldPath).
	self assert: (o @env1:exists: newPath).

	"Clean up"
	o @env1:remove: newPath
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testRmdir
	"Test os.rmdir() - remove directory"

	| o testDir |
	o := os @env1:instance.
	testDir := '/tmp/grail_os_test_rmdir'.

	"Clean up if it exists"
		(o @env1:exists: testDir) ifTrue: [
			o @env1:rmdir: testDir
	].

	"Create directory"
	o @env1:mkdir: testDir.

	"Verify it exists"
	self assert: (o @env1:exists: testDir).

	"Remove it"
	o @env1:rmdir: testDir.

	"Verify it's gone"
	self deny: (o @env1:exists: testDir)
%

category: 'Grail-Tests - Constants'
method: OsTestCase
testSep
	"Test os.sep constant"

	| o result |
	o := os @env1:instance.
	result := o @env1:sep.

	self assert: result equals: '/'
%

category: 'Grail-Tests - File and Directory Operations'
method: OsTestCase
testStat
	"Test os.stat()"

	| o testFile file statResult |
	o := os @env1:instance.
	testFile := '/tmp/grail_os_test_stat'.

	"Clean up if it exists"
	(o @env1:exists: testFile) ifTrue: [
		o @env1:remove: testFile
	].

	"Create a test file"
	file := GsFile open: testFile mode: 'w' onClient: false.
	file nextPutAll: 'test content'.
	file close.

	"Get stat"
	statResult := o @env1:stat: testFile.

	"Verify stat result is not nil"
	self assert: statResult notNil.

	"Clean up"
	o @env1:remove: testFile
%

category: 'Grail-Tests - Process Management'
method: OsTestCase
testSystem
	"Test os.system() - execute shell command"

	| o result |
	o := os @env1:instance.

	"Execute a simple command"
	result := o @env1:system: 'echo "test"'.

	"Result should not be nil (exit code or output)"
	self assert: result notNil
%
