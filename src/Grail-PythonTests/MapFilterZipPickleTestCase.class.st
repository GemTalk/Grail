Class {
	#name : 'MapFilterZipPickleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - map/filter/zip pickling' }
MapFilterZipPickleTestCase >> testEveryPickleCheckAgreesWithCPython [
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

]

{ #category : 'Grail-Tests - map/filter/zip pickling' }
MapFilterZipPickleTestCase >> testTheClassItselfIsNeverWhatGetsPickled [
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

]
