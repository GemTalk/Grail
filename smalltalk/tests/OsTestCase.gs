! ===============================================================================
! OsTestCase - Tests for Python os module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
OsTestCase removeAllMethods: 0.
OsTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for OsTestCase

category: 'Tests - Constants'
method: OsTestCase
testSep
	"Test os.sep constant"

	| o result |
	o := os new.
	result := o perform: #sep env: 2.

	self assert: result equals: '/'
%

category: 'Tests - Constants'
method: OsTestCase
testPathsep
	"Test os.pathsep constant"

	| o result |
	o := os new.
	result := o perform: #pathsep env: 2.

	self assert: result equals: ':'
%

category: 'Tests - Constants'
method: OsTestCase
testLinesep
	"Test os.linesep constant"

	| o result |
	o := os new.
	result := o perform: #linesep env: 2.

	self assert: (result size) equals: 1
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testGetcwd
	"Test os.getcwd()"

	| o result |
	o := os new.
	result := o perform: #getcwd env: 2.

	self assert: (result isKindOf: String).
	self deny: result isEmpty
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testChdir
	"Test os.chdir()"

	| o originalCwd testDir newCwd |
	o := os new.
	originalCwd := o perform: #getcwd env: 2.
	testDir := '/tmp'.

	"Change to test directory"
	o perform: #chdir: env: 2 withArguments: {testDir}.
	newCwd := o perform: #getcwd env: 2.

	self assert: (newCwd perform: #includesString: env: 0 withArguments: {testDir}).

	"Change back to original directory"
	o perform: #chdir: env: 2 withArguments: {originalCwd}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testMkdir
	"Test os.mkdir()"

	| o testDir |
	o := os new.
	testDir := '/tmp/grail_os_test_mkdir'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testDir}) ifTrue: [
		o perform: #rmdir: env: 2 withArguments: {testDir}
	].

	"Create directory"
	o perform: #mkdir: env: 2 withArguments: {testDir}.

	"Verify it exists and is a directory"
	self assert: (o perform: #exists: env: 2 withArguments: {testDir}).
	self assert: (o perform: #isdir: env: 2 withArguments: {testDir}).

	"Clean up"
	o perform: #rmdir: env: 2 withArguments: {testDir}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testMkdirWithMode
	"Test os.mkdir() with mode"

	| o testDir |
	o := os new.
	testDir := '/tmp/grail_os_test_mkdir_mode'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testDir}) ifTrue: [
		o perform: #rmdir: env: 2 withArguments: {testDir}
	].

	"Create directory with mode"
	o perform: #mkdir:_: env: 2 withArguments: {testDir. 493}.

	"Verify it exists"
	self assert: (o perform: #exists: env: 2 withArguments: {testDir}).

	"Clean up"
	o perform: #rmdir: env: 2 withArguments: {testDir}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testMakedirs
	"Test os.makedirs() - recursive directory creation"

	| o testDir |
	o := os new.
	testDir := '/tmp/grail_os_test_makedirs/level1/level2'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {'/tmp/grail_os_test_makedirs'}) ifTrue: [
		o perform: #rmdir: env: 2 withArguments: {'/tmp/grail_os_test_makedirs/level1/level2'}.
		o perform: #rmdir: env: 2 withArguments: {'/tmp/grail_os_test_makedirs/level1'}.
		o perform: #rmdir: env: 2 withArguments: {'/tmp/grail_os_test_makedirs'}
	].

	"Create nested directories"
	o perform: #makedirs: env: 2 withArguments: {testDir}.

	"Verify all levels exist"
	self assert: (o perform: #exists: env: 2 withArguments: {'/tmp/grail_os_test_makedirs'}).
	self assert: (o perform: #exists: env: 2 withArguments: {'/tmp/grail_os_test_makedirs/level1'}).
	self assert: (o perform: #exists: env: 2 withArguments: {testDir}).

	"Clean up"
	o perform: #rmdir: env: 2 withArguments: {'/tmp/grail_os_test_makedirs/level1/level2'}.
	o perform: #rmdir: env: 2 withArguments: {'/tmp/grail_os_test_makedirs/level1'}.
	o perform: #rmdir: env: 2 withArguments: {'/tmp/grail_os_test_makedirs'}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testListdir
	"Test os.listdir()"

	| o result |
	o := os new.
	result := o perform: #listdir env: 2.

	self assert: (result isKindOf: OrderedCollection).
	self deny: result isEmpty
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testListdirWithPath
	"Test os.listdir() with path"

	| o result |
	o := os new.
	result := o perform: #listdir: env: 2 withArguments: {'/tmp'}.

	self assert: (result isKindOf: OrderedCollection)
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testRemove
	"Test os.remove() - remove file"

	| o testFile file |
	o := os new.
	testFile := '/tmp/grail_os_test_remove'.

	"Create a test file"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {testFile. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Verify it exists"
	self assert: (o perform: #exists: env: 2 withArguments: {testFile}).

	"Remove it"
	o perform: #remove: env: 2 withArguments: {testFile}.

	"Verify it's gone"
	self deny: (o perform: #exists: env: 2 withArguments: {testFile})
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testRmdir
	"Test os.rmdir() - remove directory"

	| o testDir |
	o := os new.
	testDir := '/tmp/grail_os_test_rmdir'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testDir}) ifTrue: [
		o perform: #rmdir: env: 2 withArguments: {testDir}
	].

	"Create directory"
	o perform: #mkdir: env: 2 withArguments: {testDir}.

	"Verify it exists"
	self assert: (o perform: #exists: env: 2 withArguments: {testDir}).

	"Remove it"
	o perform: #rmdir: env: 2 withArguments: {testDir}.

	"Verify it's gone"
	self deny: (o perform: #exists: env: 2 withArguments: {testDir})
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testRename
	"Test os.rename() - rename file"

	| o oldPath newPath file |
	o := os new.
	oldPath := '/tmp/grail_os_test_rename_old'.
	newPath := '/tmp/grail_os_test_rename_new'.

	"Clean up if they exist"
	(o perform: #exists: env: 2 withArguments: {oldPath}) ifTrue: [
		o perform: #remove: env: 2 withArguments: {oldPath}
	].
	(o perform: #exists: env: 2 withArguments: {newPath}) ifTrue: [
		o perform: #remove: env: 2 withArguments: {newPath}
	].

	"Create a test file"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {oldPath. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Verify old file exists"
	self assert: (o perform: #exists: env: 2 withArguments: {oldPath}).

	"Rename it"
	o perform: #rename:_: env: 2 withArguments: {oldPath. newPath}.

	"Verify old file is gone and new file exists"
	self deny: (o perform: #exists: env: 2 withArguments: {oldPath}).
	self assert: (o perform: #exists: env: 2 withArguments: {newPath}).

	"Clean up"
	o perform: #remove: env: 2 withArguments: {newPath}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testExists
	"Test os.exists()"

	| o |
	o := os new.

	"Test with existing path"
	self assert: (o perform: #exists: env: 2 withArguments: {'/tmp'}).

	"Test with non-existing path"
	self deny: (o perform: #exists: env: 2 withArguments: {'/tmp/grail_os_test_nonexistent_xyz123'})
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testIsdir
	"Test os.isdir()"

	| o testDir |
	o := os new.
	testDir := '/tmp/grail_os_test_isdir'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testDir}) ifTrue: [
		o perform: #rmdir: env: 2 withArguments: {testDir}
	].

	"Create directory"
	o perform: #mkdir: env: 2 withArguments: {testDir}.

	"Test isdir"
	self assert: (o perform: #isdir: env: 2 withArguments: {testDir}).
	self deny: (o perform: #isdir: env: 2 withArguments: {'/tmp/grail_os_test_isdir_nonexistent'}).

	"Clean up"
	o perform: #rmdir: env: 2 withArguments: {testDir}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testIsfile
	"Test os.isfile()"

	| o testFile file |
	o := os new.
	testFile := '/tmp/grail_os_test_isfile'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testFile}) ifTrue: [
		o perform: #remove: env: 2 withArguments: {testFile}
	].

	"Create a test file"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {testFile. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Test isfile"
	self assert: (o perform: #isfile: env: 2 withArguments: {testFile}).
	self deny: (o perform: #isfile: env: 2 withArguments: {'/tmp/grail_os_test_isfile_nonexistent'}).

	"Test that directory is not a file"
	self deny: (o perform: #isfile: env: 2 withArguments: {'/tmp'}).

	"Clean up"
	o perform: #remove: env: 2 withArguments: {testFile}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testStat
	"Test os.stat()"

	| o testFile file statResult |
	o := os new.
	testFile := '/tmp/grail_os_test_stat'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testFile}) ifTrue: [
		o perform: #remove: env: 2 withArguments: {testFile}
	].

	"Create a test file"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {testFile. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Get stat"
	statResult := o perform: #stat: env: 2 withArguments: {testFile}.

	"Verify stat result is not nil"
	self assert: statResult notNil.

	"Clean up"
	o perform: #remove: env: 2 withArguments: {testFile}
%

category: 'Tests - File and Directory Operations'
method: OsTestCase
testLstat
	"Test os.lstat()"

	| o testFile file statResult |
	o := os new.
	testFile := '/tmp/grail_os_test_lstat'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testFile}) ifTrue: [
		o perform: #remove: env: 2 withArguments: {testFile}
	].

	"Create a test file"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {testFile. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Get lstat"
	statResult := o perform: #lstat: env: 2 withArguments: {testFile}.

	"Verify lstat result is not nil"
	self assert: statResult notNil.

	"Clean up"
	o perform: #remove: env: 2 withArguments: {testFile}
%

category: 'Tests - Process Management'
method: OsTestCase
testSystem
	"Test os.system() - execute shell command"

	| o result |
	o := os new.

	"Execute a simple command"
	result := o perform: #system: env: 2 withArguments: {'echo "test"'}.

	"Result should not be nil (exit code or output)"
	self assert: result notNil
%

category: 'Tests - Environment Variables'
method: OsTestCase
testGetenv
	"Test os.getenv() - get environment variable"

	| o result |
	o := os new.

	"Try to get a common environment variable (may or may not exist)"
	result := o perform: #getenv: env: 2 withArguments: {'PATH'}.

	"Result may be nil or a string"
	(result notNil) ifTrue: [
		self assert: (result isKindOf: String)
	]
%

category: 'Tests - Environment Variables'
method: OsTestCase
testGetenvWithDefault
	"Test os.getenv() with default value"

	| o result default |
	o := os new.
	default := 'default_value'.

	"Try to get a non-existent environment variable"
	result := o perform: #getenv:_: env: 2 withArguments: {'GRAIL_TEST_NONEXISTENT_VAR_XYZ123'. default}.

	"Should return default value"
	self assert: result equals: default
%

category: 'Tests - Environment Variables'
method: OsTestCase
testPutenv
	"Test os.putenv() - set environment variable"

	| o testVar testValue result |
	o := os new.
	testVar := 'GRAIL_TEST_PUTENV_VAR'.
	testValue := 'test_value_123'.

	"Set the environment variable"
	o perform: #putenv:_: env: 2 withArguments: {testVar. testValue}.

	"Get it back"
	result := o perform: #getenv: env: 2 withArguments: {testVar}.

	"Should match what we set"
	self assert: result equals: testValue
%

category: 'Tests - Integration'
method: OsTestCase
testFileOperationsSequence
	"Test a sequence of file operations"

	| o testDir testFile file listResult |
	o := os new.
	testDir := '/tmp/grail_os_test_sequence'.
	testFile := testDir , '/test_file.txt'.

	"Clean up if it exists"
	(o perform: #exists: env: 2 withArguments: {testDir}) ifTrue: [
		(o perform: #exists: env: 2 withArguments: {testFile}) ifTrue: [
			o perform: #remove: env: 2 withArguments: {testFile}
		].
		o perform: #rmdir: env: 2 withArguments: {testDir}
	].

	"Create directory"
	o perform: #mkdir: env: 2 withArguments: {testDir}.
	self assert: (o perform: #isdir: env: 2 withArguments: {testDir}).

	"List directory (should be empty or have minimal entries)"
	listResult := o perform: #listdir: env: 2 withArguments: {testDir}.
	self assert: (listResult isKindOf: OrderedCollection).

	"Create file in directory"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {testFile. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Verify file exists"
	self assert: (o perform: #exists: env: 2 withArguments: {testFile}).
	self assert: (o perform: #isfile: env: 2 withArguments: {testFile}).

	"List directory again (should now include our file)"
	listResult := o perform: #listdir: env: 2 withArguments: {testDir}.
	self assert: (listResult perform: #includes: env: 0 withArguments: {'test_file.txt'}).

	"Remove file"
	o perform: #remove: env: 2 withArguments: {testFile}.
	self deny: (o perform: #exists: env: 2 withArguments: {testFile}).

	"Remove directory"
	o perform: #rmdir: env: 2 withArguments: {testDir}.
	self deny: (o perform: #exists: env: 2 withArguments: {testDir})
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathJoin
	"Test os.path.join() with two paths"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #join:_: env: 2 withArguments: {'/usr'. 'bin'}.
	self assert: result equals: '/usr/bin'.

	result := path perform: #join:_: env: 2 withArguments: {'/usr/'. 'bin'}.
	self assert: result equals: '/usr/bin'.

	result := path perform: #join:_: env: 2 withArguments: {'/usr'. '/bin'}.
	self assert: result equals: '/bin'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathJoinMultiple
	"Test os.path.join() with multiple paths"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #join:_:_: env: 2 withArguments: {'/usr'. 'local'. 'bin'}.
	self assert: result equals: '/usr/local/bin'.

	result := path perform: #join:_:_:_: env: 2 withArguments: {'home'. 'user'. 'docs'. 'file.txt'}.
	self assert: result equals: 'home/user/docs/file.txt'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathBasename
	"Test os.path.basename()"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #basename: env: 2 withArguments: {'/usr/bin/python'}.
	self assert: result equals: 'python'.

	result := path perform: #basename: env: 2 withArguments: {'/usr/bin/'}.
	self assert: result equals: 'bin'.

	result := path perform: #basename: env: 2 withArguments: {'/usr/'}.
	self assert: result equals: 'usr'.

	result := path perform: #basename: env: 2 withArguments: {'python'}.
	self assert: result equals: 'python'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathDirname
	"Test os.path.dirname()"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #dirname: env: 2 withArguments: {'/usr/bin/python'}.
	self assert: result equals: '/usr/bin'.

	result := path perform: #dirname: env: 2 withArguments: {'/usr/bin/'}.
	self assert: result equals: '/usr'.

	result := path perform: #dirname: env: 2 withArguments: {'python'}.
	self assert: result equals: '.'.

	result := path perform: #dirname: env: 2 withArguments: {'/'}.
	self assert: result equals: '/'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathSplit
	"Test os.path.split()"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #split: env: 2 withArguments: {'/usr/bin/python'}.
	self assert: (result size) equals: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: '/usr/bin'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 'python'.

	result := path perform: #split: env: 2 withArguments: {'/usr/bin/'}.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: '/usr/bin'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: ''.

	result := path perform: #split: env: 2 withArguments: {'python'}.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: ''.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 'python'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathSplitext
	"Test os.path.splitext()"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #splitext: env: 2 withArguments: {'file.txt'}.
	self assert: (result size) equals: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 'file'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: '.txt'.

	result := path perform: #splitext: env: 2 withArguments: {'/path/to/file.txt'}.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: '/path/to/file'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: '.txt'.

	result := path perform: #splitext: env: 2 withArguments: {'file'}.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 'file'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: ''.

	result := path perform: #splitext: env: 2 withArguments: {'.hidden'}.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: '.hidden'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: ''
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIsabs
	"Test os.path.isabs()"

	| o path |
	o := os new.
	path := o perform: #path env: 2.

	self assert: (path perform: #isabs: env: 2 withArguments: {'/usr/bin'}).
	self assert: (path perform: #isabs: env: 2 withArguments: {'/'}).
	self deny: (path perform: #isabs: env: 2 withArguments: {'usr/bin'}).
	self deny: (path perform: #isabs: env: 2 withArguments: {'file.txt'})
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathNormpath
	"Test os.path.normpath()"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	result := path perform: #normpath: env: 2 withArguments: {'/usr/../usr/bin'}.
	self assert: result equals: '/usr/bin'.

	result := path perform: #normpath: env: 2 withArguments: {'/usr/./bin'}.
	self assert: result equals: '/usr/bin'.

	result := path perform: #normpath: env: 2 withArguments: {'usr/../bin'}.
	self assert: result equals: 'bin'.

	result := path perform: #normpath: env: 2 withArguments: {'usr/./bin'}.
	self assert: result equals: 'usr/bin'.

	result := path perform: #normpath: env: 2 withArguments: {'/usr//bin'}.
	self assert: result equals: '/usr/bin'.

	result := path perform: #normpath: env: 2 withArguments: {'..'}.
	self assert: result equals: '..'.

	result := path perform: #normpath: env: 2 withArguments: {'.'}.
	self assert: result equals: '.'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathAbspath
	"Test os.path.abspath()"

	| o path result cwd |
	o := os new.
	path := o perform: #path env: 2.
	cwd := o perform: #getcwd env: 2.

	"Absolute path should remain absolute"
	result := path perform: #abspath: env: 2 withArguments: {'/usr/bin'}.
	self assert: result equals: '/usr/bin'.

	"Relative path should become absolute"
	result := path perform: #abspath: env: 2 withArguments: {'file.txt'}.
	self assert: (path perform: #isabs: env: 2 withArguments: {result}).
	self assert: (result perform: #endsWith: env: 0 withArguments: {'file.txt'})
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathExists
	"Test os.path.exists()"

	| o path |
	o := os new.
	path := o perform: #path env: 2.

	"Test with existing path"
	self assert: (path perform: #exists: env: 2 withArguments: {'/tmp'}).

	"Test with non-existing path"
	self deny: (path perform: #exists: env: 2 withArguments: {'/tmp/grail_os_path_test_nonexistent_xyz123'})
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIsdir
	"Test os.path.isdir()"

	| o path testDir |
	o := os new.
	path := o perform: #path env: 2.
	testDir := '/tmp/grail_os_path_test_isdir'.

	"Clean up if it exists"
	(path perform: #exists: env: 2 withArguments: {testDir}) ifTrue: [
		o perform: #rmdir: env: 2 withArguments: {testDir}
	].

	"Create directory"
	o perform: #mkdir: env: 2 withArguments: {testDir}.

	"Test isdir"
	self assert: (path perform: #isdir: env: 2 withArguments: {testDir}).
	self deny: (path perform: #isdir: env: 2 withArguments: {'/tmp/grail_os_path_test_isdir_nonexistent'}).

	"Clean up"
	o perform: #rmdir: env: 2 withArguments: {testDir}
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIsfile
	"Test os.path.isfile()"

	| o path testFile file |
	o := os new.
	path := o perform: #path env: 2.
	testFile := '/tmp/grail_os_path_test_isfile'.

	"Clean up if it exists"
	(path perform: #exists: env: 2 withArguments: {testFile}) ifTrue: [
		o perform: #remove: env: 2 withArguments: {testFile}
	].

	"Create a test file"
	file := GsFile perform: #open:mode:onClient: env: 0 withArguments: {testFile. 'w'. false}.
	file perform: #nextPutAll: env: 0 withArguments: {'test content'}.
	file perform: #close env: 0.

	"Test isfile"
	self assert: (path perform: #isfile: env: 2 withArguments: {testFile}).
	self deny: (path perform: #isfile: env: 2 withArguments: {'/tmp/grail_os_path_test_isfile_nonexistent'}).

	"Test that directory is not a file"
	self deny: (path perform: #isfile: env: 2 withArguments: {'/tmp'}).

	"Clean up"
	o perform: #remove: env: 2 withArguments: {testFile}
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathCommonprefix
	"Test os.path.commonprefix()"

	| o path result paths |
	o := os new.
	path := o perform: #path env: 2.

	paths := OrderedCollection with: '/usr/lib' with: '/usr/lib/python3'.
	result := path perform: #commonprefix: env: 2 withArguments: {paths}.
	self assert: result equals: '/usr/lib'.

	paths := OrderedCollection with: '/usr/lib' with: '/usr/local/lib'.
	result := path perform: #commonprefix: env: 2 withArguments: {paths}.
	self assert: result equals: '/usr/l'.

	paths := OrderedCollection with: 'file1.txt' with: 'file2.txt'.
	result := path perform: #commonprefix: env: 2 withArguments: {paths}.
	self assert: result equals: 'file'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathCommonpath
	"Test os.path.commonpath()"

	| o path result paths |
	o := os new.
	path := o perform: #path env: 2.

	paths := OrderedCollection with: '/usr/lib/python3' with: '/usr/lib/python2'.
	result := path perform: #commonpath: env: 2 withArguments: {paths}.
	self assert: result equals: '/usr/lib'.

	paths := OrderedCollection with: '/usr/lib/python3' with: '/usr/local/lib'.
	result := path perform: #commonpath: env: 2 withArguments: {paths}.
	self assert: result equals: '/usr'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathJoinAll
	"Test os.path.joinAll() with collection"

	| o path result paths |
	o := os new.
	path := o perform: #path env: 2.

	paths := OrderedCollection with: '/usr' with: 'local' with: 'bin'.
	result := path perform: #joinAll: env: 2 withArguments: {paths}.
	self assert: result equals: '/usr/local/bin'.

	paths := OrderedCollection with: 'home' with: 'user' with: 'docs'.
	result := path perform: #joinAll: env: 2 withArguments: {paths}.
	self assert: result equals: 'home/user/docs'.

	paths := OrderedCollection with: '/usr/'.
	result := path perform: #joinAll: env: 2 withArguments: {paths}.
	self assert: result equals: '/usr/'
%

category: 'Tests - Path Manipulation'
method: OsTestCase
testPathIntegration
	"Test integration of multiple os.path functions"

	| o path result |
	o := os new.
	path := o perform: #path env: 2.

	"Join paths, then split"
	result := path perform: #join:_: env: 2 withArguments: {'/usr'. 'local'}.
	result := path perform: #split: env: 2 withArguments: {result}.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: '/usr'.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 'local'.

	"Get basename and dirname"
	result := path perform: #join:_: env: 2 withArguments: {'/usr'. 'bin/python'}.
	self assert: (path perform: #basename: env: 2 withArguments: {result}) equals: 'python'.
	self assert: (path perform: #dirname: env: 2 withArguments: {result}) equals: '/usr/bin'.

	"Normalize and get absolute path"
	result := path perform: #normpath: env: 2 withArguments: {'usr/../bin/python'}.
	result := path perform: #abspath: env: 2 withArguments: {result}.
	self assert: (path perform: #isabs: env: 2 withArguments: {result})
%

