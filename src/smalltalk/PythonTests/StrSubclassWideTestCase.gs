! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StrSubclassWideTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrSubclassWideTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
StrSubclassWideTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrSubclassWideTestCase — a str subclass keeps its identity at every width.
!
! GemStone widens a Unicode string IN PLACE when handed a character outside the
! receiver's range, migrating it to the CANONICAL wider class -- never to a wide
! counterpart of the receiver's own class, because none exists.  Measured:
!
!     subclass of Unicode7   ascii ok | latin-1 -> Unicode16 | astral -> Unicode32
!     subclass of Unicode16  ascii ok | latin-1 ok           | astral -> Unicode32
!     subclass of Unicode32  ascii ok | latin-1 ok           | astral ok
!
! Python str subclasses used to subclass Unicode7 (what the name ``str''
! resolves to), so an instance lost its Python class the moment it held
! non-ASCII: same oop, class silently rewritten.  ``Markup('abc')'' was a
! Markup and ``Markup('café')'' was a plain str -- a silent, data-dependent
! failure.  They now subclass Unicode32, which spans the whole code-point range
! and so can never be forced to migrate.
!
! Both sites that choose the superclass are covered: ClassDefAst >>
! printSuperclassOn: (single base) and importlib >> ___selectStorageBase___:
! (multi-base), via S and MultiBase respectively.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrSubclassWideTestCase removeAllMethods.
StrSubclassWideTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
loadFixture
	"Load tests/python/str_subclass_wide.py once per suite run.  The
	fixture is a read-only set of function evaluators, so one import
	serves every test."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'str_subclass_wide' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_subclass_wide.py')
		name: 'str_subclass_wide'
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testSubclassSurvivesEveryWidth
	"THE regression: ascii kept the subclass already; latin-1 and astral
	silently downgraded to a plain str."

	| k |
	k := self loadFixture @env1:kinds.
	self assert: (k @env0:at: 1) @env0:asString equals: 'S'.
	self assert: (k @env0:at: 2) @env0:asString equals: 'S'.
	self assert: (k @env0:at: 3) @env0:asString equals: 'S'.
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testIsinstanceOfSubclassAtEveryWidth

	| r |
	r := self loadFixture @env1:isinstances.
	1 to: 3 do: [:i | self assert: (r @env0:at: i) equals: true].
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testWideSubclassIsStillAStr
	"Widening the storage class must not push the instance out of
	``str''.  ___isInstanceSingle___:of: answers the str check against
	CharacterCollection, which Unicode32 is under."

	| r |
	r := self loadFixture @env1:still_a_str.
	self assert: (r @env0:at: 1) equals: true.
	self assert: (r @env0:at: 2) equals: true.
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testContentSurvivesIntact
	"Type preservation is worthless if the characters are mangled."

	| r |
	r := self loadFixture @env1:contents.
	1 to: 3 do: [:i | self assert: (r @env0:at: i) equals: true].
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testEqualityAcrossWidths
	"A Unicode32-backed subclass instance must still compare equal to the
	narrow plain str with the same characters."

	| r |
	r := self loadFixture @env1:equality_across_widths.
	self assert: (r @env0:at: 1) equals: true.
	self assert: (r @env0:at: 2) equals: true.
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testHashAcrossWidths
	"...and hashes with it, so a dict keyed by a plain str is still found
	by the subclass instance.  This is the one that would bite hardest in
	real code if the representations diverged."

	| r |
	r := self loadFixture @env1:hash_across_widths.
	self assert: (r @env0:at: 1) equals: true.
	self assert: (r @env0:at: 2) equals: true.
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testAstralLengthIsCodePoints
	"Unicode32 storage counts code points, so an astral character is
	length 1 rather than a surrogate pair."

	self assert: self loadFixture @env1:astral_length equals: true
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testSubclassWithOwnNewSurvivesEveryWidth
	"A subclass defining __new__ takes the runtime-allocator path rather
	than the self-typed class-side one, so it needs its own coverage."

	| k |
	k := self loadFixture @env1:with_new_keeps_type.
	1 to: 3 do: [:i |
		self assert: (k @env0:at: i) @env0:asString equals: 'WithNew'].
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testMultiBaseStrSubclassSurvives
	"``class MultiBase(str, Mixin)'' picks its Smalltalk superclass
	through importlib >> ___selectStorageBase___:, the second site that
	has to widen a chosen str base.  Type, mixin method and content must
	all survive, at latin-1 and astral width.

	NOTE the base order.  The mixin-FIRST spelling ``(Mixin, str)''
	builds an EMPTY string at every width, ASCII included, because the
	content-populating branch is gated on ClassDefAst >> firstBaseIsStr,
	which inspects only ``bases first''.  That is a pre-existing gap
	orthogonal to widening and is deliberately not asserted here."

	| r |
	r := self loadFixture @env1:multibase_keeps_type.
	self assert: (r @env0:at: 1) @env0:asString equals: 'MultiBase'.
	self assert: (r @env0:at: 2) @env0:asString equals: 'mixin'.
	self assert: (r @env0:at: 3) equals: true.
	self assert: (r @env0:at: 4) @env0:asString equals: 'MultiBase'.
%

category: 'Grail-Tests-StrSubclassWide'
method: StrSubclassWideTestCase
testPlainStringsStayNarrow
	"Guard on the SCOPE of the change: only subclass construction
	widened.  Repointing the ``str'' binding itself would also have made
	these tests pass, at the cost of 4 bytes per character for every
	string in the image -- so pin that plain literals keep GemStone's
	compact narrow representation."

	| ascii wide |
	ascii := self eval: 'ascii_probe = "abc"'.
	self deny: (self eval: '"abc"') @env0:class == Unicode32
		description: 'plain ASCII literals must not be Unicode32'.
	wide := self eval: '"caf' , (Character codePoint: 233) asString , '"'.
	self deny: wide @env0:class == Unicode32
		description: 'plain latin-1 literals must not be Unicode32'.
%
