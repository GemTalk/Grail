! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- os_path class (Python 'os.path' module)
expectvalue /Class
doit
module subclass: 'os_path'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
os_path comment:
'Python os.path module.

Provides common pathname manipulations.
See https://docs.python.org/3/library/os.path.html
'
%

expectvalue /Class
doit
os_path category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from os_path
expectvalue /Metaclass3
doit
os_path removeAllMethods: 1.
os_path class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: os_path
initialize
	"Module-level constants matching CPython's posixpath:
	  altsep — alternative separator (None on POSIX, '/' on Windows
	    when sep is '\\'); Grail assumes posix so this is None.
	  sep — primary separator '/'.
	  pathsep — list-separator ':' for PATH-style env vars.
	  extsep — file extension delimiter '.'.
	  defpath — default search path for execvpe.
	  devnull — '/dev/null' on POSIX.
	Werkzeug.utils.secure_filename iterates ``os.sep, os.path.altsep''
	to strip path separators from uploaded filenames."

	self @env0:dynamicInstVarAt: #altsep put: None.
	self @env0:dynamicInstVarAt: #sep put: '/'.
	self @env0:dynamicInstVarAt: #pathsep put: ':'.
	self @env0:dynamicInstVarAt: #extsep put: '.'.
	self @env0:dynamicInstVarAt: #defpath put: '/bin:/usr/bin'.
	self @env0:dynamicInstVarAt: #devnull put: '/dev/null'
%

! ===============================================================================
! Fast-path callables — path manipulation
! ===============================================================================

category: 'Grail-Path Manipulation'
method: os_path
join: paths
	"os.path.join(path) — 1-arg form.  Python's os.path.join is
	variadic; this entry matches the ``join(arg)'' call shape and
	just returns the arg if it's a single path string, or joins
	the elements when called with a list/tuple.  Variadic calls
	``join(a, b, c)'' go through ``_join:kw:'' (2+ positional args)."

	((paths @env0:isKindOf: CharacterCollection)) ifTrue: [^ paths].
	^ self ___joinComponents___: paths
%

category: 'Grail-Path Manipulation'
method: os_path
join: aPath _: anotherPath
	"os.path.join(a, b) — 2-arg fast path.  Joins two path strings
	with the standard separator semantics: if ``anotherPath''
	starts with ``/'' it replaces ``aPath''; if ``aPath'' ends with
	``/'' the separator isn't doubled."

	^ self ___joinComponents___: (Array @env0:with: aPath with: anotherPath)
%

category: 'Grail-Path Manipulation'
method: os_path
_join: positional kw: kwargs
	"os.path.join(a, b, c, ...) — varargs form.  Python's join
	walks the positional args left-to-right.  Empty call is the
	empty string."

	^ self ___joinComponents___: positional
%

category: 'Grail-Path Manipulation'
method: os_path
___joinComponents___: paths
	"Internal helper — apply Python's os.path.join semantics over
	an indexable collection of path strings.  Empty → ''; absolute
	component restarts; trailing separator avoids doubling."

	| result sep size |
	(paths @env0:isEmpty) ifTrue: [^ ''].
	((paths @env0:size) == 1) ifTrue: [^ paths @env0:first].
	sep := '/'.
	result := paths @env0:first.
	size := paths @env0:size.
	2 @env0:to: size do: [:i |
		| each |
		each := paths @env0:at: i.
		(each @env0:beginsWith: sep) ifTrue: [
			result := each
		] ifFalse: [
			(result @env0:endsWith: sep) ifTrue: [
				result := result @env0:, each
			] ifFalse: [
				result := (result @env0:, sep) @env0:, each
			]
		]
	].
	^ result
%

category: 'Grail-Path Manipulation'
method: os_path
basename: path
	"os.path.basename(path) — return the base name of pathname."

	| sep trimmedPath reversedPath index lastIndex |
	sep := '/'.
	trimmedPath := path.
	(path @env0:endsWith: sep) ifTrue: [
		trimmedPath := path @env0:copyFrom: 1 to: ((path @env0:size) @env0:- 1)
	].
	(trimmedPath @env0:isEmpty) ifTrue: [^ sep].
	reversedPath := trimmedPath @env0:reverse.
	index := reversedPath @env0:findString: sep startingAt: 1.
	(index == 0) ifTrue: [^ trimmedPath].
	lastIndex := ((trimmedPath @env0:size) @env0:- (index)) @env0:+ 1.
	^ trimmedPath @env0:copyFrom: (lastIndex @env0:+ 1) to: trimmedPath @env0:size
%

