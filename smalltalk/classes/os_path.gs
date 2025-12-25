! ===============================================================================
! os_path Module (Python 'os.path' module)
! ===============================================================================
! This file contains the Python os.path module implementation.
! The os.path module provides common pathname manipulations.
! ===============================================================================

! ------------------- Remove existing Python methods from os_path
expectvalue /Metaclass3
doit
os_path removeAllMethods: 2.
os_path class removeAllMethods: 2.
%

set compile_env: 2
! ------------------- Class methods for os_path
! ------------------- Instance methods for os_path

category: 'Python-Path Manipulation'
method: os_path
join: path
	"Join one or more path components intelligently"
	^ path
%

category: 'Python-Path Manipulation'
method: os_path
join: path _: path2
	"Join two path components intelligently"
	| sep |
	sep := '/'.
	"If path2 is absolute, it replaces path1"
	(path2 ___beginsWith___: sep) ifTrue: [
		^ path2
	].
	(path ___endsWith___: sep) ifTrue: [
		^ path ___concat___: path2
	].
	^ (path ___concat___: sep) ___concat___: path2
%

category: 'Python-Path Manipulation'
method: os_path
join: path _: path2 _: path3
	"Join three path components intelligently"
	^ self join: (self join: path _: path2) _: path3
%

category: 'Python-Path Manipulation'
method: os_path
join: path _: path2 _: path3 _: path4
	"Join four path components intelligently"
	^ self join: (self join: path _: path2 _: path3) _: path4
%

category: 'Python-Path Manipulation'
method: os_path
join: path _: path2 _: path3 _: path4 _: path5
	"Join five path components intelligently"
	^ self join: (self join: path _: path2 _: path3 _: path4) _: path5
%

category: 'Python-Path Manipulation'
method: os_path
joinAll: paths
	"Join multiple path components from a collection"
	| result sep first size i each path |
	(paths ___isEmpty___) ifTrue: [^ ''].
	((paths ___size___) ___eq___: 1) ifTrue: [^ paths ___first___].
	sep := '/'.
	result := paths ___first___.
	size := paths ___size___.
	2 ___to___: size do: [:i |
		each := paths ___at___: i.
		path := each.
		"If path is absolute, it replaces everything before it"
		(path ___beginsWith___: sep) ifTrue: [
			result := path
		] ifFalse: [
			(result ___endsWith___: sep) ifTrue: [
				result := result ___concat___: path
			] ifFalse: [
				result := (result ___concat___: sep) ___concat___: path
			]
		]
	].
	^ result
%

category: 'Python-Path Manipulation'
method: os_path
basename: path
	"Return the base name of pathname path"
	| sep lastIndex pathSize trimmedPath reversedPath reversedSep index |
	sep := '/'.
	pathSize := path ___size___.
	"Remove trailing separators"
	trimmedPath := path.
	(path ___endsWith___: sep) ifTrue: [
		trimmedPath := path ___copyFrom___: 1 to: (pathSize ___minus___: 1)
	].
	(trimmedPath ___isEmpty___) ifTrue: [^ sep].
	"Find last occurrence by reversing string and finding first occurrence"
	reversedPath := trimmedPath ___reverse___.
	reversedSep := sep ___reverse___.
	index := reversedPath ___findString___: reversedSep startingAt: 1.
	(index ___eq___: 0) ifTrue: [
		lastIndex := 0
	] ifFalse: [
		"Convert back to original position: length - found_index + 1"
		lastIndex := ((trimmedPath ___size___) ___minus___: (index)) ___plus___: 1
	].
	lastIndex == 0 ifTrue: [
		^ trimmedPath
	].
	^ trimmedPath ___copyFrom___: (lastIndex ___plus___: 1) to: trimmedPath ___size___
%

