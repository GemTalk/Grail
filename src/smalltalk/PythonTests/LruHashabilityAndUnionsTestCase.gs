! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LruHashabilityAndUnionsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LruHashabilityAndUnionsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LruHashabilityAndUnionsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LruHashabilityAndUnionsTestCase
!
! Two functools gaps that share a shape: Grail accepted something Python does
! not, and the wrongness was silent.
!
!  * lru_cache hashes the key it builds, so an unhashable argument is a
!    TypeError in CPython.  Grail keys a Smalltalk dictionary by an Array of
!    the arguments, and a Smalltalk collection hashes perfectly well -- so the
!    call was cached under a key Python semantics say cannot exist.
!
!  * singledispatch's annotation form left a UNION annotation unregistered
!    (raising would have been worse -- it is valid CPython), so every call
!    quietly fell through to the default implementation.  CPython registers
!    the implementation once per member; so does Grail now.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LruHashabilityAndUnionsTestCase removeAllMethods.
LruHashabilityAndUnionsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: LruHashabilityAndUnionsTestCase
setUp
	"Reload tests/python/lru_hashability_and_unions.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'lru_hashability_and_unions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/lru_hashability_and_unions.py')
		name: 'lru_hashability_and_unions'.
%

! --- lru_cache argument hashability ---

category: 'Grail-Tests - LRU hashability'
method: LruHashabilityAndUnionsTestCase
testUnhashableArgumentRaisesTypeError
	"list, dict and set, at both an unbounded and a bounded maxsize -- the two
	bounds take different paths through the wrapper."

	self assert: testModule @env1:unhashable_argument_raises_type_error asArray
		equals: #( 'TypeError' 'TypeError' 'TypeError' 'TypeError' ).
%

category: 'Grail-Tests - LRU hashability'
method: LruHashabilityAndUnionsTestCase
testUnhashableKeywordArgumentRaisesTypeError
	"Keyword values join the key too, so they need the same check."

	self assert: testModule @env1:unhashable_keyword_argument_raises_type_error
		equals: 'TypeError'.
%

category: 'Grail-Tests - LRU hashability'
method: LruHashabilityAndUnionsTestCase
testUnhashableUserClassRaisesTypeError
	"A class made unhashable at creation time (defines __eq__, no __hash__)
	is rejected as well -- the check asks for the Python hash rather than
	testing a fixed list of builtin types."

	self assert: testModule @env1:unhashable_by_class_body_raises
		equals: 'TypeError'.
%

category: 'Grail-Tests - LRU hashability'
method: LruHashabilityAndUnionsTestCase
testHashableArgumentsStillCache
	"The check must not disturb the ordinary path: a repeated argument is
	still one miss, not two."

	self assert: testModule @env1:hashable_arguments_still_cache asArray
		equals: #( 6 6 8 2 ).
%

! --- singledispatch union registration ---

category: 'Grail-Tests - Union registration'
method: LruHashabilityAndUnionsTestCase
testTypingUnionRegisters

	self assert: testModule @env1:typing_union_dispatch asArray
		equals: #( 'default' 'union' 'union' ).
%

category: 'Grail-Tests - Union registration'
method: LruHashabilityAndUnionsTestCase
testPep604UnionRegisters
	"The ``int | float'' spelling."

	self assert: testModule @env1:pep604_union_dispatch asArray
		equals: #( 'default' 'union' 'union' ).
%

category: 'Grail-Tests - Union registration'
method: LruHashabilityAndUnionsTestCase
testOptionalUnionRegistersNoneType
	"``X | None'' is a union including type(None), so None dispatches to the
	registered implementation rather than the default."

	self assert: testModule @env1:optional_union_dispatch asArray
		equals: #( 'default' 'union' 'union' ).
%

category: 'Grail-Tests - Union registration'
method: LruHashabilityAndUnionsTestCase
testSubscriptedUnionMemberIsStillRejected
	"``list[int] | str'' is not a union of plain classes; CPython rejects it.
	Keeping this red is what stops the union support from degenerating into a
	bare ``contains a bracket'' test."

	self assert: testModule @env1:subscripted_union_member_is_still_rejected
		equals: 'TypeError'.
%
