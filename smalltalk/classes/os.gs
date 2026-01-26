! ===============================================================================
! os Module (Python 'os' module)
! ===============================================================================
! This file contains the Python os module implementation.
! The os module provides operating system interfaces for file and directory
! operations, process management, and environment variables.
! ===============================================================================

set compile_env: 0

! ------------------- Remove existing Python methods from os
expectvalue /Metaclass3
doit
os removeAllMethods: 2.
os class removeAllMethods: 2.
%

set compile_env: 2

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
	self ___at___: #getcwd put: [:positional :keywords |
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
	self ___at___: #chdir put: [:positional :keywords |
		| path result |
		path := positional ___at___: 1.
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
	self ___at___: #listdir put: [:positional :keywords |
		| path dirContents result size i each decoded actualPath getcwdBlock |
		path := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [nil].
		actualPath := path.
		actualPath == nil ifTrue: [
			getcwdBlock := self getcwd.
			actualPath := getcwdBlock value: {} value: nil
		].
		dirContents := GsFile perform: #contentsOfDirectory:onClient: env: 0 withArguments: {actualPath. false}.
		(dirContents ___isKindOf___: Array) ifFalse: [
			OSError ___signal___: ('Cannot list directory: ' ___concat___: (actualPath ___printString___))
		].
		result := list ___new___.
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
			result append: decoded
		].
		result
	]
%

category: 'Python-Initialization'
method: os
initialize_mkdir
	"Create a directory named path"
	self ___at___: #mkdir put: [:positional :keywords |
		| path result |
		path := positional ___at___: 1.
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
	self ___at___: #mkdirWithMode put: [:positional :keywords |
		| path mode result |
		path := positional ___at___: 1.
		mode := positional ___at___: 2.
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
	self ___at___: #makedirs put: [:positional :keywords |
		| path parts currentPath size i part sep mkdirBlock |
		path := positional ___at___: 1.
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
					mkdirBlock value: {currentPath} value: nil.
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
	self ___at___: #remove put: [:positional :keywords |
		| path result |
		path := positional ___at___: 1.
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
	self ___at___: #rmdir put: [:positional :keywords |
		| path result |
		path := positional ___at___: 1.
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
	self ___at___: #rename put: [:positional :keywords |
		| oldPath newPath result msg |
		oldPath := positional ___at___: 1.
		newPath := positional ___at___: 2.
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
	self ___at___: #exists put: [:positional :keywords |
		| path |
		path := positional ___at___: 1.
		GsFile ___existsOnServer___: path
	]
%

category: 'Python-Initialization'
method: os
initialize_isdir
	"Return True if path is an existing directory"
	self ___at___: #isdir put: [:positional :keywords |
		| path exists |
		path := positional ___at___: 1.
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
	self ___at___: #isfile put: [:positional :keywords |
		| path exists isDir |
		path := positional ___at___: 1.
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
	self ___at___: #stat put: [:positional :keywords |
		| path statResult |
		path := positional ___at___: 1.
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
	self ___at___: #lstat put: [:positional :keywords |
		| path statResult |
		path := positional ___at___: 1.
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
	self ___at___: #system put: [:positional :keywords |
		| command result |
		command := positional ___at___: 1.
		result := System perform: #performOnServer: env: 0 withArguments: {command}.
		result
	]
%

category: 'Python-Initialization'
method: os
initialize_getenv
	"Get an environment variable, return None if it doesn't exist"
	self ___at___: #getenv put: [:positional :keywords |
		| name result |
		name := positional ___at___: 1.
		result := System perform: #gemEnvironmentVariable: env: 0 withArguments: {name}.
		result
	]
%

category: 'Python-Initialization'
method: os
initialize_getenvWithDefault
	"Get an environment variable, return default if it doesn't exist"
	self ___at___: #getenvWithDefault put: [:positional :keywords |
		| name default result |
		name := positional ___at___: 1.
		default := positional ___at___: 2.
		result := System perform: #gemEnvironmentVariable: env: 0 withArguments: {name}.
		result == nil ifTrue: [default] ifFalse: [result]
	]
%

category: 'Python-Initialization'
method: os
initialize_putenv
	"Set the environment variable named name to the string value"
	self ___at___: #putenv put: [:positional :keywords |
		| name value |
		name := positional ___at___: 1.
		value := positional ___at___: 2.
		System perform: #gemEnvironmentVariable:put: env: 0 withArguments: {name. value}.
		nil
	]
%

category: 'Python-Initialization'
method: os
initialize_sep
	"The character used by the operating system to separate pathname components"
	self ___at___: #sep put: '/'
%

category: 'Python-Initialization'
method: os
initialize_pathsep
	"The character conventionally used by the operating system to separate search path components"
	self ___at___: #pathsep put: ':'
%

category: 'Python-Initialization'
method: os
initialize_linesep
	"The string used to separate (or, rather, terminate) lines on the current platform"
	self ___at___: #linesep put: ((Character ___lf___) ___asString___)
%

category: 'Python-Initialization'
method: os
initialize_path
	"Return the os.path module instance"
	self ___at___: #path put: (os_path instance)
%

category: 'Python-File and Directory Operations'
method: os
getcwd
	"Return the getcwd function"
	^ self ___at___: #getcwd
%

category: 'Python-File and Directory Operations'
method: os
getcwd: aBlock
	"Set the getcwd function (for monkey patching)"
	self ___at___: #getcwd put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
chdir
	"Return the chdir function"
	^ self ___at___: #chdir
%

