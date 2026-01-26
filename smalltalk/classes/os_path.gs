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

! ------------------- Instance methods for os_path

category: 'Python-Initialization'
method: os_path
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_join;
		initialize_basename;
		initialize_dirname;
		initialize_split;
		initialize_splitext;
		initialize_isabs;
		initialize_normpath;
		initialize_abspath;
		initialize_exists;
		initialize_isdir;
		initialize_isfile;
		initialize_commonpath;
		initialize_commonprefix;
		yourself
%

category: 'Python-Initialization'
method: os_path
initialize_join
	"Join one or more path components intelligently. Takes a collection of paths."
	self ___at___: #join put: [:positional :keywords |
		| paths result sep first size i each path |
		paths := positional ___at___: 1.
		(paths ___isEmpty___) ifTrue: [
			''
		] ifFalse: [
			((paths ___size___) ___eq___: 1) ifTrue: [
				paths ___first___
			] ifFalse: [
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
				result
			]
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_basename
	"Return the base name of pathname path"
	self ___at___: #basename put: [:positional :keywords |
		| path sep lastIndex pathSize trimmedPath reversedPath reversedSep index |
		path := positional ___at___: 1.
		sep := '/'.
		pathSize := path ___size___.
		"Remove trailing separators"
		trimmedPath := path.
		(path ___endsWith___: sep) ifTrue: [
			trimmedPath := path ___copyFrom___: 1 to: (pathSize ___minus___: 1)
		].
		(trimmedPath ___isEmpty___) ifTrue: [
			sep
		] ifFalse: [
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
				trimmedPath
			] ifFalse: [
				trimmedPath ___copyFrom___: (lastIndex ___plus___: 1) to: trimmedPath ___size___
			]
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_dirname
	"Return the directory name of pathname path"
	self ___at___: #dirname put: [:positional :keywords |
		| path sep lastIndex reversedPath reversedSep index pathSize trimmedPath |
		path := positional ___at___: 1.
		sep := '/'.
		pathSize := path ___size___.
		"Remove trailing separators before processing"
		trimmedPath := path.
		(path ___endsWith___: sep) ifTrue: [
			trimmedPath := path ___copyFrom___: 1 to: (pathSize ___minus___: 1)
		].
		(trimmedPath ___isEmpty___) ifTrue: [
			sep
		] ifFalse: [
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
				'.'
			] ifFalse: [
				(lastIndex == 1) ifTrue: [
					sep
				] ifFalse: [
					trimmedPath ___copyFrom___: 1 to: (lastIndex ___minus___: 1)
				]
			]
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_split
	"Split the pathname path into a pair (head, tail)"
	self ___at___: #split put: [:positional :keywords |
		| path sep lastIndex head tail pathSize reversedPath reversedSep index |
		path := positional ___at___: 1.
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
			tuple ___with___: '' with: path
		] ifFalse: [
			(lastIndex ___eq___: pathSize) ifTrue: [
				"Path ends with separator"
				head := path ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
				(head ___isEmpty___) ifTrue: [head := sep].
				tuple ___with___: head with: ''
			] ifFalse: [
				head := path ___copyFrom___: 1 to: (lastIndex ___minus___: 1).
				tail := path ___copyFrom___: (lastIndex ___plus___: 1) to: pathSize.
				tuple ___with___: head with: tail
			]
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_splitext
	"Split the pathname path into a pair (root, ext)"
	self ___at___: #splitext put: [:positional :keywords |
		| path lastDotIndex root ext pathSize sepIndex reversedPath reversedDot reversedSep index |
		path := positional ___at___: 1.
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
			tuple ___with___: path with: ''
		] ifFalse: [
			(lastDotIndex ___eq___: pathSize) ifTrue: [
				tuple ___with___: path with: ''
			] ifFalse: [
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
					tuple ___with___: path with: ''
				] ifFalse: [
					"If dot is at position 1 (leading dot), it's not an extension"
					(lastDotIndex ___eq___: 1) ifTrue: [
						tuple ___with___: path with: ''
					] ifFalse: [
						root := path ___copyFrom___: 1 to: (lastDotIndex ___minus___: 1).
						ext := path ___copyFrom___: lastDotIndex to: pathSize.
						tuple ___with___: root with: ext
					]
				]
			]
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_isabs
	"Return True if path is an absolute pathname"
	self ___at___: #isabs put: [:positional :keywords |
		| path |
		path := positional ___at___: 1.
		(path ___beginsWith___: '/')
	]
%

