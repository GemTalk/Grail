! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReModuleTestCase'
  instVarNames: #( re )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReModuleTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ReModuleTestCase removeAllMethods.
ReModuleTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! ReModuleTestCase
!
! Covers the upstream Python-level `re` module end-to-end through the
! Grail-ported `_constants`, `_casefix`, `_parser`, `_compiler` stack
! and the C-backed `_sre` engine.  Restoring `re/__init__.py` to
! upstream form (it used to be a 17-line stub) was the goal of the
! `re-init-restore` branch.
!
! Scope of *this* test: literal patterns with capture groups.  Regex
! character classes (`\d`, `[...]`), quantifiers (`+`, `*`), and the
! high-level helpers (`findall`, `sub`, `split`) hit a separate set
! of gaps in the `bytes`/`bytearray` protocol that need their own
! branch — see TODO.md for the list.
! ===============================================================================

category: 'Grail-Setup'
method: ReModuleTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	#( 're' 're._constants' 're._casefix' 're._parser' 're._compiler' ) do: [:n |
		mods @env0:removeKey: n @env0:asSymbol ifAbsent: []].
	re := importlib
		loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/re/__init__.py')
		name: 're'.
%

category: 'Grail-Tests - Module loading'
method: ReModuleTestCase
testModuleLoads
	"The upstream re/__init__.py — 428 lines of class definitions,
	module-level state, and a sentinel-based public API — loads
	end-to-end and binds the public names."

	self assert: re notNil.
	self assert: (re @env1:__name__) equals: 're'.
	self assert: (re @env1:compile) notNil.
	self assert: (re @env1:match) notNil.
	self assert: (re @env1:Pattern) notNil.
	self assert: (re @env1:Match) notNil.
%

category: 'Grail-Tests - Compile'
method: ReModuleTestCase
testCompileReturnsPattern
	"re.compile('abc') round-trips through _parser → _compiler →
	_sre.compile and returns a Pattern (== SrePattern wrapping a C
	PatternObject*)."

	| pat |
	pat := re @env1:compile: 'abc'.
	self assert: pat notNil.
	self assert: pat class name equals: #'SrePattern'.
%

category: 'Grail-Tests - Match'
method: ReModuleTestCase
testMatchLiteral
	"Match a literal pattern at the start of a string and read
	group(0).  Exercises the Smalltalk → C boundary for both
	compile (Smalltalk → C PatternObject) and match (C MatchObject*
	→ Smalltalk str)."

	| m |
	m := (re @env1:compile: 'hello') @env1:match: 'hello world'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: 'hello'.
%

category: 'Grail-Tests - Match'
method: ReModuleTestCase
testMatchNoMatchReturnsNone
	"A non-matching pattern at the start returns None
	(== Smalltalk nil at the C boundary, mapped through SrePattern
	match's null-pointer check)."

	| m |
	m := (re @env1:compile: 'foo') @env1:match: 'hello world'.
	self assert: m isNil.
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testSingleCaptureGroup
	"A pattern with a single capture group works end-to-end.
	The dispatch fixes that this branch introduced (PythonInstance
	DNU routing `_name:kw:`, SubscriptAst's slice-object codegen,
	NamedIntConstant.__eq__'s env-0 value access) are all on the
	hot path here — without them `state.opengroup` silently
	dropped every group open."

	| m |
	m := (re @env1:compile: 'h(.)llo') @env1:match: 'hello'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: 'hello'.
	self assert: (m @env1:group: 1) equals: 'e'.
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testMultipleCaptureGroups
	"Multiple sequential capture groups, group(N) for each."

	| m |
	m := (re @env1:compile: '(h)(e)(l)(l)(o)') @env1:match: 'hello'.
	self assert: m notNil.
	self assert: (m @env1:group: 1) equals: 'h'.
	self assert: (m @env1:group: 2) equals: 'e'.
	self assert: (m @env1:group: 3) equals: 'l'.
	self assert: (m @env1:group: 4) equals: 'l'.
	self assert: (m @env1:group: 5) equals: 'o'.
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testGroupSpan
	"match.span(N) returns (start, end) for each group."

	| m s0 s1 |
	m := (re @env1:compile: 'h(.)llo') @env1:match: 'hello'.
	s0 := m @env1:span: 0.
	s1 := m @env1:span: 1.
	self assert: (s0 @env0:at: 1) equals: 0.
	self assert: (s0 @env0:at: 2) equals: 5.
	self assert: (s1 @env0:at: 1) equals: 1.
	self assert: (s1 @env0:at: 2) equals: 2.
%
