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
! ------------------- Instance methods for os

category: 'Python-File and Directory Operations'
method: os
getcwd
	"Return a string representing the current working directory"
	| result |
	result := GsFile perform: #_directoryPrim:with:with: env: 0 withArguments: {2. nil. nil}.
	(result ___isKindOf___: String) ifTrue: [^ result].
	(result ___isKindOf___: Utf8) ifTrue: [^ result ___decodeToUnicode___].
	(result ___isKindOf___: Utf16) ifTrue: [^ result ___decodeToUnicode___].
	^ result ___asUnicodeString___
%

category: 'Python-File and Directory Operations'
method: os
chdir: path
	"Change the current working directory to path"
	| result |
	result := GsFile perform: #_directoryPrim:with:with: env: 0 withArguments: {0. path. nil}.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot change directory to: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
listdir: path
	"Return a list containing the names of the entries in the directory given by path"
	| dirContents result size i each decoded |
	dirContents := GsFile perform: #contentsOfDirectory:onClient: env: 0 withArguments: {path. false}.
	(dirContents ___isKindOf___: Array) ifFalse: [
		OSError ___signal___: ('Cannot list directory: ' ___concat___: (path ___printString___))
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
	^ result
%

category: 'Python-File and Directory Operations'
method: os
listdir
	"Return a list containing the names of the entries in the current directory"
	^ self listdir: (self getcwd)
%

category: 'Python-File and Directory Operations'
method: os
mkdir: path
	"Create a directory named path"
	| result |
	result := GsFile perform: #createServerDirectory: env: 0 withArguments: {path}.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
mkdir: path _: mode
	"Create a directory named path with numeric mode"
	| result |
	result := GsFile perform: #createServerDirectory:mode: env: 0 withArguments: {path. mode}.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
makedirs: path
	"Recursive directory creation function"
	| parts currentPath size i part sep |
	sep := '/'.
	parts := $/ ___split___: path.
	currentPath := ''.
	size := parts ___size___.
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
				self mkdir: currentPath.
			].
		]
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
remove: path
	"Remove (delete) the file path"
	| result |
	result := GsFile perform: #removeServerFile: env: 0 withArguments: {path}.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove file: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
rmdir: path
	"Remove (delete) the directory path"
	| result |
	result := GsFile perform: #removeServerDirectory: env: 0 withArguments: {path}.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove directory: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
rename: oldPath _: newPath
	"Rename the file or directory from oldPath to newPath"
	| result msg |
	result := GsFile perform: #renameFileOnServer:to: env: 0 withArguments: {oldPath. newPath}.
	result == nil ifTrue: [
		msg := ((oldPath ___printString___) ___concat___: ' to ') ___concat___: (newPath ___printString___).
		OSError ___signal___: ('Cannot rename: ' ___concat___: msg)
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
exists: path
	"Return True if path refers to an existing path"
	^ GsFile ___existsOnServer___: path
%

category: 'Python-File and Directory Operations'
method: os
isdir: path
	"Return True if path is an existing directory"
	| exists |
	exists := GsFile ___existsOnServer___: path.
	exists ifFalse: [^ false].
	^ GsFile perform: #isServerDirectory: env: 0 withArguments: {path}
%

category: 'Python-File and Directory Operations'
method: os
isfile: path
	"Return True if path is an existing regular file"
	| exists isDir |
	exists := GsFile ___existsOnServer___: path.
	exists ifFalse: [^ false].
	isDir := GsFile perform: #isServerDirectory: env: 0 withArguments: {path}.
	^ isDir == false
%

category: 'Python-File and Directory Operations'
method: os
stat: path
	"Get the status of a file or directory"
	| statResult |
	statResult := GsFile perform: #stat:isLstat: env: 0 withArguments: {path. false}.
	statResult == nil ifTrue: [
		OSError ___signal___: ('Cannot stat: ' ___concat___: (path ___printString___))
	].
	^ statResult
%

category: 'Python-File and Directory Operations'
method: os
lstat: path
	"Like stat(), but does not follow symbolic links"
	| statResult |
	statResult := GsFile perform: #stat:isLstat: env: 0 withArguments: {path. true}.
	statResult == nil ifTrue: [
		OSError ___signal___: ('Cannot lstat: ' ___concat___: (path ___printString___))
	].
	^ statResult
%

category: 'Python-Process Management'
method: os
system: command
	"Execute the command (a string) in a subshell"
	| result |
	result := System perform: #performOnServer: env: 0 withArguments: {command}.
	^ result
%

category: 'Python-Environment Variables'
method: os
getenv: name
	"Get an environment variable, return None if it doesn't exist"
	| result |
	result := System perform: #gemEnvironmentVariable: env: 0 withArguments: {name}.
	^ result
%

category: 'Python-Environment Variables'
method: os
getenv: name _: default
	"Get an environment variable, return default if it doesn't exist"
	| result |
	result := System perform: #gemEnvironmentVariable: env: 0 withArguments: {name}.
	result == nil ifTrue: [^ default].
	^ result
%

category: 'Python-Environment Variables'
method: os
putenv: name _: value
	"Set the environment variable named name to the string value"
	System perform: #gemEnvironmentVariable:put: env: 0 withArguments: {name. value}.
	^ nil
%

category: 'Python-Constants'
method: os
sep
	"The character used by the operating system to separate pathname components"
	^ '/'
%

category: 'Python-Constants'
method: os
pathsep
	"The character conventionally used by the operating system to separate search path components"
	^ ':'
%

category: 'Python-Constants'
method: os
linesep
	"The string used to separate (or, rather, terminate) lines on the current platform"
	^ (Character ___lf___) ___asString___
%

category: 'Python-Path Module'
method: os
path
	"Return the os.path module instance"
	^ os_path ___new___
%

set compile_env: 0

