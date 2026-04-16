! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- os class (Python 'os' module)
expectvalue /Class
doit
module subclass: 'os'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os comment:
'Python os module.

Provides operating system interfaces for file/directory operations,
process management, and environment variables.
See https://docs.python.org/3/library/os.html
'
%

expectvalue /Class
doit
os category: 'Modules'
%

set compile_env: 0

! ------------------- Remove existing Python methods from os
expectvalue /Metaclass3
doit
os removeAllMethods: 1.
os class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Initialization — constants and stored attributes
! ===============================================================================

category: 'Python-Initialization'
method: os
initialize
	self ___at___: #sep put: '/'.
	self ___at___: #pathsep put: ':'.
	self ___at___: #linesep put: ((Character ___lf___) ___asString___).
	self ___at___: #path put: (os_path instance).
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Python-Constants'
method: os
sep
	^ self ___at___: #sep
%

category: 'Python-Constants'
method: os
pathsep
	^ self ___at___: #pathsep
%

category: 'Python-Constants'
method: os
linesep
	^ self ___at___: #linesep
%

category: 'Python-Path Module'
method: os
path
	^ self ___at___: #path
%

! ===============================================================================
! Fast-path callables — directory operations
! ===============================================================================

category: 'Python-File and Directory Operations'
method: os
getcwd
	"os.getcwd() — return the current working directory."

	| result |
	result := GsFile @env0:_directoryPrim: 2 with: nil with: nil.
	(result ___isKindOf___: String) ifTrue: [^ result].
	(result ___isKindOf___: Utf8) ifTrue: [^ result ___decodeToUnicode___].
	(result ___isKindOf___: Utf16) ifTrue: [^ result ___decodeToUnicode___].
	^ result ___asUnicodeString___
%

category: 'Python-File and Directory Operations'
method: os
chdir: path
	"os.chdir(path) — change the current working directory."

	| result |
	result := GsFile @env0:_directoryPrim: 0 with: path with: nil.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot change directory to: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
mkdir: path
	"os.mkdir(path) — create a directory."

	| result |
	result := GsFile @env0:createServerDirectory: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
mkdir: path _: mode
	"os.mkdir(path, mode) — create a directory with numeric mode."

	| result |
	result := GsFile @env0:createServerDirectory: path mode: mode.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
