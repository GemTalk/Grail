! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BufferExportOnJoinTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BufferExportOnJoinTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BufferExportOnJoinTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BufferExportOnJoinTestCase
!
! ``bytearray.join'' refuses a separator that the ITERABLE mutates.
!
! CPython's buffer protocol is what makes that work: join holds a buffer view
! of the separator while it consumes the iterable, and resizing an object with
! a live export raises BufferError.  Grail has no buffer protocol, so it simply
! used whatever the separator had become AFTER the iterable ran:
!
!     array = bytearray(b',')
!     def it():
!         array.clear()
!         yield b'A'; yield b'B'
!     array.join(it())      -- bytearray(b'AB'), the separator gone
!
! A wrong answer rather than an error, and a silent one: the separator vanishes
! and the join looks like it worked.
!
! The export is held only across the MATERIALISATION of the iterable, which is
! the one window in which the iterable's own code runs; everything after that
! reads a list already built.  It is a COUNT rather than a flag, because joins
! nest -- an inner join would otherwise clear the outer one's export -- and it
! lives in SessionTemps keyed by identity, because a bytearray is a byte object
! and cannot carry a dynamic instVar.
!
! TWO FUNNELS, and finding the second is the point.  ``size:'' is not the only
! way a bytearray grows: append() goes through ``add:'' and extend() through
! append(), so guarding size: alone refused clear() and pop() while letting
! extend() and append() through.  That is one rule with two implementations and
! only one of them applied -- the shape of bug this guard exists to prevent --
! and it is why the fixture probes all four rather than only the operation
! test_builtin happens to use.
!
! An IN-PLACE byte write is still allowed, which is what the buffer protocol
! says: the export is a view of storage that has not moved.  That row is what
! says the guard is on the SIZE rather than on mutation in general.
!
! Drives tests/python/buffer_export_on_join.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_bytearray_join_with_misbehaving_iterator, and its
! neighbour test_bytearray_join_with_custom_iterator, which is the control.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BufferExportOnJoinTestCase removeAllMethods.
BufferExportOnJoinTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BufferExportOnJoinTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'buffer_export_on_join' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/buffer_export_on_join.py')
		name: 'buffer_export_on_join'.
%

category: 'Grail-Private'
method: BufferExportOnJoinTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - Resizing during a join'
method: BufferExportOnJoinTestCase
testEveryResizeOfTheSeparatorIsRefused
	"All four, because the rule is about RESIZING and not about clear().
	Guarding only the funnel clear() uses left extend() and append() through,
	which is how the second funnel was found -- the fixture probes them for
	that reason rather than because test_builtin asks."

	self assertMatchesCPythonAt: 'clearing_separator'.
	self assertMatchesCPythonAt: 'extending_separator'.
	self assertMatchesCPythonAt: 'appending_separator'.
	self assertMatchesCPythonAt: 'popping_separator'.
%

category: 'Grail-Tests - Resizing during a join'
method: BufferExportOnJoinTestCase
testAnInPlaceByteWriteIsAllowed
	"The buffer protocol permits it -- the export is a view of storage that
	has not moved -- so this row is what says the guard is on the SIZE and not
	on mutation in general.  Without it, refusing every write would pass every
	test above."

	self assertMatchesCPythonAt: 'overwriting_separator'.
%

category: 'Grail-Tests - Controls'
method: BufferExportOnJoinTestCase
testOrdinaryJoinsAreUnaffected
	"Including bytes.join, which shares the implementation, and the nested
	case: an inner join must release its own export without releasing the
	outer one's, which a flag rather than a count would get wrong."

	self assertMatchesCPythonAt: 'wellbehaved_generator'.
	self assertMatchesCPythonAt: 'list_join'.
	self assertMatchesCPythonAt: 'tuple_join'.
	self assertMatchesCPythonAt: 'empty_join'.
	self assertMatchesCPythonAt: 'bytes_join'.
	self assertMatchesCPythonAt: 'nested_join'.
%

category: 'Grail-Tests - Controls'
method: BufferExportOnJoinTestCase
testOrdinaryResizesAreUnaffected
	"Outside a join there is no export, so every resizing operation behaves
	exactly as before -- the guard must not become a tax on bytearray."

	self assertMatchesCPythonAt: 'resizes_outside_a_join'.
%

category: 'Grail-Tests - Controls'
method: BufferExportOnJoinTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '12 checks, 0 disagreeing [], keys match: True'
%
