! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
_sre ifNil: [self error: '_sre is not defined. Check file ordering.'].
%

! ------------------- Class definition for SreTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SreTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SreTestCase category: 'SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
SreTestCase removeAllMethods.
SreTestCase class removeAllMethods.
%

! ===============================================================================
! Setup and helpers
! ===============================================================================

category: 'Setup'
method: SreTestCase
setUp
	"Ensure the shim library is loaded."
	CPythonShim current.
%

category: 'Helpers'
method: SreTestCase
sreInstance
	"Return the _sre module instance."
	^ _sre perform: #instance env: 1
%

category: 'Helpers'
method: SreTestCase
compilePattern: patternStr flags: flags code: codeArray groups: groups groupindex: groupindex indexgroup: indexgroup
	"Compile an SRE pattern from raw bytecode."

	| sre compileFn args |
	sre := self sreInstance.
	compileFn := sre perform: #compile env: 1.
	args := OrderedCollection new.
	args add: patternStr.
	args add: flags.
	args add: (OrderedCollection withAll: codeArray).
	args add: groups.
	args add: groupindex.
	args add: indexgroup.
	^ compileFn value: args value: nil
%

category: 'Helpers'
method: SreTestCase
abcPattern
	"Return a compiled pattern for 'abc' (no groups)."

	^ self compilePattern: 'abc'
		flags: 32
		code: #(14 12 3 3 3 3 3 97 98 99 0 0 0 16 97 16 98 16 99 1)
		groups: 1
		groupindex: KeyValueDictionary new
		indexgroup: (Array with: nil)
%

category: 'Helpers'
method: SreTestCase
abcGroupPattern
	"Return a compiled pattern for 'a(b)c' (one capture group)."

	^ self compilePattern: 'a(b)c'
		flags: 32
		code: #(14 12 1 3 3 3 1 97 98 99 0 0 0 16 97 17 0 16 98 17 1 16 99 1)
		groups: 2
		groupindex: KeyValueDictionary new
		indexgroup: (Array with: nil with: nil)
%

! ===============================================================================
! Tests - Module Constants
! ===============================================================================

category: 'Tests - Constants'
method: SreTestCase
testMagic
	"Test that _sre.MAGIC matches the C engine's magic number."

	self assert: (self sreInstance perform: #MAGIC env: 1) equals: 20230612.
%

category: 'Tests - Constants'
method: SreTestCase
testCodesize
	"Test that _sre.CODESIZE is 4."

	self assert: (self sreInstance perform: #CODESIZE env: 1) equals: 4.
%

category: 'Tests - Constants'
method: SreTestCase
testMaxrepeat
	"Test that _sre.MAXREPEAT is set."

	self assert: (self sreInstance perform: #MAXREPEAT env: 1) equals: 4294967295.
%

category: 'Tests - Constants'
method: SreTestCase
testMaxgroups
	"Test that _sre.MAXGROUPS is set."

	self assert: (self sreInstance perform: #MAXGROUPS env: 1) equals: 1073741823.
%

! ===============================================================================
! Tests - Compile and Match
! ===============================================================================

category: 'Tests - Compile'
method: SreTestCase
testCompileLiteral
	"Test that _sre.compile() returns a SrePattern object."

	| pattern |
	pattern := self abcPattern.
	self assert: (pattern isKindOf: SrePattern).
%

category: 'Tests - Search'
method: SreTestCase
testPatternSearch
	"Test that pattern.search() finds a match."

	| pattern searchFn match |
	pattern := self abcPattern.
	searchFn := pattern perform: #search env: 1.
	match := searchFn value: (OrderedCollection with: 'xyzabc') value: nil.
	self assert: (match isKindOf: SreMatch).
%

category: 'Tests - Search'
method: SreTestCase
testPatternSearchNoMatch
	"Test that pattern.search() returns nil when no match."

	| pattern searchFn match |
	pattern := self abcPattern.
	searchFn := pattern perform: #search env: 1.
	match := searchFn value: (OrderedCollection with: 'xyz') value: nil.
	self assert: match equals: nil.
%

category: 'Tests - Match'
method: SreTestCase
testMatchGroup
	"Test that match.group(0) returns the matched text."

	| pattern searchFn match groupFn result |
	pattern := self abcPattern.
	searchFn := pattern perform: #search env: 1.
	match := searchFn value: (OrderedCollection with: 'xyzabc123') value: nil.
	groupFn := match perform: #group env: 1.
	result := groupFn value: (OrderedCollection with: 0) value: nil.
	self assert: result equals: 'abc'.
%

category: 'Tests - Match'
method: SreTestCase
testMatchSpan
	"Test that match.span(0) returns the correct (start, end) tuple."

	| pattern searchFn match spanFn result |
	pattern := self abcPattern.
	searchFn := pattern perform: #search env: 1.
	match := searchFn value: (OrderedCollection with: 'xyzabc') value: nil.
	spanFn := match perform: #span env: 1.
	result := spanFn value: (OrderedCollection with: 0) value: nil.
	self assert: (result at: 1) equals: 3.
	self assert: (result at: 2) equals: 6.
%

category: 'Tests - Match'
method: SreTestCase
testMatchWithGroups
	"Test compile and match with capture groups: 'a(b)c'"

	| pattern searchFn match groupFn result |
	pattern := self abcGroupPattern.
	searchFn := pattern perform: #search env: 1.
	match := searchFn value: (OrderedCollection with: 'xyzabc123') value: nil.
	groupFn := match perform: #group env: 1.
	"group(0) = whole match"
	result := groupFn value: (OrderedCollection with: 0) value: nil.
	self assert: result equals: 'abc'.
	"group(1) = first capture group"
	result := groupFn value: (OrderedCollection with: 1) value: nil.
	self assert: result equals: 'b'.
%

category: 'Tests - Match'
method: SreTestCase
testPatternMatch
	"Test that pattern.match() matches at the beginning only."

	| pattern matchFn match groupFn result |
	pattern := self abcPattern.
	matchFn := pattern perform: #match env: 1.
	"match() only matches at the beginning - should fail for 'xyzabc'"
	match := matchFn value: (OrderedCollection with: 'xyzabc') value: nil.
	self assert: match equals: nil.
	"match() should succeed for 'abcxyz'"
	match := matchFn value: (OrderedCollection with: 'abcxyz') value: nil.
	self assert: (match isKindOf: SreMatch).
	groupFn := match perform: #group env: 1.
	result := groupFn value: (OrderedCollection with: 0) value: nil.
	self assert: result equals: 'abc'.
%

set compile_env: 0