category: 'Python-Initialization'
method: os_path
initialize_normpath
	"Normalize a pathname by collapsing redundant separators and up-level references"
	self ___at___: #normpath put: [:positional :keywords |
		| path parts sep isAbsolute dotDotIndex prevIndex result earlyExit |
		path := positional ___at___: 1.
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
		earlyExit := false.
		result := nil.
		"Process '..' elements: remove '..' and the element before it"
		[((parts ___indexOf___: '..' ifAbsent: [0]) ___eq___: 0) not] whileTrue: [
			dotDotIndex := parts ___indexOf___: '..' ifAbsent: [0].
			(dotDotIndex ___eq___: 1) ifTrue: [
				"First element is '..' - keep it for relative paths, remove for absolute"
				isAbsolute ifTrue: [
					parts ___removeAtIndex___: 1
				] ifFalse: [
					"Keep '..' at start of relative path - exit loop"
					result := parts ___inject___: (parts ___first___) into: [:acc :each |
						((each ___eq___: (parts ___first___))) ifTrue: [
							acc
						] ifFalse: [
							((acc ___concat___: sep) ___concat___: each)
						]
					].
					earlyExit := true
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
			].
			earlyExit ifTrue: [
				parts := list ___new___
			]
		].
		earlyExit ifTrue: [
			result
		] ifFalse: [
			"Convert parts back to string"
			(parts ___isEmpty___) ifTrue: [
				'.'
			] ifFalse: [
				((parts ___size___) ___eq___: 1) ifTrue: [
					((parts ___first___) ___isEmpty___) ifTrue: [sep] ifFalse: [parts ___first___]
				] ifFalse: [
					"Join parts with separator, handling root (empty first element)"
					((parts ___first___) ___isEmpty___) ifTrue: [
						"Absolute path - start with separator, then join rest"
						| rest |
						rest := parts ___copyFrom___: 2 to: parts ___size___.
						(rest ___isEmpty___) ifTrue: [
							sep
						] ifFalse: [
							"Start with separator + first element, then add separator + element for rest"
							rest ___inject___: (sep ___concat___: (rest ___first___)) into: [:acc :each |
								((each ___eq___: (rest ___first___))) ifTrue: [
									acc
								] ifFalse: [
									((acc ___concat___: sep) ___concat___: each)
								]
							]
						]
					] ifFalse: [
						"Relative path - join all parts"
						parts ___inject___: (parts ___first___) into: [:acc :each |
							((each ___eq___: (parts ___first___))) ifTrue: [
								acc
							] ifFalse: [
								((acc ___concat___: sep) ___concat___: each)
							]
						]
					]
				]
			]
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_abspath
	"Return a normalized absolutized version of the pathname path"
	self ___at___: #abspath put: [:positional :keywords |
		| path isabsBlock normpathBlock joinBlock cwd normalized getcwdBlock |
		path := positional ___at___: 1.
		isabsBlock := self isabs.
		normpathBlock := self normpath.
		joinBlock := self join.
		(isabsBlock value: {path} value: nil) ifTrue: [
			normpathBlock value: {path} value: nil
		] ifFalse: [
			cwd := os instance.
			getcwdBlock := cwd getcwd.
			cwd := getcwdBlock value: {} value: nil.
			normalized := normpathBlock value: {path} value: nil.
			joinBlock value: {{cwd. normalized}} value: nil.
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_exists
	"Return True if path refers to an existing path"
	self ___at___: #exists put: [:positional :keywords |
		| path o existsBlock |
		path := positional ___at___: 1.
		o := os instance.
		existsBlock := o exists.
		existsBlock value: {path} value: nil
	]
%

category: 'Python-Initialization'
method: os_path
initialize_isdir
	"Return True if path is an existing directory"
	self ___at___: #isdir put: [:positional :keywords |
		| path o isdirBlock |
		path := positional ___at___: 1.
		o := os instance.
		isdirBlock := o isdir.
		isdirBlock value: {path} value: nil
	]
%

category: 'Python-Initialization'
method: os_path
initialize_isfile
	"Return True if path is an existing regular file"
	self ___at___: #isfile put: [:positional :keywords |
		| path o isfileBlock |
		path := positional ___at___: 1.
		o := os instance.
		isfileBlock := o isfile.
		isfileBlock value: {path} value: nil
	]
%