category: 'Grail-Path Manipulation'
method: os_path
dirname: path
	"os.path.dirname(path) — return the directory name of pathname."

	| sep trimmedPath reversedPath index lastIndex |
	sep := '/'.
	trimmedPath := path.
	(path @env0:endsWith: sep) ifTrue: [
		trimmedPath := path @env0:copyFrom: 1 to: ((path @env0:size) @env0:- 1)
	].
	(trimmedPath @env0:isEmpty) ifTrue: [^ sep].
	reversedPath := trimmedPath @env0:reverse.
	index := reversedPath @env0:findString: sep startingAt: 1.
	(index == 0) ifTrue: [^ '.'].
	lastIndex := ((trimmedPath @env0:size) @env0:- (index)) @env0:+ 1.
	(lastIndex == 1) ifTrue: [^ sep].
	^ trimmedPath @env0:copyFrom: 1 to: (lastIndex @env0:- 1)
%

category: 'Grail-Path Manipulation'
method: os_path
split: path
	"os.path.split(path) — split into (head, tail)."

	| sep pathSize reversedPath index lastIndex head tail |
	sep := '/'.
	pathSize := path @env0:size.
	reversedPath := path @env0:reverse.
	index := reversedPath @env0:findString: sep startingAt: 1.
	(index == 0) ifTrue: [^ tuple @env0:with: '' with: path].
	lastIndex := (pathSize @env0:- (index)) @env0:+ 1.
	(lastIndex @env0:= pathSize) ifTrue: [
		head := path @env0:copyFrom: 1 to: (lastIndex @env0:- 1).
		(head @env0:isEmpty) ifTrue: [head := sep].
		^ tuple @env0:with: head with: ''
	].
	head := path @env0:copyFrom: 1 to: (lastIndex @env0:- 1).
	tail := path @env0:copyFrom: (lastIndex @env0:+ 1) to: pathSize.
	^ tuple @env0:with: head with: tail
%

category: 'Grail-Path Manipulation'
method: os_path
splitext: path
	"os.path.splitext(path) — split into (root, ext)."

	| pathSize reversedPath index lastDotIndex sepIndex root ext |
	pathSize := path @env0:size.
	reversedPath := path @env0:reverse.
	index := reversedPath @env0:findString: '.' startingAt: 1.
	(index == 0) ifTrue: [^ tuple @env0:with: path with: ''].
	lastDotIndex := (pathSize @env0:- (index)) @env0:+ 1.
	(lastDotIndex @env0:= pathSize) ifTrue: [^ tuple @env0:with: path with: ''].
	"Check for path separator after dot"
	index := reversedPath @env0:findString: '/' startingAt: 1.
	(index == 0) ifTrue: [sepIndex := 0]
		ifFalse: [sepIndex := (pathSize @env0:- (index)) @env0:+ 1].
	(sepIndex @env0:> lastDotIndex) ifTrue: [^ tuple @env0:with: path with: ''].
	(lastDotIndex == 1) ifTrue: [^ tuple @env0:with: path with: ''].
	root := path @env0:copyFrom: 1 to: (lastDotIndex @env0:- 1).
	ext := path @env0:copyFrom: lastDotIndex to: pathSize.
	^ tuple @env0:with: root with: ext
%

category: 'Grail-Path Manipulation'
method: os_path
isabs: path
	"os.path.isabs(path) — True if path is absolute."

	^ path @env0:beginsWith: '/'
%

category: 'Grail-Path Manipulation'
method: os_path
normpath: path
	"os.path.normpath(path) — normalize a pathname."

	| parts sep isAbsolute earlyExit result dotDotIndex prevIndex |
	sep := '/'.
	parts := $/ @env0:split: path.
	isAbsolute := path @env0:beginsWith: sep.
	parts := parts @env0:reject: [:each | (each @env0:isEmpty) or: [each @env0:= '.']].
	(isAbsolute and: [(parts @env0:isEmpty) or: [((parts @env0:first) @env0:isEmpty) not]])
		ifTrue: [parts @env0:addFirst: ''].
	earlyExit := false.
	result := nil.
	[((parts @env0:indexOf: '..' ifAbsent: [0]) == 0) not] whileTrue: [
		dotDotIndex := parts @env0:indexOf: '..' ifAbsent: [0].
		(dotDotIndex == 1) ifTrue: [
			isAbsolute ifTrue: [
				parts @env0:removeAtIndex: 1
			] ifFalse: [
				result := parts @env0:inject: (parts @env0:first) into: [:acc :each |
					((each @env0:= (parts @env0:first))) ifTrue: [acc]
						ifFalse: [((acc @env0:, sep) @env0:, each)]
				].
				earlyExit := true
			]
		] ifFalse: [
			prevIndex := dotDotIndex @env0:- (1).
			((parts @env0:at: prevIndex) @env0:isEmpty) ifTrue: [
				parts @env0:removeAtIndex: dotDotIndex
			] ifFalse: [
				parts @env0:removeAtIndex: dotDotIndex.
				parts @env0:removeAtIndex: prevIndex
			]
		].
		earlyExit ifTrue: [parts := list ___new___]
	].
	earlyExit ifTrue: [^ result].
	(parts @env0:isEmpty) ifTrue: [^ '.'].
	((parts @env0:size) == 1) ifTrue: [
		^ ((parts @env0:first) @env0:isEmpty) ifTrue: [sep] ifFalse: [parts @env0:first]
	].
	((parts @env0:first) @env0:isEmpty) ifTrue: [
		| rest |
		rest := parts @env0:copyFrom: 2 to: parts @env0:size.
		(rest @env0:isEmpty) ifTrue: [^ sep].
		^ rest @env0:inject: (sep @env0:, (rest @env0:first)) into: [:acc :each |
			((each @env0:= (rest @env0:first))) ifTrue: [acc]
				ifFalse: [((acc @env0:, sep) @env0:, each)]
		]
	].
	^ parts @env0:inject: (parts @env0:first) into: [:acc :each |
		((each @env0:= (parts @env0:first))) ifTrue: [acc]
			ifFalse: [((acc @env0:, sep) @env0:, each)]
	]
