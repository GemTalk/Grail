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
os_path category: 'Modules'
%

! ------------------- Remove existing Python methods from os_path
expectvalue /Metaclass3
doit
os_path removeAllMethods: 1.
os_path class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Initialization'
method: os_path
initialize
	"No-op — all methods are real env-1 fast-path methods."
%

! ===============================================================================
! Fast-path callables — path manipulation
! ===============================================================================

category: 'Python-Path Manipulation'
method: os_path
join: paths
	"os.path.join(paths) — join path components. Takes a collection."

	| result sep size |
	(paths ___isEmpty___) ifTrue: [^ ''].
	((paths ___size___) ___eq___: 1) ifTrue: [^ paths ___first___].
	sep := '/'.
	result := paths ___first___.
	size := paths ___size___.
	2 ___to___: size do: [:i |
		| each |
		each := paths ___at___: i.
		(each ___beginsWith___: sep) ifTrue: [
			result := each
		] ifFalse: [
			(result ___endsWith___: sep) ifTrue: [
				result := result ___concat___: each
			] ifFalse: [
				result := (result ___concat___: sep) ___concat___: each
			]
		]
	].
	^ result
%

category: 'Python-Path Manipulation'
method: os_path
basename: path
	"os.path.basename(path) — return the base name of pathname."

	| sep trimmedPath reversedPath index lastIndex |
	sep := '/'.
	trimmedPath := path.
	(path ___endsWith___: sep) ifTrue: [
		trimmedPath := path ___copyFrom___: 1 to: ((path ___size___) ___minus___: 1)
	].
	(trimmedPath ___isEmpty___) ifTrue: [^ sep].
	reversedPath := trimmedPath ___reverse___.
	index := reversedPath ___findString___: sep startingAt: 1.
	(index ___eq___: 0) ifTrue: [^ trimmedPath].
	lastIndex := ((trimmedPath ___size___) ___minus___: (index)) ___plus___: 1.
	^ trimmedPath ___copyFrom___: (lastIndex ___plus___: 1) to: trimmedPath ___size___
%

category: 'Python-Path Manipulation'
method: os_path
dirname: path
	"os.path.dirname(path) — return the directory name of pathname."

	| sep trimmedPath reversedPath index lastIndex |
	sep := '/'.
	trimmedPath := path.
	(path ___endsWith___: sep) ifTrue: [
		trimmedPath := path ___copyFrom___: 1 to: ((path ___size___) ___minus___: 1)
	].
	(trimmedPath ___isEmpty___) ifTrue: [^ sep].
	reversedPath := trimmedPath ___reverse___.
	index := reversedPath ___findString___: sep startingAt: 1.
	(index ___eq___: 0) ifTrue: [^ '.'].
	lastIndex := ((trimmedPath ___size___) ___minus___: (index)) ___plus___: 1.
	(lastIndex == 1) ifTrue: [^ sep].
	^ trimmedPath ___copyFrom___: 1 to: (lastIndex ___minus___: 1)
%

category: 'Python-Path Manipulation'
method: os_path
split: path
	"os.path.split(path) — split into (head, tail)."

	| sep pathSize reversedPath index lastIndex head tail |
	sep := '/'.
	pathSize := path ___size___.
	reversedPath := path ___reverse___.
	index := reversedPath ___findString___: sep startingAt: 1.
	(index ___eq___: 0) ifTrue: [^ tuple ___with___: '' with: path].
	lastIndex := (pathSize ___minus___: (index)) ___plus___: 1.
	(lastIndex ___eq___: pathSize) ifTrue: [
		head := path ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
		(head ___isEmpty___) ifTrue: [head := sep].
		^ tuple ___with___: head with: ''
	].
	head := path ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
	tail := path ___copyFrom___: (lastIndex ___plus___: 1) to: pathSize.
	^ tuple ___with___: head with: tail
%