category: 'Python-Initialization'
method: os_path
initialize_commonpath
	"Return the longest common sub-path of each pathname in paths"
	self ___at___: #commonpath put: [:positional :keywords |
		| paths commonParts allParts minSize pathsSize i path normalized parts allPartsSize j partsSize firstSize k firstPart allMatch normpathBlock |
		paths := positional ___at___: 1.
		(paths ___isEmpty___) ifTrue: [
			ValueError ___signal___: 'commonpath() arg is an empty sequence'
		].
		allParts := list ___new___.
		pathsSize := paths ___size___.
		normpathBlock := self normpath.
		1 ___to___: pathsSize do: [:i |
			path := paths ___at___: i.
			normalized := normpathBlock value: {path} value: nil.
			parts := $/ ___split___: normalized.
			partsSize := parts ___size___.
			parts := parts ___select___: [:each | each perform: #notEmpty env: 0].
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
				parts := allParts ___at___: j.
				((parts ___at___: i) ___eq___: firstPart) ifFalse: [
					allMatch := false
				]
			].
			allMatch ifTrue: [
				commonParts append: firstPart.
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
		(commonParts ___isEmpty___) ifTrue: [
			'/'
		] ifFalse: [
			'/' ___concat___: (commonParts ___inject___: '' into: [:acc :each |
				(acc ___isEmpty___) ifTrue: [each] ifFalse: [((acc ___concat___: '/') ___concat___: each)]
			])
		]
	]
%

category: 'Python-Initialization'
method: os_path
initialize_commonprefix
	"Return the longest path prefix (taken character-by-character) that is a prefix of all paths"
	self ___at___: #commonprefix put: [:positional :keywords |
		| paths prefix minLen pathsSize i char allMatch j path |
		paths := positional ___at___: 1.
		(paths ___isEmpty___) ifTrue: [
			''
		] ifFalse: [
			pathsSize := paths ___size___.
			(pathsSize ___eq___: 1) ifTrue: [
				paths ___first___
			] ifFalse: [
				minLen := paths ___inject___: ((paths ___first___) ___size___) into: [:min :path |
					(min ___min___: (path ___size___))
				].
				prefix := ''.
				i := 1.
				[(i ___le___: minLen)] ___whileTrue___: [
					char := (paths ___first___) ___at___: i.
					allMatch := true.
					1 ___to___: pathsSize do: [:j |
						path := paths ___at___: j.
						((path ___at___: i) ___eq___: char) ifFalse: [
							allMatch := false
						]
					].
					allMatch ifTrue: [
						prefix := prefix ___concat___: (char ___asString___).
						i := i ___plus___: 1
					] ifFalse: [
						i := minLen ___plus___: 1
					]
				].
				prefix
			]
		]
	]
%

category: 'Python-Path Manipulation'
method: os_path
join
	"Return the join function"
	^ self ___at___: #join
%

category: 'Python-Path Manipulation'
method: os_path
join: aBlock
	"Set the join function (for monkey patching)"
	self ___at___: #join put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
basename
	"Return the basename function"
	^ self ___at___: #basename
%

category: 'Python-Path Manipulation'
method: os_path
basename: aBlock
	"Set the basename function (for monkey patching)"
	self ___at___: #basename put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
dirname
	"Return the dirname function"
	^ self ___at___: #dirname
%

category: 'Python-Path Manipulation'
method: os_path
dirname: aBlock
	"Set the dirname function (for monkey patching)"
	self ___at___: #dirname put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
split
	"Return the split function"
	^ self ___at___: #split
%

category: 'Python-Path Manipulation'
method: os_path
split: aBlock
	"Set the split function (for monkey patching)"
	self ___at___: #split put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
splitext
	"Return the splitext function"
	^ self ___at___: #splitext
%

category: 'Python-Path Manipulation'
method: os_path
splitext: aBlock
	"Set the splitext function (for monkey patching)"
	self ___at___: #splitext put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
isabs
	"Return the isabs function"
	^ self ___at___: #isabs
%

category: 'Python-Path Manipulation'
method: os_path
isabs: aBlock
	"Set the isabs function (for monkey patching)"
	self ___at___: #isabs put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
normpath
	"Return the normpath function"
	^ self ___at___: #normpath
%

category: 'Python-Path Manipulation'
method: os_path
normpath: aBlock
	"Set the normpath function (for monkey patching)"
	self ___at___: #normpath put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
abspath
	"Return the abspath function"
	^ self ___at___: #abspath
%

category: 'Python-Path Manipulation'
method: os_path
abspath: aBlock
	"Set the abspath function (for monkey patching)"
	self ___at___: #abspath put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
exists
	"Return the exists function"
	^ self ___at___: #exists
%

category: 'Python-Path Manipulation'
method: os_path
exists: aBlock
	"Set the exists function (for monkey patching)"
	self ___at___: #exists put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
isdir
	"Return the isdir function"
	^ self ___at___: #isdir
%

category: 'Python-Path Manipulation'
method: os_path
isdir: aBlock
	"Set the isdir function (for monkey patching)"
	self ___at___: #isdir put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
isfile
	"Return the isfile function"
	^ self ___at___: #isfile
%

category: 'Python-Path Manipulation'
method: os_path
isfile: aBlock
	"Set the isfile function (for monkey patching)"
	self ___at___: #isfile put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
commonpath
	"Return the commonpath function"
	^ self ___at___: #commonpath
%

category: 'Python-Path Manipulation'
method: os_path
commonpath: aBlock
	"Set the commonpath function (for monkey patching)"
	self ___at___: #commonpath put: aBlock
%

category: 'Python-Path Manipulation'
method: os_path
commonprefix
	"Return the commonprefix function"
	^ self ___at___: #commonprefix
%

category: 'Python-Path Manipulation'
method: os_path
commonprefix: aBlock
	"Set the commonprefix function (for monkey patching)"
	self ___at___: #commonprefix put: aBlock
%

set compile_env: 0
