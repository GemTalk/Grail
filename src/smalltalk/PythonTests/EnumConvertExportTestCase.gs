! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumConvertExportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumConvertExportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumConvertExportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumConvertExportTestCase
!
! ``EnumType._convert_'' EXPORTS AS WELL AS BUILDS.
!
! _convert_ turns a module's C-style integer constants into a real enum.  Its
! purpose is not to return a class -- it is to REPLACE the constants in the
! module.  CPython finishes with:
!
!     if as_global:  global_enum(cls)          # also updates the globals
!     else:          sys.modules[cls.__module__].__dict__.update(cls.__members__)
!     module_globals[name] = cls
!
! so afterwards the module's plain ints ARE the enum's members and the class is
! bound under ``name''.  Grail built the enum and dropped it on the floor.  The
! method's own comment said so -- "Grail scope: builds + returns the enum" --
! so this was a known partial implementation rather than an accident; what was
! not recorded is that the missing half is the entire point of the function.
!
! IT RAISED NOTHING.  _convert_ returned a perfectly good enum, so a caller
! that only looks at the return value sees success.  The damage shows up later
! and somewhere else, as a NameError on the enum's name or as arithmetic on
! what should have been a member.  That is how CPython's socket.py fails on
! Grail: four _convert_ calls build AddressFamily/SocketKind, and the next
! reference to either is undefined.
!
! THE SECOND BUG IS ARITY, and it is the louder of the two.  ``filter'' is
! CPython's THIRD POSITIONAL parameter -- _convert_(name, module, filter, ...)
! -- and every real caller passes it positionally, socket.py's four calls
! included.  Grail read it from kwargs only, so filterFn came out nil, and nil
! means "no filter", which means EVERY GLOBAL IN THE MODULE becomes a member.
! Had the export half been present without the arity fix, socket.py's
! AddressFamily would have contained every name in socket.py.  A missing answer
! is easier to notice than a wrong one, which is the only reason this bug was
! not visible first.
!
! WHY THE MODULE AND THE SOURCE ARE TRACKED SEPARATELY: members are READ from
! ``source'' when one is given, but are always WRITTEN BACK to the module's own
! globals -- CPython fixes module_globals to sys.modules[module].__dict__
! before it consults source at all.  Collapsing the two would write members
! into whatever object was passed as source.
!
! The export is guarded on the module resolving: a caller may pass an explicit
! ``source'' with a module name that is not in sys.modules, and building the
! enum is still worth doing there.  Nothing to export to is not an error.
!
! NOT COVERED HERE: the CPython ``as_global'' repr rewrite (members repr as
! ``module.NAME'') and the dir()-equality assertions of test_convert_int /
! _str, which need the blocked enum __dir__ / _new_member_ identity.  Those
! remain follow-ons; ___grailMarkGlobalEnum: is unchanged by this work.
!
! Fixture: tests/python/enum_convert_export.py (self-verifying under CPython
! 3.14.6 -- all 10 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: EnumConvertExportTestCase
setUp
	probe := self ___loadProbe___: 'enum_convert_export'.
%

category: 'Grail-Private'
method: EnumConvertExportTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: EnumConvertExportTestCase
reprAt: aKey
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testTheEnumClassIsBoundInTheModule
	"module_globals[name] = cls.  Without it the name _convert_ was asked to
	create simply does not exist, and the first reference to it is a
	NameError -- with nothing pointing back at _convert_ as the cause."

	self assert: (self reprAt: 'class_is_bound_in_the_module')
		equals: '[True, True, True]'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testTheModulesConstantsBecomeMembers
	"THE POINT OF _convert_.  After the call the module's plain ints ARE the
	enum's members; that is what ``replaces a collection of global constants''
	means in CPython's own docstring."

	self assert: (self reprAt: 'constants_became_members')
		equals: '[''<Colour.CV_RED: 1>'', ''<Colour.CV_BLUE: 2>'', ''<Colour.CV_GREEN: 3>'']'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testConvertedMembersStillBehaveAsInts
	"IntEnum members ARE ints, so replacing the constants cannot break code
	that was doing arithmetic on them -- which is the only reason it is safe
	to rewrite a module's globals underneath it."

	self assert: (self reprAt: 'members_still_compare_as_ints')
		equals: '[True, True, True]'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testFilterIsAcceptedPositionally
	"socket.py's calling convention, and every other real caller's.  Reading
	filter from kwargs alone left it nil, and a nil filter admits EVERYTHING:
	the enum would have contained the whole module namespace rather than the
	three names asked for."

	self assert: (self reprAt: 'filter_is_positional')
		equals: '[''CV_BLUE'', ''CV_GREEN'', ''CV_RED'']'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testGlobalsThatFailTheFilterAreLeftAlone
	"The other half of the arity bug, stated positively: a module global that
	does not match must still be a plain int afterwards.  This is the check
	that fails loudly if the filter is ever ignored again."

	self assert: (self reprAt: 'unmatched_globals_stay_out') equals: '[''99'', True]'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testFilterIsStillAcceptedAsAKeyword
	"The keyword spelling was the one Grail already supported; accepting the
	positional form must not drop it."

	self assert: (self reprAt: 'keyword_filter_still_works') equals: '[''KW_A'', ''KW_B'']'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testTheBuiltEnumHasTheReceiversType
	"_convert_ is called on IntEnum, IntFlag, StrEnum, ...  The built class
	must be of the RECEIVER's type -- socket.py uses IntEnum for
	AddressFamily/SocketKind and IntFlag for MsgFlag/AddressInfo."

	self assert: (self reprAt: 'flag_type_is_honoured')
		equals: '[True, [''FL_ONE'', ''FL_TWO''], ''<Flags.FL_ONE: 1>'']'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testMembersMapIsComplete
	self assert: (self reprAt: 'members_map_is_complete')
		equals: '[''CV_BLUE'', ''CV_GREEN'', ''CV_RED'']'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testTheReturnedClassIsTheOneBoundInTheModule
	"Grail already returned a good enum; the bug was that the module never
	heard about it.  These must be the same object, not two builds."

	self assert: (self reprAt: 'return_value_is_the_class') equals: 'True'.
%

category: 'Grail-Tests'
method: EnumConvertExportTestCase
testLookupByValueAndByName
	self assert: (self reprAt: 'lookup_by_value_and_name') equals: '[''CV_RED'', 2]'.
%

set compile_env: 0
