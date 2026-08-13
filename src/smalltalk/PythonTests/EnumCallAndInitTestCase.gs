! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumCallAndInitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumCallAndInitTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumCallAndInitTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumCallAndInitTestCase
!
! Two EnumType rules: what a CALL on an enum class means, and when a user
! __init__ runs.
!
! (1) An enum that already HAS members is final, so calling it is ALWAYS a value
!     lookup -- ``Color('Foo', ('pink', 'black'))'' raises ValueError.  Grail
!     asked instead whether the arguments LOOKED like the functional API: first
!     by refusing any string first argument, then (once a multi-value member
!     lookup needed one) by asking whether the second could be a names spec.
!     Both readings let the member-bearing case through to ___grailFunctional:,
!     which built ``<enum 'Foo'>'' (test_extending).  Membership is the whole
!     test now, as in CPython; a MEMBER-LESS class still routes to the functional
!     API, including the subclass form.
!
!     The message goes with it: CPython builds it with %r, and printString
!     diverges from repr for anything but ints and strings -- the tuple read
!     ``atuple( 'Foo', atuple( 'pink', 'black'))'', which is what test_extending
!     matches on.
!
! (2) A user __init__ INHERITED from an enum base never ran.  The exclusion was
!     "the provider is an enum class", which is true of a user subclass of Enum
!     too, so a base written to initialise its subclasses' members did nothing.
!     ___grailIsGrailDefinedType: is the symbol-list test that separates Grail's
!     own classes from ones written in Python, and is what the exclusion wanted.
!
!     It also has to run BEFORE the member joins byValue / members / byName:
!     CPython calls it from _proto_member.__set_name__, before adding to
!     _member_map_, so an __init__ that inspects its own class must not see
!     itself.  Running it afterwards made the very first member of every
!     UniqueEnum subclass raise.
!
! KNOWN GAP, recorded rather than endorsed: CPython builds a THROWAWAY member for
! an ALIAS and initialises that, so a UniqueEnum base rejects ``grene = 2''.
! Grail reuses the canonical member and does not initialise it
! (test_no_duplicates, still failing).
!
! Drives tests/python/enum_call_and_init.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumCallAndInitTestCase removeAllMethods.
EnumCallAndInitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumCallAndInitTestCase
setUp
	"Reload tests/python/enum_call_and_init.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_call_and_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_call_and_init.py')
		name: 'enum_call_and_init'.
%

category: 'Grail-Private'
method: EnumCallAndInitTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - A member-bearing class is final'
method: EnumCallAndInitTestCase
testTwoArgumentCallIsALookupNotTheFunctionalApi
	"Both shapes: a tuple second argument, and one that reads exactly like a
	names STRING -- neither may define a new enum on a class that has members."

	self assert: (self resultAt: 'final') asString
		equals: '(''Foo'', (''pink'', ''black'')) is not a valid Color'.
	self assert: (self resultAt: 'final_names_string') asString
		equals: '(''Foo'', ''pink black'') is not a valid Color'.
%

category: 'Grail-Tests - A member-bearing class is final'
method: EnumCallAndInitTestCase
testTheMessageUsesPythonRepr
	"CPython builds it with %r.  The single-value case is the one that already
	agreed, pinned so the shared helper cannot drift."

	self assert: (self resultAt: 'single') asString
		equals: '''nope'' is not a valid Color'.
%

category: 'Grail-Tests - The functional API still routes'
method: EnumCallAndInitTestCase
testMemberlessClassesStillBuild
	"A names string, a mapping, and the subclass form on a member-LESS class."

	self assert: (self resultAt: 'functional') asString equals: 'a,b,c'.
	self assert: (self resultAt: 'functional_dict') asString equals: 'p=1,q=2'.
	self assert: (self resultAt: 'functional_subclass') asString equals: 'x,y'.
%

category: 'Grail-Tests - The functional API still routes'
method: EnumCallAndInitTestCase
testMultiValueLookupUnchanged
	"Cardinal(1, 0) -- the reason the string test was narrowed rather than
	dropped in the first place."

	self assert: (self resultAt: 'multi_value').
%

category: 'Grail-Tests - Inherited __init__'
method: EnumCallAndInitTestCase
testInitFromAnEnumBaseRunsAndSeesOnlyEarlierMembers
	"``red:'' -- the first member sees an EMPTY class, not itself.  That
	ordering is the whole reason the classic alias-rejecting base works."

	self assert: (self resultAt: 'init_order') asString
		equals: 'red:;green:red;blue:red,green'.
	self assert: (self resultAt: 'unique_ok') asString equals: 'red,green'.
%

category: 'Grail-Tests - Inherited __init__'
method: EnumCallAndInitTestCase
testRaisingInitAbortsTheClassDefinition
	self assert: (self resultAt: 'raising_init') asString
		equals: 'TypeError: no members here'.
%

category: 'Grail-Tests - Inherited __init__'
method: EnumCallAndInitTestCase
testInitOnTheClassItselfUnchanged
	"The classic Planet(mass, radius): a class-body __init__ already ran, and
	must keep running with the value tuple spread as positional arguments."

	self assert: (self resultAt: 'own_init') asString equals: '4.869e+24/6.0518e+06'.
%

category: 'Grail-Tests - Alias construction'
method: EnumCallAndInitTestCase
testAnAliasIsInitialisedToo
	"CPython builds a THROWAWAY member for an alias and initialises that,
	deciding alias-ness only afterwards -- which is how a UniqueEnum base
	rejects ``grene = 2'' (test_no_duplicates).  Grail reused the canonical
	member and built nothing, so the alias was accepted silently; this was
	recorded here as a known gap until ___grailBuildMembers: moved the alias
	test to CPython's place, after the build."

	self assert: (self resultAt: 'alias_init') asString equals: 'ValueError'.
%
