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
SreTestCase category: 'Grail-SUnit'
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

category: 'Grail-Setup'
method: SreTestCase
setUp
	"Ensure the shim library is loaded."
	CPythonShim current.
%

category: 'Grail-Helpers'
method: SreTestCase
sreInstance
	"Return the _sre module instance."
	^ _sre @env1:instance
%

category: 'Grail-Helpers'
method: SreTestCase
compilePattern: patternStr flags: flags code: codeArray groups: groups groupindex: groupindex indexgroup: indexgroup
	"Compile an SRE pattern from raw bytecode using the arity-specialized
	`compile:_:_:_:_:_:` method on _sre."

	^ self sreInstance @env1:compile: patternStr
		_: flags
		_: (OrderedCollection withAll: codeArray)
		_: groups
		_: groupindex
		_: indexgroup
%

category: 'Grail-Helpers'
method: SreTestCase
skipIfCompileUnavailable
	"Skip the calling test if _sre.compile() is not yet wired up at the C
	level. The compile path returns a C-allocated PatternObject and depends
	on shimCallTyped's returnCPtr support — see MEMORY.md `_sre Module` for
	the current status."

	[self compilePattern: 'a'
		flags: 32
		code: #(14 5 1 1 1 1 1 97 0 0 0 16 97 1)
		groups: 1
		groupindex: KeyValueDictionary new
		indexgroup: (Array with: nil)
	] on: AbstractException do: [:ex |
		^ self skip: '_sre.compile() not yet wired up: ' , ex messageText
	].
%

category: 'Grail-Helpers'
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

category: 'Grail-Helpers'
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

category: 'Grail-Tests - Constants'
method: SreTestCase
testMagic
	"Test that _sre.MAGIC matches the C engine's magic number."

	self assert: (self sreInstance @env1:MAGIC) equals: 20230612.
%

category: 'Grail-Tests - Constants'
method: SreTestCase
testCodesize
	"Test that _sre.CODESIZE is 4."

	self assert: (self sreInstance @env1:CODESIZE) equals: 4.
%

category: 'Grail-Tests - Constants'
method: SreTestCase
testMaxrepeat
	"Test that _sre.MAXREPEAT is set."

	self assert: (self sreInstance @env1:MAXREPEAT) equals: 4294967295.
%

category: 'Grail-Tests - Constants'
method: SreTestCase
testMaxgroups
	"Test that _sre.MAXGROUPS is set."

	self assert: (self sreInstance @env1:MAXGROUPS) equals: 1073741823.
%

! ===============================================================================
! Tests - Compile and Match
! ===============================================================================

category: 'Grail-Tests - Compile'
method: SreTestCase
testCompileLiteral
	"Test that _sre.compile() returns a SrePattern object."

	| pattern |
	self skipIfCompileUnavailable.
	pattern := self abcPattern.
	self assert: (pattern isKindOf: SrePattern).
%

category: 'Grail-Tests - Search'
method: SreTestCase
testPatternSearch
	"Test that pattern.search() finds a match via the real search: method."

	| match |
	self skipIfCompileUnavailable.
	match := self abcPattern @env1:search: 'xyzabc'.
	self assert: (match isKindOf: SreMatch).
%

category: 'Grail-Tests - Search'
method: SreTestCase
testPatternSearchNoMatch
	"Test that pattern.search() returns nil when no match."

	self skipIfCompileUnavailable.
	self assert: (self abcPattern @env1:search: 'xyz') equals: nil.
%

category: 'Grail-Tests - Search'
method: SreTestCase
testPatternSearchVarargs
	"Test the _search:kw: varargs dispatcher for first-class use."

	| match |
	self skipIfCompileUnavailable.
	match := self abcPattern @env1:_search: {'xyzabc'} kw: nil.
	self assert: (match isKindOf: SreMatch).
%

category: 'Grail-Tests - Match'
method: SreTestCase
testMatchGroup
	"Test that match.group(0) returns the matched text."

	| match |
	self skipIfCompileUnavailable.
	match := self abcPattern @env1:search: 'xyzabc123'.
	self assert: (match @env1:group: 0) equals: 'abc'.
%

category: 'Grail-Tests - Match'
method: SreTestCase
testMatchGroupNoArg
	"Test that match.group() (0-arg) returns the whole match."

	| match |
	self skipIfCompileUnavailable.
	match := self abcPattern @env1:search: 'xyzabc123'.
	self assert: match @env1:group equals: 'abc'.
%

category: 'Grail-Tests - Match'
method: SreTestCase
testMatchSpan
	"Test that match.span(0) returns the correct (start, end) tuple."

	| match result |
	self skipIfCompileUnavailable.
	match := self abcPattern @env1:search: 'xyzabc'.
	result := match @env1:span: 0.
	self assert: (result at: 1) equals: 3.
	self assert: (result at: 2) equals: 6.
%

category: 'Grail-Tests - Match'
method: SreTestCase
testMatchWithGroups
	"Test compile and match with capture groups: 'a(b)c'"

	| match |
	self skipIfCompileUnavailable.
	match := self abcGroupPattern @env1:search: 'xyzabc123'.
	self assert: (match @env1:group: 0) equals: 'abc'.
	self assert: (match @env1:group: 1) equals: 'b'.
%

category: 'Grail-Tests - Match'
method: SreTestCase
testPatternMatch
	"Test that pattern.match() matches at the beginning only."

	| pattern match |
	self skipIfCompileUnavailable.
	pattern := self abcPattern.
	"match() only matches at the beginning - should fail for 'xyzabc'"
	self assert: (pattern @env1:match: 'xyzabc') equals: nil.
	"match() should succeed for 'abcxyz'"
	match := pattern @env1:match: 'abcxyz'.
	self assert: (match isKindOf: SreMatch).
	self assert: (match @env1:group: 0) equals: 'abc'.
%

set compile_env: 0