category: 'Python-Path Manipulation'
method: os_path
dirname: path
	"Return the directory name of pathname path"
	| sep lastIndex reversedPath reversedSep index pathSize trimmedPath |
	sep := '/'.
	pathSize := path ___size___.
	"Remove trailing separators before processing"
	trimmedPath := path.
	(path ___endsWith___: sep) ifTrue: [
		trimmedPath := path ___copyFrom___: 1 to: (pathSize ___minus___: 1)
	].
	(trimmedPath ___isEmpty___) ifTrue: [^ sep].
	"Find last occurrence by reversing string and finding first occurrence"
	reversedPath := trimmedPath ___reverse___.
	reversedSep := sep ___reverse___.
	index := reversedPath ___findString___: reversedSep startingAt: 1.
	(index ___eq___: 0) ifTrue: [
		lastIndex := 0
	] ifFalse: [
		"Convert back to original position: length - found_index + 1"
		lastIndex := ((trimmedPath ___size___) ___minus___: (index)) ___plus___: 1
	].
	(lastIndex == 0) ifTrue: [
		^ '.'
	].
	(lastIndex == 1) ifTrue: [
		^ sep
	].
	^ trimmedPath ___copyFrom___: 1 to: (lastIndex ___minus___: 1)
%

category: 'Python-Path Manipulation'
method: os_path
split: path
	"Split the pathname path into a pair (head, tail)"
	| sep lastIndex head tail pathSize reversedPath reversedSep index |
	sep := '/'.
	pathSize := path ___size___.
	"Find last occurrence by reversing string and finding first occurrence"
	reversedPath := path ___reverse___.
	reversedSep := sep ___reverse___.
	index := reversedPath ___findString___: reversedSep startingAt: 1.
	(index ___eq___: 0) ifTrue: [
		lastIndex := 0
	] ifFalse: [
		"Convert back to original position: length - found_index + 1"
		lastIndex := (pathSize ___minus___: (index)) ___plus___: 1
	].
	(lastIndex ___eq___: 0) ifTrue: [
		^ Array ___with___: '' with: path
	].
	(lastIndex ___eq___: pathSize) ifTrue: [
		"Path ends with separator"
		head := path ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
		(head ___isEmpty___) ifTrue: [head := sep].
		^ Array ___with___: head with: ''
	].
	head := path ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
	tail := path ___copyFrom___: (lastIndex ___plus___: 1) to: pathSize.
	^ Array ___with___: head with: tail
%

category: 'Python-Path Manipulation'
method: os_path
splitext: path
	"Split the pathname path into a pair (root, ext)"
	| lastDotIndex root ext pathSize sepIndex reversedPath reversedDot reversedSep index |
	pathSize := path ___size___.
	"Find last occurrence of '.' by reversing string"
	reversedPath := path ___reverse___.
	reversedDot := '.' ___reverse___.
	index := reversedPath ___findString___: reversedDot startingAt: 1.
	(index ___eq___: 0) ifTrue: [
		lastDotIndex := 0
	] ifFalse: [
		"Convert back to original position: length - found_index + 1"
		lastDotIndex := (pathSize ___minus___: (index)) ___plus___: 1
	].
	(lastDotIndex ___eq___: 0) ifTrue: [
		^ Array ___with___: path with: ''
	].
	(lastDotIndex ___eq___: pathSize) ifTrue: [
		^ Array ___with___: path with: ''
	].
	"Check if there's a path separator after the dot (e.g., '/.hidden')"
	reversedSep := '/' ___reverse___.
	index := reversedPath ___findString___: reversedSep startingAt: 1.
	(index ___eq___: 0) ifTrue: [
		sepIndex := 0
	] ifFalse: [
		"Convert back to original position: length - found_index + 1"
		sepIndex := (pathSize ___minus___: (index)) ___plus___: 1
	].
	(sepIndex ___gt___: lastDotIndex) ifTrue: [
		^ Array ___with___: path with: ''
	].
	"If dot is at position 1 (leading dot), it's not an extension"
	(lastDotIndex ___eq___: 1) ifTrue: [
		^ Array ___with___: path with: ''
	].
	root := path ___copyFrom___: 1 to: (lastDotIndex ___minus___: 1).
	ext := path ___copyFrom___: lastDotIndex to: pathSize.
	^ Array ___with___: root with: ext
