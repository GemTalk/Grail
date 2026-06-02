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
os category: 'Grail-Modules'
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

category: 'Grail-Initialization'
method: os
initialize
	self @env0:at: #sep put: '/'.
	self @env0:at: #pathsep put: ':'.
	self @env0:at: #linesep put: ((Character @env0:lf) @env0:asString).
	self @env0:at: #path put: (os_path instance).
	"Pre-store fsdecode as a BoundMethod so ``from os import
	fsdecode'' (werkzeug's file_storage) reads the callable
	directly via the ImportFromAst __pyAttrLoad path."
	self @env0:dynamicInstVarAt: #fsdecode put: (BoundMethod @env1:receiver: self selector: #fsdecode).
	self @env0:dynamicInstVarAt: #fsencode put: (BoundMethod @env1:receiver: self selector: #fsencode).
	self @env0:dynamicInstVarAt: #fspath put: (BoundMethod @env1:receiver: self selector: #fspath).
	"``os.environ'' — process environment dict.  Lazily populated by
	the accessor below (gem startup doesn't expose every var until
	first read).  Stored as a KeyValueDictionary so dict-protocol
	calls (``.get'', ``__getitem__'', ``__contains__'') work."
	self @env0:dynamicInstVarAt: #environ put: (KeyValueDictionary @env0:new)
%

category: 'Grail-Filesystem'
method: os
fspath: path
	"``os.fspath(path)'' — accept either a string-like or an object
	with ``__fspath__'' and return a string/bytes path.  Grail
	short-circuits: strings and bytes pass through; user objects
	delegate to __fspath__ if defined."

	(path @env0:isKindOf: CharacterCollection) ifTrue: [^ path].
	(path @env0:isKindOf: ByteArray) ifTrue: [^ path].
	((path @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #'__fspath__')
		ifTrue: [^ path @env1:__fspath__].
	TypeError @env1:___signal___: 'expected str, bytes, or os.PathLike'
%

category: 'Grail-Filesystem'
method: os
fsdecode: filename
	"``os.fsdecode(filename)'' — decode a bytes filename to str using
	the filesystem encoding.  Grail uses UTF-8 throughout.  Bytes
	input decodes; str input passes through."

	(filename @env0:isKindOf: ByteArray)
		ifTrue: [^ filename @env1:decode: 'utf-8'].
	^ filename
%

category: 'Grail-Filesystem'
method: os
fsencode: filename
	"``os.fsencode(filename)'' — inverse of fsdecode."

	(filename @env0:isKindOf: CharacterCollection)
		ifTrue: [^ filename @env1:encode: 'utf-8'].
	^ filename
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Grail-Constants'
method: os
sep
	^ self @env0:at: #sep
%

category: 'Grail-Constants'
method: os
environ
	"Lazy-init dict of process environment variables.  Reads through
	to ``System gemEnvironmentVariable:'' on each ``.get'' miss so
	live env-var values reach callers (Flask reads ``FLASK_DEBUG'' /
	``FLASK_SKIP_DOTENV'' at module-init through ``os.environ.get'')."
	^ self @env0:dynamicInstVarAt: #environ
%

category: 'Grail-Constants'
method: os
pathsep
	^ self @env0:at: #pathsep
%

category: 'Grail-Constants'
method: os
linesep
	^ self @env0:at: #linesep
%

category: 'Grail-Path Module'
method: os
path
	^ self @env0:at: #path
%

! ===============================================================================
! Fast-path callables — directory operations
! ===============================================================================

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
method: os
listdir: path
	"os.listdir(path) — 1-arg fast path. Delegates to _listdir:kw:."

	^ self _listdir: { path } kw: nil
%

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
method: os
exists: path
	"os.path.exists(path) exposed as os.exists(path)."

	^ GsFile @env0:existsOnServer: path
%

category: 'Grail-File and Directory Operations'
method: os
isdir: path
	"os.path.isdir(path) exposed as os.isdir(path)."

	(GsFile @env0:existsOnServer: path) ifTrue: [
		^ GsFile @env0:isServerDirectory: path
	].
	^ false
%

category: 'Grail-File and Directory Operations'
method: os
isfile: path
	"os.path.isfile(path) exposed as os.isfile(path)."

	(GsFile @env0:existsOnServer: path) ifTrue: [
		^ (GsFile @env0:isServerDirectory: path) == false
	].
	^ false
%

category: 'Grail-File and Directory Operations'
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

category: 'Grail-File and Directory Operations'
method: os
getmtime: path
	"os.path.getmtime(path) backing — modification time in seconds since the
	epoch.  GsFileStat exposes whole-second resolution (mtimeUtcSeconds), so
	this is coarser than CPython's float on high-resolution filesystems; it is
	enough for the auto-reloader (which only needs to notice that an edit
	happened)."

	| st |
	st := GsFile @env0:stat: path @env0:asString isLstat: false.
	st == nil ifTrue: [
		^ OSError ___signal___: ('Cannot stat: ' @env0:, (path @env0:printString))
	].
	^ st @env0:mtimeUtcSeconds
%

category: 'Grail-File and Directory Operations'
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

category: 'Grail-Environment Variables'
method: os
getenv: name
	"os.getenv(name) — get environment variable, return None if absent."

	^ self @env1:getenv: name _: None
%

category: 'Grail-Environment Variables'
method: os
getenv: name _: default
	"os.getenv(name, default) — get environment variable with default."

	| result |
	result := System @env0:gemEnvironmentVariable: name.
	result == nil ifTrue: [^ default].
	^ result
%

category: 'Grail-Environment Variables'
method: os
putenv: name _: value
	"os.putenv(name, value) — set environment variable."

	System @env0:gemEnvironmentVariable: name put: value.
	^ None
%

! ===============================================================================
! Fast-path callables — process management
! ===============================================================================

category: 'Grail-Process Management'
method: os
system: command
	"os.system(command) — execute command in a subshell."

	^ System @env0:performOnServer: command
%

set compile_env: 0