category: 'Python-File and Directory Operations'
method: os
chdir: aBlock
	"Set the chdir function (for monkey patching)"
	self ___at___: #chdir put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
listdir
	"Return the listdir function"
	^ self ___at___: #listdir
%

category: 'Python-File and Directory Operations'
method: os
listdir: aBlock
	"Set the listdir function (for monkey patching)"
	self ___at___: #listdir put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
mkdir
	"Return the mkdir function"
	^ self ___at___: #mkdir
%

category: 'Python-File and Directory Operations'
method: os
mkdir: aBlock
	"Set the mkdir function (for monkey patching)"
	self ___at___: #mkdir put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
mkdirWithMode
	"Return the mkdirWithMode function"
	^ self ___at___: #mkdirWithMode
%

category: 'Python-File and Directory Operations'
method: os
mkdirWithMode: aBlock
	"Set the mkdirWithMode function (for monkey patching)"
	self ___at___: #mkdirWithMode put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
makedirs
	"Return the makedirs function"
	^ self ___at___: #makedirs
%

category: 'Python-File and Directory Operations'
method: os
makedirs: aBlock
	"Set the makedirs function (for monkey patching)"
	self ___at___: #makedirs put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
remove
	"Return the remove function"
	^ self ___at___: #remove
%

category: 'Python-File and Directory Operations'
method: os
remove: aBlock
	"Set the remove function (for monkey patching)"
	self ___at___: #remove put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
rmdir
	"Return the rmdir function"
	^ self ___at___: #rmdir
%

category: 'Python-File and Directory Operations'
method: os
rmdir: aBlock
	"Set the rmdir function (for monkey patching)"
	self ___at___: #rmdir put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
rename
	"Return the rename function"
	^ self ___at___: #rename
%

category: 'Python-File and Directory Operations'
method: os
rename: aBlock
	"Set the rename function (for monkey patching)"
	self ___at___: #rename put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
exists
	"Return the exists function"
	^ self ___at___: #exists
%

category: 'Python-File and Directory Operations'
method: os
exists: aBlock
	"Set the exists function (for monkey patching)"
	self ___at___: #exists put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
isdir
	"Return the isdir function"
	^ self ___at___: #isdir
%

category: 'Python-File and Directory Operations'
method: os
isdir: aBlock
	"Set the isdir function (for monkey patching)"
	self ___at___: #isdir put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
isfile
	"Return the isfile function"
	^ self ___at___: #isfile
%

category: 'Python-File and Directory Operations'
method: os
isfile: aBlock
	"Set the isfile function (for monkey patching)"
	self ___at___: #isfile put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
stat
	"Return the stat function"
	^ self ___at___: #stat
%

category: 'Python-File and Directory Operations'
method: os
stat: aBlock
	"Set the stat function (for monkey patching)"
	self ___at___: #stat put: aBlock
%

category: 'Python-File and Directory Operations'
method: os
lstat
	"Return the lstat function"
	^ self ___at___: #lstat
%

category: 'Python-File and Directory Operations'
method: os
lstat: aBlock
	"Set the lstat function (for monkey patching)"
	self ___at___: #lstat put: aBlock
%

category: 'Python-Process Management'
method: os
system
	"Return the system function"
	^ self ___at___: #system
%

category: 'Python-Process Management'
method: os
system: aBlock
	"Set the system function (for monkey patching)"
	self ___at___: #system put: aBlock
%

category: 'Python-Environment Variables'
method: os
getenv
	"Return the getenv function"
	^ self ___at___: #getenv
%

category: 'Python-Environment Variables'
method: os
getenv: aBlock
	"Set the getenv function (for monkey patching)"
	self ___at___: #getenv put: aBlock
%

category: 'Python-Environment Variables'
method: os
getenvWithDefault
	"Return the getenvWithDefault function"
	^ self ___at___: #getenvWithDefault
%

category: 'Python-Environment Variables'
method: os
getenvWithDefault: aBlock
	"Set the getenvWithDefault function (for monkey patching)"
	self ___at___: #getenvWithDefault put: aBlock
%

category: 'Python-Environment Variables'
method: os
putenv
	"Return the putenv function"
	^ self ___at___: #putenv
%

category: 'Python-Environment Variables'
method: os
putenv: aBlock
	"Set the putenv function (for monkey patching)"
	self ___at___: #putenv put: aBlock
%

category: 'Python-Constants'
method: os
sep
	"The character used by the operating system to separate pathname components"
	^ self ___at___: #sep
%

category: 'Python-Constants'
method: os
sep: aValue
	"Set the sep constant (for monkey patching)"
	self ___at___: #sep put: aValue
%

category: 'Python-Constants'
method: os
pathsep
	"The character conventionally used by the operating system to separate search path components"
	^ self ___at___: #pathsep
%

category: 'Python-Constants'
method: os
pathsep: aValue
	"Set the pathsep constant (for monkey patching)"
	self ___at___: #pathsep put: aValue
%

category: 'Python-Constants'
method: os
linesep
	"The string used to separate (or, rather, terminate) lines on the current platform"
	^ self ___at___: #linesep
%

category: 'Python-Constants'
method: os
linesep: aValue
	"Set the linesep constant (for monkey patching)"
	self ___at___: #linesep put: aValue
%

category: 'Python-Path Module'
method: os
path
	"Return the os.path module instance"
	^ self ___at___: #path
%

category: 'Python-Path Module'
method: os
path: aValue
	"Set the path module instance (for monkey patching)"
	self ___at___: #path put: aValue
%

set compile_env: 0