%

category: 'Python-Path Manipulation'
method: os_path
isabs: path
	"Return True if path is an absolute pathname"
	^ (path ___beginsWith___: '/')
%

category: 'Python-Path Manipulation'
method: os_path
normpath: path
	"Normalize a pathname by collapsing redundant separators and up-level references"
	| parts sep isAbsolute dotDotIndex prevIndex |
	sep := '/'.
	parts := $/ ___split___: path.
	isAbsolute := path ___beginsWith___: sep.
	"First, remove empty strings and '.' elements"
	parts := parts perform: #reject: env: 0 withArguments: {[:each |
		(each ___isEmpty___) or: [each ___eq___: '.']
	]}.
	"Preserve leading empty string for absolute paths (if not already present)"
	(isAbsolute and: [(parts ___isEmpty___) or: [
		((parts ___first___) ___isEmpty___) not
	]]) ifTrue: [
		parts perform: #addFirst: env: 0 withArguments: {''}
	].
	"Process '..' elements: remove '..' and the element before it"
	[((parts ___indexOf___: '..' ifAbsent: [0]) ___eq___: 0) not] whileTrue: [
		dotDotIndex := parts ___indexOf___: '..' ifAbsent: [0].
		(dotDotIndex ___eq___: 1) ifTrue: [
			"First element is '..' - keep it for relative paths, remove for absolute"
			isAbsolute ifTrue: [
				parts ___removeAtIndex___: 1
			] ifFalse: [
				"Keep '..' at start of relative path - exit loop"
				^ parts ___inject___: (parts ___first___) into: [:acc :each |
					((each ___eq___: (parts ___first___))) ifTrue: [
						acc
					] ifFalse: [
						((acc ___concat___: sep) ___concat___: each)
					]
				]
			]
		] ifFalse: [
			prevIndex := dotDotIndex ___minus___: (1).
			((parts ___at___: prevIndex) ___isEmpty___) ifTrue: [
				"Previous is root (empty string) - just remove '..'"
				parts ___removeAtIndex___: dotDotIndex
			] ifFalse: [
				"Remove both previous element and '..'"
				parts ___removeAtIndex___: dotDotIndex.
				parts ___removeAtIndex___: prevIndex
			]
		]
	].
	"Convert parts back to string"
	(parts ___isEmpty___) ifTrue: [^ '.'].
	((parts ___size___) ___eq___: 1) ifTrue: [
		((parts ___first___) ___isEmpty___) ifTrue: [^ sep] ifFalse: [^ parts ___first___]
	].
	"Join parts with separator, handling root (empty first element)"
	((parts ___first___) ___isEmpty___) ifTrue: [
		"Absolute path - start with separator, then join rest"
		| rest |
		rest := parts ___copyFrom___: 2 to: parts ___size___.
		(rest ___isEmpty___) ifTrue: [
			^ sep
		] ifFalse: [
			"Start with separator + first element, then add separator + element for rest"
			^ rest ___inject___: (sep ___concat___: (rest ___first___)) into: [:acc :each |
				((each ___eq___: (rest ___first___))) ifTrue: [
					acc
				] ifFalse: [
					((acc ___concat___: sep) ___concat___: each)
				]
			]
		]
	] ifFalse: [
		"Relative path - join all parts"
		^ parts ___inject___: (parts ___first___) into: [:acc :each |
			((each ___eq___: (parts ___first___))) ifTrue: [
				acc
			] ifFalse: [
						((acc ___concat___: sep) ___concat___: each)
			]
		]
	]
%

category: 'Python-Path Manipulation'
method: os_path
abspath: path
	"Return a normalized absolutized version of the pathname path"
	| cwd normalized |
	(self isabs: path) ifTrue: [
		^ self normpath: path
	].
	cwd := os ___new___.
	cwd := cwd perform: #getcwd env: 2.
	normalized := self normpath: path.
	^ self join: cwd _: normalized
