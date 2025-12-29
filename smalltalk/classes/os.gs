! ===============================================================================
! os Module (Python 'os' module)
! ===============================================================================
! This file contains the Python os module implementation.
! The os module provides operating system interfaces for file and directory
! operations, process management, and environment variables.
! ===============================================================================

! ------------------- Remove existing Python methods from os
expectvalue /Metaclass3
doit
os removeAllMethods: 2.
os class removeAllMethods: 2.
%

set compile_env: 2
! ------------------- Class methods for os

category: 'Python-Singleton'
classmethod: os
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for os module'
%

category: 'Python-Singleton'
classmethod: os
instance
	"Return the singleton instance of os.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance perform: #initialize env: 2
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: os
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

! ------------------- Instance methods for os

category: 'Python-Initialization'
method: os
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_getcwd;
		initialize_chdir;
		initialize_listdir;
		initialize_mkdir;
		initialize_mkdirWithMode;
		initialize_makedirs;
		initialize_remove;
		initialize_rmdir;
		initialize_rename;
		initialize_exists;
		initialize_isdir;
		initialize_isfile;
		initialize_stat;
		initialize_lstat;
		initialize_system;
		initialize_getenv;
		initialize_getenvWithDefault;
		initialize_putenv;
		initialize_sep;
		initialize_pathsep;
		initialize_linesep;
		initialize_path;
		yourself
%

category: 'Python-Initialization'
method: os
initialize_getcwd
	"Return a string representing the current working directory"
	getcwd := [
		| result |
		result := GsFile perform: #_directoryPrim:with:with: env: 0 withArguments: {2. nil. nil}.
		(result ___isKindOf___: String) ifTrue: [result] ifFalse: [
			(result ___isKindOf___: Utf8) ifTrue: [result ___decodeToUnicode___] ifFalse: [
				(result ___isKindOf___: Utf16) ifTrue: [result ___decodeToUnicode___] ifFalse: [
					result ___asUnicodeString___
				]
			]
		]
	]
%