makedirs: path
	"os.makedirs(path) — recursive directory creation."

	| parts currentPath sep |
	sep := '/'.
	parts := $/ ___split___: path.
	currentPath := ''.
	parts ___do___: [:part |
		(part ___isEmpty___) ifFalse: [
			currentPath := (currentPath ___isEmpty___)
				ifTrue: [
					(path ___beginsWith___: sep)
						ifTrue: [sep ___concat___: part]
						ifFalse: [part]
				]
				ifFalse: [(currentPath ___concat___: sep) ___concat___: part].
			(GsFile ___existsOnServer___: currentPath) ifFalse: [
				self mkdir: currentPath
			]
		]
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
rmdir: path
	"os.rmdir(path) — remove a directory."

	| result |
	result := GsFile @env0:removeServerDirectory: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove directory: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
remove: path
	"os.remove(path) — remove a file."

	| result |
	result := GsFile @env0:removeServerFile: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove file: ' ___concat___: (path ___printString___))
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
rename: oldPath _: newPath
	"os.rename(old, new) — rename a file or directory."

	| result msg |
	result := GsFile @env0:renameFileOnServer: oldPath to: newPath.
	result == nil ifTrue: [
		msg := ((oldPath ___printString___) ___concat___: ' to ') ___concat___: (newPath ___printString___).
		OSError ___signal___: ('Cannot rename: ' ___concat___: msg)
	].
	^ nil
%

category: 'Python-File and Directory Operations'
method: os
listdir: path
	"os.listdir(path) — 1-arg fast path. Delegates to _listdir:kw:."

	^ self _listdir: { path } kw: nil
%

category: 'Python-File and Directory Operations'
method: os
_listdir: positional kw: kwargs
	"os.listdir([path]) — list directory contents. 0-arg uses cwd."

	| actualPath dirContents result |
	actualPath := (positional ___size___ ___ge___: 1) ifTrue: [positional ___at___: 1] ifFalse: [nil].
	actualPath == nil ifTrue: [actualPath := self getcwd].
	dirContents := GsFile @env0:contentsOfDirectory: actualPath onClient: false.
	(dirContents ___isKindOf___: Array) ifFalse: [
		OSError ___signal___: ('Cannot list directory: ' ___concat___: (actualPath ___printString___))
	].
	result := list ___new___.
	dirContents ___do___: [:each |
		| decoded basename reversedPath index lastSlashIndex |
		decoded := each.
		(each ___isKindOf___: Utf8) ifTrue: [decoded := each ___decodeToUnicode___].
		(each ___isKindOf___: Utf16) ifTrue: [decoded := each ___decodeToUnicode___].
		(each ___isKindOf___: String) ifFalse: [decoded := each ___asUnicodeString___].
		reversedPath := decoded ___reverse___.
		index := reversedPath ___findString___: '/' startingAt: 1.
		(index ___eq___: 0) ifFalse: [
			lastSlashIndex := ((decoded ___size___) ___minus___: (index)) ___plus___: 1.
			decoded := decoded ___copyFrom___: (lastSlashIndex ___plus___: 1) to: decoded ___size___
		].
		result append: decoded
	].
	^ result
%

! ===============================================================================
! Fast-path callables — file queries
! ===============================================================================

category: 'Python-File and Directory Operations'
method: os
exists: path
	"os.path.exists(path) exposed as os.exists(path)."

	^ GsFile ___existsOnServer___: path
%

category: 'Python-File and Directory Operations'
method: os
isdir: path
	"os.path.isdir(path) exposed as os.isdir(path)."

	(GsFile ___existsOnServer___: path) ifTrue: [
		^ GsFile @env0:isServerDirectory: path
	].
	^ false
%

category: 'Python-File and Directory Operations'
method: os
isfile: path
	"os.path.isfile(path) exposed as os.isfile(path)."

	(GsFile ___existsOnServer___: path) ifTrue: [
		^ (GsFile @env0:isServerDirectory: path) == false
	].
	^ false
%

category: 'Python-File and Directory Operations'
method: os
stat: path
	"os.stat(path) — get file status."

	| statResult |
	statResult := GsFile @env0:stat: path isLstat: false.
	statResult == nil ifTrue: [
		OSError ___signal___: ('Cannot stat: ' ___concat___: (path ___printString___))
	].
	^ statResult
%

category: 'Python-File and Directory Operations'
method: os
lstat: path
	"os.lstat(path) — like stat but does not follow symlinks."

	| statResult |
	statResult := GsFile @env0:stat: path isLstat: true.
	statResult == nil ifTrue: [
		OSError ___signal___: ('Cannot lstat: ' ___concat___: (path ___printString___))
	].
	^ statResult
%

! ===============================================================================
! Fast-path callables — environment variables
! ===============================================================================

category: 'Python-Environment Variables'
method: os
getenv: name
	"os.getenv(name) — get environment variable, return None if absent."

	^ System @env0:gemEnvironmentVariable: name
%

category: 'Python-Environment Variables'
method: os
getenv: name _: default
	"os.getenv(name, default) — get environment variable with default."

	| result |
	result := System @env0:gemEnvironmentVariable: name.
	result == nil ifTrue: [^ default].
	^ result
%

category: 'Python-Environment Variables'
method: os
putenv: name _: value
	"os.putenv(name, value) — set environment variable."

	System @env0:gemEnvironmentVariable: name put: value.
	^ nil
%

! ===============================================================================
! Fast-path callables — process management
! ===============================================================================

category: 'Python-Process Management'
method: os
system: command
	"os.system(command) — execute command in a subshell."

	^ System @env0:performOnServer: command
%

set compile_env: 0