category: 'Python-Path Manipulation'
method: os_path
splitext: path
	"os.path.splitext(path) — split into (root, ext)."

	| pathSize reversedPath index lastDotIndex sepIndex root ext |
	pathSize := path ___size___.
	reversedPath := path ___reverse___.
	index := reversedPath ___findString___: '.' startingAt: 1.
	(index ___eq___: 0) ifTrue: [^ tuple ___with___: path with: ''].
	lastDotIndex := (pathSize ___minus___: (index)) ___plus___: 1.
	(lastDotIndex ___eq___: pathSize) ifTrue: [^ tuple ___with___: path with: ''].
	"Check for path separator after dot"
	index := reversedPath ___findString___: '/' startingAt: 1.
	(index ___eq___: 0) ifTrue: [sepIndex := 0]
		ifFalse: [sepIndex := (pathSize ___minus___: (index)) ___plus___: 1].
	(sepIndex ___gt___: lastDotIndex) ifTrue: [^ tuple ___with___: path with: ''].
	(lastDotIndex ___eq___: 1) ifTrue: [^ tuple ___with___: path with: ''].
	root := path ___copyFrom___: 1 to: (lastDotIndex ___minus___: 1).
	ext := path ___copyFrom___: lastDotIndex to: pathSize.
	^ tuple ___with___: root with: ext
%

category: 'Python-Path Manipulation'
method: os_path
isabs: path
	"os.path.isabs(path) — True if path is absolute."

	^ path ___beginsWith___: '/'
%

category: 'Python-Path Manipulation'
method: os_path
normpath: path
	"os.path.normpath(path) — normalize a pathname."

	| parts sep isAbsolute earlyExit result dotDotIndex prevIndex |
	sep := '/'.
	parts := $/ ___split___: path.
	isAbsolute := path ___beginsWith___: sep.
	parts := parts @env0:reject: [:each | (each ___isEmpty___) or: [each ___eq___: '.']].
	(isAbsolute and: [(parts ___isEmpty___) or: [((parts ___first___) ___isEmpty___) not]])
		ifTrue: [parts @env0:addFirst: ''].
	earlyExit := false.
	result := nil.
	[((parts ___indexOf___: '..' ifAbsent: [0]) ___eq___: 0) not] whileTrue: [
		dotDotIndex := parts ___indexOf___: '..' ifAbsent: [0].
		(dotDotIndex ___eq___: 1) ifTrue: [
			isAbsolute ifTrue: [
				parts ___removeAtIndex___: 1
			] ifFalse: [
				result := parts ___inject___: (parts ___first___) into: [:acc :each |
					((each ___eq___: (parts ___first___))) ifTrue: [acc]
						ifFalse: [((acc ___concat___: sep) ___concat___: each)]
				].
				earlyExit := true
			]
		] ifFalse: [
			prevIndex := dotDotIndex ___minus___: (1).
			((parts ___at___: prevIndex) ___isEmpty___) ifTrue: [
				parts ___removeAtIndex___: dotDotIndex
			] ifFalse: [
				parts ___removeAtIndex___: dotDotIndex.
				parts ___removeAtIndex___: prevIndex
			]
		].
		earlyExit ifTrue: [parts := list ___new___]
	].
	earlyExit ifTrue: [^ result].
	(parts ___isEmpty___) ifTrue: [^ '.'].
	((parts ___size___) ___eq___: 1) ifTrue: [
		^ ((parts ___first___) ___isEmpty___) ifTrue: [sep] ifFalse: [parts ___first___]
	].
	((parts ___first___) ___isEmpty___) ifTrue: [
		| rest |
		rest := parts ___copyFrom___: 2 to: parts ___size___.
		(rest ___isEmpty___) ifTrue: [^ sep].
		^ rest ___inject___: (sep ___concat___: (rest ___first___)) into: [:acc :each |
			((each ___eq___: (rest ___first___))) ifTrue: [acc]
				ifFalse: [((acc ___concat___: sep) ___concat___: each)]
		]
	].
	^ parts ___inject___: (parts ___first___) into: [:acc :each |
		((each ___eq___: (parts ___first___))) ifTrue: [acc]
			ifFalse: [((acc ___concat___: sep) ___concat___: each)]
	]