category: 'Python-Initialization'
method: os
initialize_chdir
	"Change the current working directory to path"
	chdir := [:path |
		| result |
		result := GsFile perform: #_directoryPrim:with:with: env: 0 withArguments: {0. path. nil}.
		result == nil ifTrue: [
			OSError ___signal___: ('Cannot change directory to: ' ___concat___: (path ___printString___))
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_listdir
	"Return a list containing the names of the entries in the directory given by path (or current directory if path is nil)"
	listdir := [:path |
		| dirContents result size i each decoded actualPath getcwdBlock |
		actualPath := path.
		actualPath == nil ifTrue: [
			getcwdBlock := self getcwd.
			actualPath := getcwdBlock value
		].
		dirContents := GsFile perform: #contentsOfDirectory:onClient: env: 0 withArguments: {actualPath. false}.
		(dirContents ___isKindOf___: Array) ifFalse: [
			OSError ___signal___: ('Cannot list directory: ' ___concat___: (actualPath ___printString___))
		].
		result := OrderedCollection ___new___.
		size := dirContents ___size___.
		1 ___to___: size do: [:i | | basename lastSlashIndex reversedPath reversedSep index |
			each := dirContents ___at___: i.
			decoded := each.
			(each ___isKindOf___: Utf8) ifTrue: [
				decoded := each ___decodeToUnicode___
			].
			(each ___isKindOf___: Utf16) ifTrue: [
				decoded := each ___decodeToUnicode___
			].
			(each ___isKindOf___: String) ifFalse: [
				decoded := each ___asUnicodeString___
			].
			"Extract basename if decoded contains a path separator (reverse and find)"
			reversedPath := decoded ___reverse___.
			reversedSep := '/' ___reverse___.
			index := reversedPath ___findString___: reversedSep startingAt: 1.
			(index ___eq___: 0) ifFalse: [
				"Convert back to original position: length - found_index + 1"
				lastSlashIndex := ((decoded ___size___) ___minus___: (index)) ___plus___: 1.
				basename := decoded ___copyFrom___: (lastSlashIndex ___plus___: 1) to: decoded ___size___.
				decoded := basename
			].
			result ___add___: decoded
		].
		result
	]
%

category: 'Python-Initialization'
method: os
initialize_mkdir
	"Create a directory named path"
	mkdir := [:path |
		| result |
		result := GsFile perform: #createServerDirectory: env: 0 withArguments: {path}.
		result == nil ifTrue: [
			OSError ___signal___: ('Cannot create directory: ' ___concat___: (path ___printString___))
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_mkdirWithMode
	"Create a directory named path with numeric mode"
	mkdirWithMode := [:path :mode |
		| result |
		result := GsFile perform: #createServerDirectory:mode: env: 0 withArguments: {path. mode}.
		result == nil ifTrue: [
			OSError ___signal___: ('Cannot create directory: ' ___concat___: (path ___printString___))
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_makedirs
	"Recursive directory creation function"
	makedirs := [:path |
		| parts currentPath size i part sep mkdirBlock |
		sep := '/'.
		parts := $/ ___split___: path.
		currentPath := ''.
		size := parts ___size___.
		mkdirBlock := self mkdir.
		1 ___to___: size do: [:i |
			part := parts ___at___: i.
			(part ___isEmpty___) ifFalse: [
				currentPath := (currentPath ___isEmpty___)
					ifTrue: [
						"Check if path is absolute - if first part was empty, start with separator"
						(path ___beginsWith___: sep)
							ifTrue: [sep ___concat___: part]
							ifFalse: [part]
					]
					ifFalse: [(currentPath ___concat___: sep) ___concat___: part].
				(GsFile ___existsOnServer___: currentPath) ifFalse: [
					mkdirBlock value: currentPath.
				].
			]
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_remove
	"Remove (delete) the file path"
	remove := [:path |
		| result |
		result := GsFile perform: #removeServerFile: env: 0 withArguments: {path}.
		result == nil ifTrue: [
			OSError ___signal___: ('Cannot remove file: ' ___concat___: (path ___printString___))
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_rmdir
	"Remove (delete) the directory path"
	rmdir := [:path |
		| result |
		result := GsFile perform: #removeServerDirectory: env: 0 withArguments: {path}.
		result == nil ifTrue: [
			OSError ___signal___: ('Cannot remove directory: ' ___concat___: (path ___printString___))
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_rename
	"Rename the file or directory from oldPath to newPath"
	rename := [:oldPath :newPath |
		| result msg |
		result := GsFile perform: #renameFileOnServer:to: env: 0 withArguments: {oldPath. newPath}.
		result == nil ifTrue: [
			msg := ((oldPath ___printString___) ___concat___: ' to ') ___concat___: (newPath ___printString___).
			OSError ___signal___: ('Cannot rename: ' ___concat___: msg)
		].
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_exists
	"Return True if path refers to an existing path"
	exists := [:path | GsFile ___existsOnServer___: path]
%

category: 'Python-Initialization'
method: os
initialize_isdir
	"Return True if path is an existing directory"
	isdir := [:path |
		| exists |
		exists := GsFile ___existsOnServer___: path.
		exists ifTrue: [
			GsFile perform: #isServerDirectory: env: 0 withArguments: {path}
		] ifFalse: [false]
	]
%

category: 'Python-Initialization'
method: os
initialize_isfile
	"Return True if path is an existing regular file"
	isfile := [:path |
		| exists isDir |
		exists := GsFile ___existsOnServer___: path.
		exists ifTrue: [
			isDir := GsFile perform: #isServerDirectory: env: 0 withArguments: {path}.
			isDir == false
		] ifFalse: [false]
	]
%

category: 'Python-Initialization'
method: os
initialize_stat
	"Get the status of a file or directory"
	stat := [:path |
		| statResult |
		statResult := GsFile perform: #stat:isLstat: env: 0 withArguments: {path. false}.
		statResult == nil ifTrue: [
			OSError ___signal___: ('Cannot stat: ' ___concat___: (path ___printString___))
		].
		statResult
	]
%

category: 'Python-Initialization'
method: os
initialize_lstat
	"Like stat(), but does not follow symbolic links"
	lstat := [:path |
		| statResult |
		statResult := GsFile perform: #stat:isLstat: env: 0 withArguments: {path. true}.
		statResult == nil ifTrue: [
			OSError ___signal___: ('Cannot lstat: ' ___concat___: (path ___printString___))
		].
		statResult
	]
%

category: 'Python-Initialization'
method: os
initialize_system
	"Execute the command (a string) in a subshell"
	system := [:command |
		| result |
		result := System perform: #performOnServer: env: 0 withArguments: {command}.
		result
	]
%

category: 'Python-Initialization'
method: os
initialize_getenv
	"Get an environment variable, return None if it doesn't exist"
	getenv := [:name |
		| result |
		result := System perform: #gemEnvironmentVariable: env: 0 withArguments: {name}.
		result
	]
%

category: 'Python-Initialization'
method: os
initialize_getenvWithDefault
	"Get an environment variable, return default if it doesn't exist"
	getenvWithDefault := [:name :default |
		| result |
		result := System perform: #gemEnvironmentVariable: env: 0 withArguments: {name}.
		result == nil ifTrue: [default] ifFalse: [result]
	]
%

category: 'Python-Initialization'
method: os
initialize_putenv
	"Set the environment variable named name to the string value"
	putenv := [:name :value |
		System perform: #gemEnvironmentVariable:put: env: 0 withArguments: {name. value}.
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_sep
	"The character used by the operating system to separate pathname components"
	sep := '/'
%

category: 'Python-Initialization'
method: os
initialize_pathsep
	"The character conventionally used by the operating system to separate search path components"
	pathsep := ':'
%

category: 'Python-Initialization'
method: os
initialize_linesep
	"The string used to separate (or, rather, terminate) lines on the current platform"
	linesep := (Character ___lf___) ___asString___
%

category: 'Python-Initialization'
method: os
initialize_path
	"Return the os.path module instance"
	path := os_path instance
%

category: 'Python-File and Directory Operations'
method: os
getcwd
	"Return the getcwd function"
	^ getcwd
%

category: 'Python-File and Directory Operations'
method: os
getcwd: aBlock
	"Set the getcwd function (for monkey patching)"
	getcwd := aBlock
%

category: 'Python-File and Directory Operations'
method: os
chdir
	"Return the chdir function"
	^ chdir
%

category: 'Python-File and Directory Operations'
method: os
chdir: aBlock
	"Set the chdir function (for monkey patching)"
	chdir := aBlock
%

category: 'Python-File and Directory Operations'
method: os
listdir
	"Return the listdir function"
	^ listdir
%

category: 'Python-File and Directory Operations'
method: os
listdir: aBlock
	"Set the listdir function (for monkey patching)"
	listdir := aBlock
%

category: 'Python-File and Directory Operations'
method: os
mkdir
	"Return the mkdir function"
	^ mkdir
%

category: 'Python-File and Directory Operations'
method: os
mkdir: aBlock
	"Set the mkdir function (for monkey patching)"
	mkdir := aBlock
%

category: 'Python-File and Directory Operations'
method: os
mkdirWithMode
	"Return the mkdirWithMode function"
	^ mkdirWithMode
%

category: 'Python-File and Directory Operations'
method: os
mkdirWithMode: aBlock
	"Set the mkdirWithMode function (for monkey patching)"
	mkdirWithMode := aBlock
%

category: 'Python-File and Directory Operations'
method: os
makedirs
	"Return the makedirs function"
	^ makedirs
%

category: 'Python-File and Directory Operations'
method: os
makedirs: aBlock
	"Set the makedirs function (for monkey patching)"
	makedirs := aBlock
%

category: 'Python-File and Directory Operations'
method: os
remove
	"Return the remove function"
	^ remove
%

category: 'Python-File and Directory Operations'
method: os
remove: aBlock
	"Set the remove function (for monkey patching)"
	remove := aBlock
%

category: 'Python-File and Directory Operations'
method: os
rmdir
	"Return the rmdir function"
	^ rmdir
%

category: 'Python-File and Directory Operations'
method: os
rmdir: aBlock
	"Set the rmdir function (for monkey patching)"
	rmdir := aBlock
%

category: 'Python-File and Directory Operations'
method: os
rename
	"Return the rename function"
	^ rename
%

category: 'Python-File and Directory Operations'
method: os
rename: aBlock
	"Set the rename function (for monkey patching)"
	rename := aBlock
%

category: 'Python-File and Directory Operations'
method: os
exists
	"Return the exists function"
	^ exists
%

category: 'Python-File and Directory Operations'
method: os
exists: aBlock
	"Set the exists function (for monkey patching)"
	exists := aBlock
%

category: 'Python-File and Directory Operations'
method: os
isdir
	"Return the isdir function"
	^ isdir
%

category: 'Python-File and Directory Operations'
method: os
isdir: aBlock
	"Set the isdir function (for monkey patching)"
	isdir := aBlock
%

category: 'Python-File and Directory Operations'
method: os
isfile
	"Return the isfile function"
	^ isfile
%

category: 'Python-File and Directory Operations'
method: os
isfile: aBlock
	"Set the isfile function (for monkey patching)"
	isfile := aBlock
%

category: 'Python-File and Directory Operations'
method: os
stat
	"Return the stat function"
	^ stat
%

category: 'Python-File and Directory Operations'
method: os
stat: aBlock
	"Set the stat function (for monkey patching)"
	stat := aBlock
%

category: 'Python-File and Directory Operations'
method: os
lstat
	"Return the lstat function"
	^ lstat
%

category: 'Python-File and Directory Operations'
method: os
lstat: aBlock
	"Set the lstat function (for monkey patching)"
	lstat := aBlock
%

category: 'Python-Process Management'
method: os
system
	"Return the system function"
	^ system
%

category: 'Python-Process Management'
method: os
system: aBlock
	"Set the system function (for monkey patching)"
	system := aBlock
%

category: 'Python-Environment Variables'
method: os
getenv
	"Return the getenv function"
	^ getenv
%

category: 'Python-Environment Variables'
method: os
getenv: aBlock
	"Set the getenv function (for monkey patching)"
	getenv := aBlock
%

category: 'Python-Environment Variables'
method: os
getenvWithDefault
	"Return the getenvWithDefault function"
	^ getenvWithDefault
%

category: 'Python-Environment Variables'
method: os
getenvWithDefault: aBlock
	"Set the getenvWithDefault function (for monkey patching)"
	getenvWithDefault := aBlock
%

category: 'Python-Environment Variables'
method: os
putenv
	"Return the putenv function"
	^ putenv
%

category: 'Python-Environment Variables'
method: os
putenv: aBlock
	"Set the putenv function (for monkey patching)"
	putenv := aBlock
%

category: 'Python-Constants'
method: os
sep
	"The character used by the operating system to separate pathname components"
	^ sep
%

category: 'Python-Constants'
method: os
sep: aValue
	"Set the sep constant (for monkey patching)"
	sep := aValue
%

category: 'Python-Constants'
method: os
pathsep
	"The character conventionally used by the operating system to separate search path components"
	^ pathsep
%

category: 'Python-Constants'
method: os
pathsep: aValue
	"Set the pathsep constant (for monkey patching)"
	pathsep := aValue
%

category: 'Python-Constants'
method: os
linesep
	"The string used to separate (or, rather, terminate) lines on the current platform"
	^ linesep
%

category: 'Python-Constants'
method: os
linesep: aValue
	"Set the linesep constant (for monkey patching)"
	linesep := aValue
%

category: 'Python-Path Module'
method: os
path
	"Return the os.path module instance"
	^ path
%

category: 'Python-Path Module'
method: os
path: aValue
	"Set the path module instance (for monkey patching)"
	path := aValue
%

set compile_env: 0

