! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MapFilterZipPickleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MapFilterZipPickleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MapFilterZipPickleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MapFilterZipPickleTestCase - map/filter/zip objects survive pickling
! ===============================================================================
! CPython gives each of the three a __reduce__ naming the TYPE and the live
! source iterators -- ``(map, (func, *iterators))'' -- so the object pickles as
! "call this again with these sources".  Because the sources are iterators
! ALREADY POSITIONED, a half-consumed object resumes where it left off, which is
! what test_builtin's check_iter_pickle exercises: it pickles, compares, drops
! one item, pickles again and compares the remainder.
!
! Grail answered NotImplemented from the inherited __reduce__, so pickle fell
! back to saving the class by reference and died with
!
!     PicklingError: Can't pickle <class 'map_iterator'>: module '__main__' not
!     found
!
! -- which is an accurate complaint.  In CPython map IS the type and
! builtins.map resolves to it; in Grail map() is a BoundMethod on the builtins
! module and the object it answers is a map_iterator, a class reachable under no
! module at all.  So iterator>>___builtinNamed___: names the CALLABLE instead,
! which is the same object CPython ends up calling and which pickle already
! saved happily as builtins.map.
!
! THE AWKWARD HALF IS ``strict=''.  It is keyword-only, so it cannot ride in the
! positional argument tuple that __reduce__ passes; CPython gives it a third
! __reduce__ element and a __setstate__, and this does the same.  It has to
! survive, because a strict object that quietly loses the flag does not fail --
! it answers a SHORT LIST where it should raise ValueError, which is a wrong
! answer rather than an error.  Both directions are asserted: strict survives,
! and a non-strict object does not acquire the flag.
!
! Closes 7 of test.test_builtin's errors (test_map_pickle, _strict,
! _strict_fail, test_filter_pickle, test_zip_pickle, _strict, _strict_fail),
! taking the module from 51 fail+err to 44.
!
! tests/python/map_filter_zip_pickle.py holds the 19 checks below and is run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MapFilterZipPickleTestCase removeAllMethods.
MapFilterZipPickleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - map/filter/zip pickling'
method: MapFilterZipPickleTestCase
testEveryPickleCheckAgreesWithCPython
	"Every check in tests/python/map_filter_zip_pickle.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'map_filter_zip_pickle' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/map_filter_zip_pickle.py')
		name: 'map_filter_zip_pickle'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('every_protocol_round_trips'
	  'filter_callable_predicate_survives'
	  'filter_keeps_its_type'
	  'filter_none_predicate_survives'
	  'filter_resumes_after_next'
	  'filter_round_trips'
	  'map_keeps_its_type'
	  'map_non_strict_stays_lenient'
	  'map_resumes_after_next'
	  'map_round_trips'
	  'map_strict_survives_pickle'
	  'map_two_iterables'
	  'zip_keeps_its_type'
	  'zip_non_strict_stays_lenient'
	  'zip_resumes_after_next'
	  'zip_round_trips'
	  'zip_strict_equal_lengths'
	  'zip_strict_survives_pickle'
	  'zip_three_iterables').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 19
%

category: 'Grail-Tests - map/filter/zip pickling'
method: MapFilterZipPickleTestCase
testTheClassItselfIsNeverWhatGetsPickled
	"The defect was pickle falling back to saving the CLASS by reference, so
	the guard is that the pickled bytes name the builtins CALLABLE and not the
	internal class name.  Asserted on the bytes rather than on the round trip
	because a future change could make map_iterator resolvable and pass the
	round-trip test while re-introducing a name that is not CPython's."

	self assert: (self eval:
'import pickle
d = pickle.dumps(map(str, [1, 2]))
r = "internal-class-named=%s builtins-map-named=%s" % (
    "map_iterator" in str(d), b"map" in d)
r
') equals: 'internal-class-named=False builtins-map-named=True'
%