%

category: 'Python-Path Manipulation'
method: os_path
exists: path
	"Return True if path refers to an existing path"
	| o |
	o := os ___new___.
	^ o perform: #exists: env: 2 withArguments: {path}
%

category: 'Python-Path Manipulation'
method: os_path
isdir: path
	"Return True if path is an existing directory"
	| o |
	o := os ___new___.
	^ o perform: #isdir: env: 2 withArguments: {path}
%

category: 'Python-Path Manipulation'
method: os_path
isfile: path
	"Return True if path is an existing regular file"
	| o |
	o := os ___new___.
	^ o perform: #isfile: env: 2 withArguments: {path}
%

category: 'Python-Path Manipulation'
method: os_path
commonpath: paths
	"Return the longest common sub-path of each pathname in paths"
	| commonParts allParts minSize pathsSize i path normalized parts allPartsSize j partsSize firstSize k firstPart allMatch |
	(paths ___isEmpty___) ifTrue: [
		ValueError ___signal___: 'commonpath() arg is an empty sequence'
	].
	allParts := OrderedCollection ___new___.
	pathsSize := paths ___size___.
	1 ___to___: pathsSize do: [:i |
		path := paths ___at___: i.
		normalized := self normpath: path.
		parts := $/ ___split___: normalized.
		partsSize := parts ___size___.
		parts := parts ___select___: [:each | each perform: #notEmpty env: 0].
		allParts ___add___: parts
	].
	firstSize := (allParts ___first___) ___size___.
	minSize := allParts ___inject___: firstSize into: [:min :parts |
		(min ___min___: (parts ___size___))
	].
	commonParts := OrderedCollection ___new___.
	allPartsSize := allParts ___size___.
	i := 1.
	[(i ___le___: minSize)] ___whileTrue___: [
		firstPart := (allParts ___first___) ___at___: i.
		allMatch := true.
		1 ___to___: allPartsSize do: [:j |
			parts := allParts ___at___: j.
			((parts ___at___: i) ___eq___: firstPart) ifFalse: [
				allMatch := false
			]
		].
		allMatch ifTrue: [
			commonParts ___add___: firstPart.
			i := i ___plus___: 1
		] ifFalse: [
			"If first part doesn't match, paths don't start from common point"
			(i == 1) ifTrue: [
				ValueError ___signal___: 'Paths do not start from a common point'
			].
			"Stop the loop"
			i := minSize ___plus___: 1
		]
	].
	(commonParts ___isEmpty___) ifTrue: [^ '/'].
	^ ('/' ___concat___: (commonParts ___inject___: '' into: [:acc :each |
		(acc ___isEmpty___) ifTrue: [each] ifFalse: [((acc ___concat___: '/') ___concat___: each)]
	]))
%

category: 'Python-Path Manipulation'
method: os_path
commonprefix: paths
	"Return the longest path prefix (taken character-by-character) that is a prefix of all paths"
	| prefix minLen pathsSize i char allMatch j path |
	(paths ___isEmpty___) ifTrue: [^ ''].
	pathsSize := paths ___size___.
	(pathsSize ___eq___: 1) ifTrue: [^ paths ___first___].
	minLen := paths ___inject___: ((paths ___first___) ___size___) into: [:min :path |
		(min ___min___: (path ___size___))
	].
	prefix := ''.
	1 ___to___: minLen do: [:i |
		char := (paths ___first___) ___at___: i.
		allMatch := true.
		1 ___to___: pathsSize do: [:j |
			path := paths ___at___: j.
			((path ___at___: i) ___eq___: char) ifFalse: [
				allMatch := false
			]
		].
		allMatch ifTrue: [
			prefix := prefix ___concat___: (char ___asString___)
		] ifFalse: [
			^ prefix
		]
	].
	^ prefix
%

set compile_env: 0