%

category: 'Python-Path Manipulation'
method: os_path
abspath: path
	"os.path.abspath(path) — return normalized absolute pathname."

	(self isabs: path) ifTrue: [^ self normpath: path].
	^ self normpath: (self join: {(os instance) getcwd. path})
%

! ===============================================================================
! Fast-path callables — file queries (delegate to os)
! ===============================================================================

category: 'Python-Path Manipulation'
method: os_path
exists: path
	"os.path.exists(path) — delegates to os.exists."

	^ (os instance) exists: path
%

category: 'Python-Path Manipulation'
method: os_path
isdir: path
	"os.path.isdir(path) — delegates to os.isdir."

	^ (os instance) isdir: path
%

category: 'Python-Path Manipulation'
method: os_path
isfile: path
	"os.path.isfile(path) — delegates to os.isfile."

	^ (os instance) isfile: path
%

! ===============================================================================
! Fast-path callables — multi-path operations
! ===============================================================================

category: 'Python-Path Manipulation'
method: os_path
commonpath: paths
	"os.path.commonpath(paths) — longest common sub-path."

	| allParts firstSize minSize commonParts allPartsSize i firstPart allMatch |
	(paths ___isEmpty___) ifTrue: [
		ValueError ___signal___: 'commonpath() arg is an empty sequence'
	].
	allParts := list ___new___.
	paths ___do___: [:p |
		| normalized parts |
		normalized := self normpath: p.
		parts := $/ ___split___: normalized.
		parts := parts ___select___: [:each | each @env0:notEmpty].
		allParts append: parts
	].
	firstSize := (allParts ___first___) ___size___.
	minSize := allParts ___inject___: firstSize into: [:min :parts |
		(min ___min___: (parts ___size___))
	].
	commonParts := list ___new___.
	allPartsSize := allParts ___size___.
	i := 1.
	[(i ___le___: minSize)] ___whileTrue___: [
		firstPart := (allParts ___first___) ___at___: i.
		allMatch := true.
		1 ___to___: allPartsSize do: [:j |
			| parts |
			parts := allParts ___at___: j.
			((parts ___at___: i) ___eq___: firstPart) ifFalse: [allMatch := false]
		].
		allMatch ifTrue: [
			commonParts append: firstPart.
			i := i ___plus___: 1
		] ifFalse: [
			(i == 1) ifTrue: [
				ValueError ___signal___: 'Paths do not start from a common point'
			].
			i := minSize ___plus___: 1
		]
	].
	(commonParts ___isEmpty___) ifTrue: [^ '/'].
	^ '/' ___concat___: (commonParts ___inject___: '' into: [:acc :each |
		(acc ___isEmpty___) ifTrue: [each] ifFalse: [((acc ___concat___: '/') ___concat___: each)]
	])
%

category: 'Python-Path Manipulation'
method: os_path
commonprefix: paths
	"os.path.commonprefix(paths) — longest path prefix (char-by-char)."

	| pathsSize minLen prefix i char allMatch |
	(paths ___isEmpty___) ifTrue: [^ ''].
	pathsSize := paths ___size___.
	(pathsSize ___eq___: 1) ifTrue: [^ paths ___first___].
	minLen := paths ___inject___: ((paths ___first___) ___size___) into: [:min :p |
		(min ___min___: (p ___size___))
	].
	prefix := ''.
	i := 1.
	[(i ___le___: minLen)] ___whileTrue___: [
		char := (paths ___first___) ___at___: i.
		allMatch := true.
		1 ___to___: pathsSize do: [:j |
			((((paths ___at___: j) ___at___: i) ___eq___: char)) ifFalse: [allMatch := false]
		].
		allMatch ifTrue: [
			prefix := prefix ___concat___: (char ___asString___).
			i := i ___plus___: 1
		] ifFalse: [
			i := minLen ___plus___: 1
		]
	].
	^ prefix
%

set compile_env: 0
