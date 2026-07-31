! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnhashableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnhashableTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnhashableTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnhashableTestCase -- classes CPython gives no hash to, and the hand-written
! Grail classes in the same family.
!
! CPython decides this when the class is CREATED (type_new clears tp_hash), in
! two cases it treats identically:
!
!   * EXPLICIT -- the body assigns ``__hash__ = None''.
!   * IMPLICIT -- the body supplies __eq__ and no __hash__.  Redefining equality
!     without redefining hash would leave an inherited hash that no longer
!     agrees with it, so CPython refuses to guess.
!
! Grail honoured neither: such a class kept object's IDENTITY hash, so two equal
! instances hashed differently and a dict happily held both.  Because it is a
! class-creation rule, ClassDefAst emits a raising __hash__ at compile time --
! zero runtime cost on the dict hot path, and every hash entry point already
! routes through __hash__, so one emitted method covers hash(), dict keys and
! set elements alike.
!
! The same contract violation existed on three hand-written classes, each with a
! DIFFERENT correct answer, which is why they are pinned individually here:
! functools.cmp_to_key's wrapper is unhashable, CacheInfo is a namedtuple hashed
! by value, and BaseException uses identity for BOTH (CPython defines no __eq__
! on exceptions -- Grail's value-based one was the deviation).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnhashableTestCase removeAllMethods.
UnhashableTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
loadFixture
	"Load tests/python/unhashable_by_class_body.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'unhashable_by_class_body' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/unhashable_by_class_body.py')
		name: 'unhashable_by_class_body'
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testExplicitHashNoneRaises
	"``__hash__ = None'' is how a class opts out, and how CPython's own
	list/dict/set do it."

	self assert: self loadFixture @env1:explicit_none_raises equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testImplicitEqWithoutHashRaises
	"Defining __eq__ and no __hash__ makes a class unhashable in CPython.
	Grail left it with object's identity hash, so two equal instances hashed
	differently."

	self assert: self loadFixture @env1:implicit_eq_without_hash_raises
		equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testUnhashableRejectedByDictAndSet
	"One emitted __hash__ covers every entry point, because hash(), dict keys
	and set elements all route through it."

	self assert: self loadFixture @env1:unhashable_rejected_by_dict_and_set
		equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testDefiningBothKeepsTheHash
	"An explicit __hash__ wins; the rule must not fire."

	self assert: self loadFixture @env1:defining_both_keeps_the_hash equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testHashAssignedASiblingMethodIsKept
	"``__hash__ = _h'' is a real hash function.  It does NOT appear in
	classBodyAttributes -- sibling-method aliases are compiled as delegating
	METHODS instead -- so the implicit rule wrongly fired and the emitted
	raising __hash__ overwrote the alias.  Found by this case failing."

	self assert: self loadFixture @env1:hash_assigned_a_sibling_method_is_kept
		equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testSubclassInheritsUnhashabilityAndNamesItself
	"The emitted body reads the class at RUNTIME (___raiseUnhashableType___),
	so a subclass that does not define its own __hash__ inherits the raise and
	reports ITSELF -- which is what CPython does."

	self assert: self loadFixture
		@env1:subclass_inherits_unhashability_and_names_itself
		equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testSubclassCanRestoreAHash
	self assert: self loadFixture @env1:subclass_can_restore_a_hash equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testAClassWithoutEqStaysHashable
	"The rule keys on __eq__, so an ordinary class is untouched."

	self assert: self loadFixture @env1:a_class_without_eq_stays_hashable
		equals: true
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testCmpToKeyWrapperIsUnhashable
	"CPython sets __hash__ = None on the cmp_to_key wrapper: its equality is
	whatever the user's cmp function says, which no hash could track.
	test_functools TestCmpToKeyC/Py.test_hash asserts the raise."

	| lf src |
	lf := String with: Character lf.
	src := 'import functools' , lf
		, 'k = functools.cmp_to_key(lambda x, y: y - x)(10)' , lf
		, 'try:' , lf
		, '    hash(k)' , lf
		, '    result = "no raise"' , lf
		, 'except TypeError:' , lf
		, '    result = "ok"' , lf
		, 'result' , lf.
	self assert: (self eval: src) equals: 'ok'
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testCacheInfoHashesByValue
	"CacheInfo is a namedtuple, so CPython hashes it as a TUPLE of its fields:
	equal CacheInfos hash equal and one works as a dict key.  Grail defined
	field-wise __eq__ with no __hash__, so it kept an identity hash."

	| lf src |
	lf := String with: Character lf.
	src := 'import functools' , lf
		, '@functools.lru_cache(maxsize=8)' , lf
		, 'def f(x):' , lf
		, '    return x' , lf
		, 'f(1)' , lf
		, 'a = f.cache_info()' , lf
		, 'b = f.cache_info()' , lf
		, '(a == b, hash(a) == hash(b), {a: "v"}[b])' , lf.
	self assert: (self eval: src) @env1:__repr__ equals: '(True, True, ''v'')'
%

category: 'Grail-Tests-Unhashable'
method: UnhashableTestCase
testExceptionsUseIdentityEqualityAndHash
	"CPython defines no __eq__ on BaseException, so ``ValueError('x') ==
	ValueError('x')'' is FALSE and exceptions hash by identity -- the two
	agree.  Grail's value-based __eq__ (same class + same args) with no
	matching __hash__ disagreed with CPython AND broke the contract."

	self assert: (self eval: 'ValueError("x") == ValueError("x")') equals: false.
	self assert: (self eval: 'e = ValueError("x"); e == e') equals: true.
	self assert: (self eval: 'e = ValueError("x"); {e: 1}[e]') equals: 1.
	self assert: (self eval: 'len({ValueError("x"), ValueError("x")})') equals: 2
%