%

category: 'Grail-Path Manipulation'
method: os_path
abspath: path
	"os.path.abspath(path) — return normalized absolute pathname."

	(self isabs: path) ifTrue: [^ self normpath: path].
	^ self normpath: (self join: {(os instance) getcwd. path})
%

! ===============================================================================
! Fast-path callables — file queries (delegate to os)
! ===============================================================================

category: 'Grail-Path Manipulation'
method: os_path
exists: path
	"os.path.exists(path) — delegates to os.exists."

	^ (os instance) exists: path
%

category: 'Grail-Path Manipulation'
method: os_path
isdir: path
	"os.path.isdir(path) — delegates to os.isdir."

	^ (os instance) isdir: path
%

category: 'Grail-Path Manipulation'
method: os_path
isfile: path
	"os.path.isfile(path) — delegates to os.isfile."

	^ (os instance) isfile: path
%

! ===============================================================================
! Fast-path callables — multi-path operations
! ===============================================================================

category: 'Grail-Path Manipulation'
method: os_path
commonpath: paths
	"os.path.commonpath(paths) — longest common sub-path."

	| allParts firstSize minSize commonParts allPartsSize i firstPart allMatch |
	(paths @env0:isEmpty) ifTrue: [
		ValueError ___signal___: 'commonpath() arg is an empty sequence'
	].
	allParts := list ___new___.
	paths @env0:do: [:p |
		| normalized parts |
		normalized := self normpath: p.
		parts := $/ @env0:split: normalized.
		parts := parts @env0:select: [:each | each @env0:notEmpty].
		allParts append: parts
	].
	firstSize := (allParts @env0:first) @env0:size.
	minSize := allParts @env0:inject: firstSize into: [:min :parts |
		(min @env0:min: (parts @env0:size))
	].
	commonParts := list ___new___.
	allPartsSize := allParts @env0:size.
	i := 1.
	[(i @env0:<= minSize)] @env0:whileTrue: [
		firstPart := (allParts @env0:first) @env0:at: i.
		allMatch := true.
		1 @env0:to: allPartsSize do: [:j |
			| parts |
			parts := allParts @env0:at: j.
			((parts @env0:at: i) @env0:= firstPart) ifFalse: [allMatch := false]
		].
		allMatch ifTrue: [
			commonParts append: firstPart.
			i := i @env0:+ 1
		] ifFalse: [
			(i == 1) ifTrue: [
				ValueError ___signal___: 'Paths do not start from a common point'
			].
			i := minSize @env0:+ 1
		]
	].
	(commonParts @env0:isEmpty) ifTrue: [^ '/'].
	^ '/' @env0:, (commonParts @env0:inject: '' into: [:acc :each |
		(acc @env0:isEmpty) ifTrue: [each] ifFalse: [((acc @env0:, '/') @env0:, each)]
	])
%

category: 'Grail-Path Manipulation'
method: os_path
commonprefix: paths
	"os.path.commonprefix(paths) — longest path prefix (char-by-char)."

	| pathsSize minLen prefix i char allMatch |
	(paths @env0:isEmpty) ifTrue: [^ ''].
	pathsSize := paths @env0:size.
	(pathsSize == 1) ifTrue: [^ paths @env0:first].
	minLen := paths @env0:inject: ((paths @env0:first) @env0:size) into: [:min :p |
		(min @env0:min: (p @env0:size))
	].
	prefix := ''.
	i := 1.
	[(i @env0:<= minLen)] @env0:whileTrue: [
		char := (paths @env0:first) @env0:at: i.
		allMatch := true.
		1 @env0:to: pathsSize do: [:j |
			((((paths @env0:at: j) @env0:at: i) @env0:= char)) ifFalse: [allMatch := false]
		].
		allMatch ifTrue: [
			prefix := prefix @env0:, (char @env0:asString).
			i := i @env0:+ 1
		] ifFalse: [
			i := minLen @env0:+ 1
		]
	].
	^ prefix
%

set compile_env: 0
