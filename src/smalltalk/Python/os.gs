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
	self @env0:at: #sep put: '/'.
	self @env0:at: #pathsep put: ':'.
	self @env0:at: #linesep put: ((Character @env0:lf) @env0:asString).
	self @env0:at: #path put: (os_path instance).
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Python-Constants'
method: os
sep
	^ self @env0:at: #sep
%

category: 'Python-Constants'
method: os
pathsep
	^ self @env0:at: #pathsep
%

category: 'Python-Constants'
method: os
linesep
	^ self @env0:at: #linesep
%

category: 'Python-Path Module'
method: os
path
	^ self @env0:at: #path
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
	(result @env0:isKindOf: String) ifTrue: [^ result].
	(result @env0:isKindOf: Utf8) ifTrue: [^ result @env0:decodeToUnicode].
	(result @env0:isKindOf: Utf16) ifTrue: [^ result @env0:decodeToUnicode].
	^ result @env0:asUnicodeString
%

category: 'Python-File and Directory Operations'
method: os
chdir: path
	"os.chdir(path) — change the current working directory."

	| result |
	result := GsFile @env0:_directoryPrim: 0 with: path with: nil.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot change directory to: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Python-File and Directory Operations'
method: os
mkdir: path
	"os.mkdir(path) — create a directory."

	| result |
	result := GsFile @env0:createServerDirectory: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Python-File and Directory Operations'
method: os
mkdir: path _: mode
	"os.mkdir(path, mode) — create a directory with numeric mode."

	| result |
	result := GsFile @env0:createServerDirectory: path mode: mode.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot create directory: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Python-File and Directory Operations'
method: os
makedirs: path
	"os.makedirs(path) — recursive directory creation."

	| parts currentPath sep |
	sep := '/'.
	parts := $/ @env0:split: path.
	currentPath := ''.
	parts @env0:do: [:part |
		(part @env0:isEmpty) ifFalse: [
			currentPath := (currentPath @env0:isEmpty)
				ifTrue: [
					(path @env0:beginsWith: sep)
						ifTrue: [sep @env0:, part]
						ifFalse: [part]
				]
				ifFalse: [(currentPath @env0:, sep) @env0:, part].
			(GsFile @env0:existsOnServer: currentPath) ifFalse: [
				self mkdir: currentPath
			]
		]
	].
	^ None
%

category: 'Python-File and Directory Operations'
method: os
rmdir: path
	"os.rmdir(path) — remove a directory."

	| result |
	result := GsFile @env0:removeServerDirectory: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove directory: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Python-File and Directory Operations'
method: os
remove: path
	"os.remove(path) — remove a file."

	| result |
	result := GsFile @env0:removeServerFile: path.
	result == nil ifTrue: [
		OSError ___signal___: ('Cannot remove file: ' @env0:, (path @env0:printString))
	].
	^ None
%

category: 'Python-File and Directory Operations'
method: os
rename: oldPath _: newPath
	"os.rename(old, new) — rename a file or directory."

	| result msg |
	result := GsFile @env0:renameFileOnServer: oldPath to: newPath.
	result == nil ifTrue: [
		msg := ((oldPath @env0:printString) @env0:, ' to ') @env0:, (newPath @env0:printString).
		OSError ___signal___: ('Cannot rename: ' @env0:, msg)
	].
	^ None
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
	actualPath := (positional @env0:size @env0:>= 1) ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	actualPath == nil ifTrue: [actualPath := self getcwd].
	dirContents := GsFile @env0:contentsOfDirectory: actualPath onClient: false.
	(dirContents @env0:isKindOf: Array) ifFalse: [
		OSError ___signal___: ('Cannot list directory: ' @env0:, (actualPath @env0:printString))
	].
	result := list ___new___.
	dirContents @env0:do: [:each |
		| decoded basename reversedPath index lastSlashIndex |
		decoded := each.
		(each @env0:isKindOf: Utf8) ifTrue: [decoded := each @env0:decodeToUnicode].
		(each @env0:isKindOf: Utf16) ifTrue: [decoded := each @env0:decodeToUnicode].
		(each @env0:isKindOf: String) ifFalse: [decoded := each @env0:asUnicodeString].
		reversedPath := decoded @env0:reverse.
		index := reversedPath @env0:findString: '/' startingAt: 1.
		(index == 0) ifFalse: [
			lastSlashIndex := ((decoded @env0:size) @env0:- (index)) @env0:+ 1.
			decoded := decoded @env0:copyFrom: (lastSlashIndex @env0:+ 1) to: decoded @env0:size
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

	^ GsFile @env0:existsOnServer: path
%

category: 'Python-File and Directory Operations'
method: os
isdir: path
	"os.path.isdir(path) exposed as os.isdir(path)."

	(GsFile @env0:existsOnServer: path) ifTrue: [
		^ GsFile @env0:isServerDirectory: path
	].
	^ false
%

category: 'Python-File and Directory Operations'
method: os
isfile: path
	"os.path.isfile(path) exposed as os.isfile(path)."

	(GsFile @env0:existsOnServer: path) ifTrue: [
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
		OSError ___signal___: ('Cannot stat: ' @env0:, (path @env0:printString))
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
		OSError ___signal___: ('Cannot lstat: ' @env0:, (path @env0:printString))
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

	^ self @env1:getenv: name _: None
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
	^ None
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
