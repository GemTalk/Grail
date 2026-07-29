! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StrSubclassConstructionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrSubclassConstructionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
StrSubclassConstructionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrSubclassConstructionTestCase — base order and constructor arity for str
! subclasses.  Two independent defects, both SILENT (wrong content, no
! exception), found while testing the Unicode32 widening change:
!
!   1. ``class X(Mixin, str)'' built an EMPTY string at every width, ASCII
!      included.  ClassDefAst >> firstBaseIsStr gated the population step on
!      ``bases first'' alone, while the Smalltalk superclass comes from
!      importlib >> ___selectStorageBase___:, which answers the leftmost base
!      WITH STORAGE -- so the class really was str-backed, just never filled in.
!      str was the only builtin base affected: bytes/tuple/list/dict populate on
!      other paths (verified directly).
!
!   2. ``S(b'x', 'ascii')'' answered the four characters ``b'x'''' rather than
!      ``x''.  Two causes stacked: the emitted construction forwarded only the
!      FIRST positional, dropping the encoding so the bytes OBJECT was
!      stringified; and CharacterCollection class >> __new__:_: returned
!      ``obj decode: encoding'' -- a plain string -- so even once the encoding
!      arrived the subclass was lost.  That second half is why
!      ``Markup(b'x', 'ascii')'' decoded correctly but came back a bare ``str''.
!
! Neither is about width, which is why they live here rather than in
! StrSubclassWideTestCase.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrSubclassConstructionTestCase removeAllMethods.
StrSubclassConstructionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
loadFixture
	"Load tests/python/str_subclass_construction.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'str_subclass_construction' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/str_subclass_construction.py')
		name: 'str_subclass_construction'
%

! --- 1. base order ----------------------------------------------------------

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testMixinFirstIsPopulated
	"``class X(Mixin, str)'' used to answer '' for ANY argument."

	| r |
	r := self loadFixture @env1:mixin_first_ascii.
	self assert: (r @env0:at: 1) @env0:asString equals: 'MixinFirst'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'abc'.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testMixinFirstPopulatedAtEveryWidth

	| r |
	r := self loadFixture @env1:mixin_first_wide.
	self assert: (r @env0:at: 1) @env0:asString equals: 'MixinFirst'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'café'.
	self assert: (r @env0:at: 3) @env0:asString equals: 'MixinFirst'.
	self assert: (r @env0:at: 4) equals: 1.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testMixinFirstKeepsMixinMethod
	"Routing construction through the str path must not cost the mixin's
	own methods — ___mergeSecondaryBases___ still has to apply."

	self assert: self loadFixture @env1:mixin_first_method_still_reachable
		equals: 'mixin'
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testMixinFirstIsAStr

	self assert: self loadFixture @env1:mixin_first_is_a_str equals: true
%

! --- 2. constructor arity ---------------------------------------------------

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testEncodingTwoArgDecodes
	"``S(b'x', 'ascii')'' answered ``b'x'''' -- the stringified bytes
	object -- because the encoding never reached __new__."

	| r |
	r := self loadFixture @env1:encoding_two_arg.
	self assert: (r @env0:at: 1) @env0:asString equals: 'Plain'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'x'.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testEncodingThreeArgDecodes
	"The (object, encoding, errors) arity forwards too."

	| r |
	r := self loadFixture @env1:encoding_three_arg.
	self assert: (r @env0:at: 1) @env0:asString equals: 'Plain'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'x'.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testEncodingDecodesMultibyteAndKeepsSubclass
	"A utf-8 multibyte sequence decodes to wide content and STAYS the
	subclass — the decode path and the Unicode32 backing composing."

	| r |
	r := self loadFixture @env1:encoding_decodes_multibyte.
	self assert: (r @env0:at: 1) @env0:asString equals: 'Plain'.
	self assert: (r @env0:at: 2) equals: true.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testEncodingOnMixinFirstSubclass
	"Both fixes at once: str is not the first base AND an encoding is
	supplied."

	| r |
	r := self loadFixture @env1:encoding_on_mixin_first.
	self assert: (r @env0:at: 1) @env0:asString equals: 'MixinFirst'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'x'.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testZeroAndOneArgUnchanged
	"Guard: rewriting the construction emit to dispatch on positional
	count must leave the arities that already worked alone."

	| r |
	r := self loadFixture @env1:no_arg_and_one_arg_unchanged.
	self assert: (r @env0:at: 1) @env0:asString equals: 'Plain'.
	self assert: (r @env0:at: 2) @env0:asString equals: ''.
	self assert: (r @env0:at: 3) @env0:asString equals: 'Plain'.
	self assert: (r @env0:at: 4) @env0:asString equals: 'abc'.
%

! --- guards on plain str() --------------------------------------------------

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testPlainStrTwoArgUnchanged
	"``str(b'x', 'ascii')'' must still answer a PLAIN str.  The self-typing
	re-wrap in __new__:_: routes through the 1-arg allocator, which for the
	canonical str class is the same string one copy later."

	| r |
	r := self loadFixture @env1:plain_str_two_arg_unchanged.
	self assert: (r @env0:at: 1) @env0:asString equals: 'str'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'x'.
%

category: 'Grail-Tests-StrSubclassConstruction'
method: StrSubclassConstructionTestCase
testPlainStrStillRejectsDecodingAStr
	"CPython raises TypeError for str(str, encoding); the re-wrap must not
	have opened a path around that check."

	self assert: self loadFixture @env1:plain_str_rejects_decoding_str
		equals: 'TypeError'
%
